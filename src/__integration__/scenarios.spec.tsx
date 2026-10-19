import { screen, waitFor, render } from '@testing-library/react'

import { App } from '@app/App'
import { useToastStore } from '@components/toast/useToastStore'
import { header, scenarioCard } from '@test-utils/appQueries'
import { fakeAlgod } from '@test-utils/fakeAlgod'
import { testWallet } from '@test-utils/fakeWallet'
import { TEST_ADDRESSES } from '@test-utils/fixtures'
import { setupUser } from '@test-utils/render'

const toastMessages = () =>
    useToastStore.getState().history.map(entry => entry.message)

const renderConnected = async (accounts = TEST_ADDRESSES) => {
    const user = setupUser()
    testWallet.transports.v1.nextAccounts = accounts
    render(<App />)
    await user.click(header().getByRole('button', { name: 'Connect' }))
    await screen.findByText('12.345678 ALGO')

    return user
}

describe('scenario runner', () => {
    it('asks for a wallet before invoking anything', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(
            scenarioCard('Sign single pay txn').getByRole('button', {
                name: 'Invoke',
            }),
        )

        expect(toastMessages()).toContain(
            'Connect a wallet first to invoke scenarios.',
        )
        expect(testWallet.transports.v1.signTransaction).not.toHaveBeenCalled()
    })

    it('signs, submits and refreshes the balance', async () => {
        const user = await renderConnected()
        fakeAlgod.balance = 10_000_000n

        await user.click(
            scenarioCard('Sign single pay txn').getByRole('button', {
                name: 'Invoke',
            }),
        )

        await waitFor(() =>
            expect(toastMessages()).toContain(
                'Signed and sent: Sign single pay txn',
            ),
        )
        expect(testWallet.transports.v1.signTransaction).toHaveBeenCalledTimes(
            1,
        )
        expect(fakeAlgod.sent).toHaveLength(1)
        expect(await screen.findByText('10.00 ALGO')).toBeInTheDocument()
    })

    it('shows wallet rejections as errors', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        testWallet.transports.v1.signTransaction.mockRejectedValueOnce(
            new Error('Transaction request rejected'),
        )

        await user.click(
            scenarioCard('Sign single pay txn').getByRole('button', {
                name: 'Invoke',
            }),
        )

        await waitFor(() =>
            expect(useToastStore.getState().toast).toMatchObject({
                message: 'Transaction request rejected',
                severity: 'error',
            }),
        )
        expect(fakeAlgod.sent).toHaveLength(0)
    })

    it('signs arbitrary data with the active account', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)

        await user.click(
            scenarioCard('Sign single arbitrary data').getByRole('button', {
                name: 'Invoke',
            }),
        )

        await waitFor(() =>
            expect(testWallet.transports.v1.signData).toHaveBeenCalledWith(
                [
                    expect.objectContaining({
                        message: 'Timestamp confirmation',
                    }),
                ],
                TEST_ADDRESSES[0],
                true,
            ),
        )
        expect(toastMessages()).toContain(
            'Arbitrary data signed: Sign single arbitrary data',
        )
    })

    it('resolves the ARC-60 signer before asking the wallet', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)

        await user.click(
            scenarioCard('ARC-60 auth').getByRole('button', { name: 'Invoke' }),
        )

        await waitFor(() =>
            expect(testWallet.transports.v1.signArc60Data).toHaveBeenCalled(),
        )
        expect(testWallet.peraConnect.resolveArc60Signer).toHaveBeenCalledWith(
            TEST_ADDRESSES[0],
        )
    })

    it('reads empty signatures without a wallet prompt', async () => {
        const user = await renderConnected()
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        testWallet.transports.v1.getEmptySignatures.mockResolvedValueOnce({
            [TEST_ADDRESSES[0]]: 'gA==',
        })

        await user.click(
            scenarioCard('Get empty signatures').getByRole('button', {
                name: 'Invoke',
            }),
        )

        await waitFor(() =>
            expect(
                testWallet.transports.v1.getEmptySignatures,
            ).toHaveBeenCalledWith('testnet'),
        )
    })

    it('disables multi-signer scenarios until enough accounts connect', async () => {
        await renderConnected([TEST_ADDRESSES[0]])

        const card = scenarioCard(
            'Sign atomic group with 2 connected accounts (multi-signer)',
        )

        expect(card.getByRole('button', { name: 'Invoke' })).toBeDisabled()
        expect(
            card.getByText('Connect 2+ accounts to run this'),
        ).toBeInTheDocument()
    })

    it('disables owned-asset scenarios until the setup scenario ran', async () => {
        await renderConnected()

        expect(
            scenarioCard('Sign single asset clawback transfer txn').getByText(
                "Run 'Create test asset (setup)' first",
            ),
        ).toBeInTheDocument()
    })

    it('filters scenarios by category', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(screen.getByRole('button', { name: 'arc60' }))

        expect(screen.getByText('ARC-60 auth')).toBeInTheDocument()
        expect(
            screen.queryByText('Sign single pay txn'),
        ).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'All' }))

        expect(screen.getByText('Sign single pay txn')).toBeInTheDocument()
    })

    it('reveals a scenario description and expectation', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(screen.getByText('Sign single pay txn'))

        expect(
            await scenarioCard('Sign single pay txn').findByText('Expected'),
        ).toBeVisible()
    })
})
