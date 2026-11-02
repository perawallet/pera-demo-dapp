import { configure } from '@testing-library/react'

import { resetIntegrationState } from './integration'

// Full-app renders are slow under jsdom, more so with coverage on.
configure({ asyncUtilTimeout: 5000 })

// Integration specs drive the real app against a fake wallet and algod.
vi.mock(
    '@lib/wallet/walletInstance',
    async () => (await import('./fakeWallet')).testWallet,
)
vi.mock('@lib/algod/algod', async importOriginal => {
    const { fakeAlgod } = await import('./fakeAlgod')
    const { TEST_SUGGESTED_PARAMS } = await import('./fixtures')

    return {
        ...(await importOriginal<typeof import('@lib/algod/algod')>()),
        clientForChain: () => fakeAlgod,
        apiGetTxnParams: async () => TEST_SUGGESTED_PARAMS,
    }
})

beforeEach(resetIntegrationState)
