import { act, render, screen, waitFor, within } from '@testing-library/react'

import { App } from '@app/App'
import { useToastStore } from '@components/toast/useToastStore'
import { ChainType } from '@lib/algod/networks'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'
import { header, openDialog, openMenu } from '@test-utils/appQueries'
import { fakeAlgod } from '@test-utils/fakeAlgod'
import { testWallet } from '@test-utils/fakeWallet'
import { TEST_ADDRESSES } from '@test-utils/fixtures'
import { setupUser } from '@test-utils/render'

type User = ReturnType<typeof setupUser>

const openGenerator = async (user: User, name: string) => {
    await user.click(header().getByRole('button', { name: 'Generators' }))
    await user.click((await openMenu()).getByText(name))

    return openDialog()
}

const lastToast = () => useToastStore.getState().toast

describe('ARC-90 URI generator', () => {
    it('builds a URI and QR code as fields are filled', async () => {
        const user = setupUser()
        render(<App />)

        const dialog = await openGenerator(user, 'ARC-90 URI Generator')
        await user.type(dialog.getByLabelText('Address (required)'), 'ADDR')
        await user.type(dialog.getByLabelText('Amount (µAlgo)'), '5')

        expect(dialog.getByText('algorand://ADDR?amount=5')).toBeVisible()

        await user.click(dialog.getByLabelText('Include network prefix'))

        expect(
            dialog.getByText('algorand://net:testnet/ADDR?amount=5'),
        ).toBeVisible()

        await user.click(dialog.getByRole('button', { name: 'Copy' }))
        await expect(navigator.clipboard.readText()).resolves.toBe(
            'algorand://net:testnet/ADDR?amount=5',
        )
    })

    it('keeps each tab’s input separately', async () => {
        const user = setupUser()
        render(<App />)

        const dialog = await openGenerator(user, 'ARC-90 URI Generator')
        await user.click(dialog.getByRole('tab', { name: 'App Query' }))
        await user.type(dialog.getByLabelText('App ID (required)'), '42')

        expect(dialog.getByText('algorand://app/42')).toBeVisible()

        await user.click(dialog.getByRole('tab', { name: 'ALGO Transfer' }))

        expect(dialog.getByLabelText('Address (required)')).toHaveValue('')
        expect(dialog.queryByText(/^algorand:/)).not.toBeInTheDocument()
    })
})

describe('Pera deeplink generator', () => {
    it('validates required fields and generates a link', async () => {
        const user = setupUser()
        render(<App />)

        const dialog = await openGenerator(user, 'Pera Deeplink Generator')
        expect(dialog.getByRole('button', { name: 'Generate' })).toBeDisabled()

        await user.click(dialog.getByRole('combobox', { name: 'Destination' }))
        await user.click(
            within(await screen.findByRole('listbox')).getByText('Add Contact'),
        )
        await user.click(dialog.getByRole('button', { name: 'Generate' }))

        expect(
            dialog.getByText('Missing required field: address'),
        ).toBeVisible()

        await user.type(dialog.getByLabelText(/address/), 'ADDR')
        await user.click(dialog.getByRole('button', { name: 'Generate' }))

        expect(
            dialog.getByRole('link', {
                name: 'perawallet://app/add-contact/?address=ADDR&label=',
            }),
        ).toBeVisible()
    })
})

describe('custom transaction builder', () => {
    const connectAndOpen = async (user: User) => {
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText('12.345678 ALGO')

        return openGenerator(user, 'Create Custom Transaction')
    }

    it('is disabled until a wallet is connected', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(header().getByRole('button', { name: 'Generators' }))

        expect(
            (await openMenu()).getByRole('menuitem', {
                name: 'Create Custom Transaction',
            }),
        ).toHaveAttribute('aria-disabled', 'true')
    })

    it('queues, groups, signs and submits payments as one group', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)

        expect(dialog.getByLabelText('Sender')).toHaveValue(TEST_ADDRESSES[0])

        for (const amount of ['1000', '2000']) {
            await user.type(
                dialog.getByLabelText('Receiver'),
                TEST_ADDRESSES[1],
            )
            await user.type(
                dialog.getByLabelText('Amount (microAlgos)'),
                amount,
            )
            await user.click(
                dialog.getByRole('button', { name: 'Add pay transaction' }),
            )
            await waitFor(() =>
                expect(dialog.getByLabelText('Receiver')).toHaveValue(''),
            )
        }

        expect(dialog.getByText('Queued transactions (2)')).toBeVisible()

        await user.click(
            dialog.getByRole('button', { name: 'Group queued transactions' }),
        )
        expect(dialog.getAllByText(/grouped/)).toHaveLength(2)

        await user.click(
            dialog.getByLabelText('Submit to the network after signing'),
        )
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        await user.click(
            dialog.getByRole('button', { name: 'Sign 2 transactions' }),
        )

        await waitFor(() =>
            expect(lastToast()?.message).toBe(
                'Signed and confirmed 2 transactions.',
            ),
        )
        expect(testWallet.transports.v1.signTransaction).toHaveBeenCalledTimes(
            1,
        )
        // One atomic group is one submission.
        expect(fakeAlgod.sent).toEqual([
            [expect.any(Uint8Array), expect.any(Uint8Array)],
        ])
        expect(
            dialog.queryByText(/Queued transactions/),
        ).not.toBeInTheDocument()
    })

    it('reports invalid input instead of queueing', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        await user.type(dialog.getByLabelText('Receiver'), 'nope')
        await user.click(
            dialog.getByRole('button', { name: 'Add pay transaction' }),
        )

        await waitFor(() =>
            expect(lastToast()).toMatchObject({
                message: 'Receiver is not a valid address.',
                severity: 'error',
            }),
        )
        expect(
            dialog.queryByText(/Queued transactions/),
        ).not.toBeInTheDocument()
    })

    it('shows the fields for each transaction type', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)

        await user.click(
            dialog.getByRole('combobox', { name: 'Transaction type' }),
        )
        await user.click(
            within(await screen.findByRole('listbox')).getByText(
                'keyreg — key registration',
            ),
        )
        expect(
            dialog.queryByLabelText('Vote key (base64)'),
        ).not.toBeInTheDocument()

        await user.click(dialog.getByLabelText('Offline key registration'))
        expect(dialog.getByLabelText('Vote key (base64)')).toBeVisible()

        await user.click(
            dialog.getByRole('combobox', { name: 'Transaction type' }),
        )
        await user.click(
            within(await screen.findByRole('listbox')).getByText(
                'acfg — asset config',
            ),
        )
        expect(dialog.getByLabelText('Unit name')).toBeVisible()

        await user.click(dialog.getByRole('tab', { name: 'Destroy' }))
        expect(dialog.getByLabelText('Asset index')).toBeVisible()
        expect(dialog.queryByLabelText('Unit name')).not.toBeInTheDocument()
    })

    it('drops queued transactions when the network changes', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)

        await user.type(dialog.getByLabelText('Receiver'), TEST_ADDRESSES[1])
        await user.click(
            dialog.getByRole('button', { name: 'Add pay transaction' }),
        )
        expect(await dialog.findByText('Queued transactions (1)')).toBeVisible()

        act(() => useSettingsStore.getState().setChain(ChainType.BetaNet))

        await waitFor(() =>
            expect(
                dialog.queryByText(/Queued transactions/),
            ).not.toBeInTheDocument(),
        )
    })

    it('explains that bulk asset transfers need the Pera API', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        act(() => useSettingsStore.getState().setChain(ChainType.BetaNet))

        await user.click(
            dialog.getByRole('combobox', { name: 'Transaction type' }),
        )
        await user.click(
            within(await screen.findByRole('listbox')).getByText(
                'axfer — asset transfer',
            ),
        )
        await user.type(dialog.getByLabelText('Receiver'), TEST_ADDRESSES[1])
        await user.type(dialog.getByLabelText('Number of transactions'), '3')
        await user.click(
            dialog.getByRole('button', { name: 'Add axfer transaction' }),
        )

        await waitFor(() =>
            expect(lastToast()?.message).toMatch(
                /^Bulk asset transfers need the Pera API, which is unavailable on BetaNet\./,
            ),
        )
        expect(
            dialog.queryByText(/Queued transactions/),
        ).not.toBeInTheDocument()
    })

    it('signs without submitting when submission is off', async () => {
        const user = setupUser()
        const dialog = await connectAndOpen(user)
        vi.spyOn(console, 'info').mockImplementation(() => undefined)

        await user.type(dialog.getByLabelText('Receiver'), TEST_ADDRESSES[1])
        await user.click(
            dialog.getByRole('button', { name: 'Add pay transaction' }),
        )
        await user.click(
            await dialog.findByRole('button', { name: 'Sign 1 transactions' }),
        )

        await waitFor(() =>
            expect(lastToast()?.message).toBe('Signed 1 transactions.'),
        )
        expect(fakeAlgod.sent).toHaveLength(0)
    })
})
