import { render, screen, waitFor } from '@testing-library/react'

import { App } from '@app/App'
import { useToastStore } from '@components/toast/useToastStore'
import { ChainType } from '@lib/algod/networks'
import { getOwnedAsset } from '@scenarios/owned-asset'
import { header, scenarioCard } from '@test-utils/appQueries'
import { fakeAlgod } from '@test-utils/fakeAlgod'
import { TEST_ADDRESSES } from '@test-utils/fixtures'
import { setupUser } from '@test-utils/render'

const [OWNER, OTHER] = TEST_ADDRESSES
const SETUP = 'Create test asset (setup)'
const DEPENDENT = 'Sign single asset clawback transfer txn'
const NEEDS_SETUP = "Run 'Create test asset (setup)' first"

const toastMessages = () =>
    useToastStore.getState().history.map(entry => entry.message)

const renderConnected = async () => {
    const user = setupUser()
    render(<App />)
    await user.click(header().getByRole('button', { name: 'Connect' }))
    await screen.findByText('12.345678 ALGO')

    return user
}

const invokeSetup = (user: ReturnType<typeof setupUser>) =>
    user.click(scenarioCard(SETUP).getByRole('button', { name: 'Invoke' }))

describe('owned test asset', () => {
    afterEach(() => {
        window.prompt = () => null
    })

    it('creates the asset, stores its ID and unlocks dependent scenarios', async () => {
        const user = await renderConnected()
        expect(scenarioCard(DEPENDENT).getByText(NEEDS_SETUP)).toBeVisible()

        await invokeSetup(user)

        await waitFor(() =>
            expect(toastMessages()).toContain(
                'Created test asset 999 and stored it for role scenarios.',
            ),
        )
        expect(getOwnedAsset(ChainType.TestNet, OWNER)).toBe(999)
        expect(
            scenarioCard(DEPENDENT).queryByText(NEEDS_SETUP),
        ).not.toBeInTheDocument()
    })

    it('reuses an existing asset whose roles the account holds', async () => {
        const user = await renderConnected()
        window.prompt = () => '4242'
        fakeAlgod.getAssetByID.mockReturnValueOnce({
            do: async () => ({
                params: { manager: OWNER, freeze: OWNER, clawback: OWNER },
            }),
        })

        await invokeSetup(user)

        await waitFor(() =>
            expect(toastMessages()).toContain(
                'Reusing asset 4242 as the owned test asset.',
            ),
        )
        expect(getOwnedAsset(ChainType.TestNet, OWNER)).toBe(4242)
        expect(fakeAlgod.sent).toHaveLength(0)
    })

    it('refuses an asset whose roles belong to someone else', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        window.prompt = () => '4242'
        fakeAlgod.getAssetByID.mockReturnValueOnce({
            do: async () => ({
                params: { manager: OWNER, freeze: OTHER, clawback: OTHER },
            }),
        })

        await invokeSetup(user)

        await waitFor(() =>
            expect(useToastStore.getState().toast?.message).toBe(
                "Asset 4242 can't be used: its freeze, clawback role(s) aren't held by the connected account.",
            ),
        )
        expect(getOwnedAsset(ChainType.TestNet, OWNER)).toBeNull()
    })

    it('rejects an asset ID that is not a number', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        window.prompt = () => 'abc'

        await invokeSetup(user)

        await waitFor(() =>
            expect(useToastStore.getState().toast?.message).toBe(
                '"abc" is not a valid asset ID.',
            ),
        )
    })
})
