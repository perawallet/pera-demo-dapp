import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'

import { accountInformationQueryKey } from '@modules/account/hooks/useAccountInformationQuery'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { getAllScenarios } from '@scenarios/registry'
import { createTestQueryClient } from '@test-utils/render'
import { resetStores } from '@test-utils/resetStores'

import {
    BALANCE_REFRESH_DELAY_MS,
    useScenarioRunner,
} from '../hooks/useScenarioRunner'

vi.mock(
    '@lib/wallet/walletInstance',
    async () => (await import('@test-utils/fakeWallet')).testWallet,
)
vi.mock('@lib/algod/algod', async importOriginal => ({
    ...(await importOriginal<typeof import('@lib/algod/algod')>()),
    clientForChain: vi.fn(() => ({})),
}))
vi.mock('../runScenario', async importOriginal => ({
    ...(await importOriginal<typeof import('../runScenario')>()),
    runScenario: vi.fn(async () => undefined),
}))

const renderRunner = () => {
    const queryClient = createTestQueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
    const rendered = renderHook(() => useScenarioRunner(), { wrapper })
    const balanceRefreshes = () =>
        invalidate.mock.calls.filter(
            ([filters]) => filters?.queryKey === accountInformationQueryKey,
        ).length

    return { ...rendered, balanceRefreshes }
}

const scenario = getAllScenarios()[0]

describe('useScenarioRunner balance refresh', () => {
    beforeEach(() => {
        resetStores()
        useSessionStore.getState().setAccounts(['ADDR'])
        vi.useFakeTimers()
    })
    afterEach(() => vi.useRealTimers())

    it('refreshes right after the run and again once the txn has had a round to confirm', async () => {
        const { result, balanceRefreshes } = renderRunner()

        await act(() => result.current.invoke(scenario))
        expect(balanceRefreshes()).toBe(1)

        await act(() =>
            vi.advanceTimersByTimeAsync(BALANCE_REFRESH_DELAY_MS - 1),
        )
        expect(balanceRefreshes()).toBe(1)

        await act(() => vi.advanceTimersByTimeAsync(1))
        expect(balanceRefreshes()).toBe(2)
    })

    it('leaves one pending refresh when runs follow each other quickly', async () => {
        const { result, balanceRefreshes } = renderRunner()

        await act(() => result.current.invoke(scenario))
        await act(() => result.current.invoke(scenario))
        await act(() => vi.advanceTimersByTimeAsync(BALANCE_REFRESH_DELAY_MS))

        expect(balanceRefreshes()).toBe(3)
    })

    it('drops the pending refresh when the runner unmounts', async () => {
        const { result, unmount, balanceRefreshes } = renderRunner()

        await act(() => result.current.invoke(scenario))
        unmount()
        await vi.advanceTimersByTimeAsync(BALANCE_REFRESH_DELAY_MS)

        expect(balanceRefreshes()).toBe(1)
    })
})
