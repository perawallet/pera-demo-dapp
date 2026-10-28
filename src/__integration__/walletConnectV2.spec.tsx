import { act, render, screen } from '@testing-library/react'

import { App } from '@app/App'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'
import { openDialog } from '@test-utils/appQueries'
import { testWallet } from '@test-utils/fakeWallet'
import { setupUser } from '@test-utils/render'

const PAIRING_URI = 'wc:topic@2?relay-protocol=irn&symKey=abc'

const renderOnV2 = async () => {
    render(<App />)
    await act(() => useSettingsStore.getState().setWcVersion('v2'))

    const ui = testWallet.pairingUi

    if (!ui) {
        throw new Error('The v2 transport was not given a pairing UI')
    }

    return ui
}

describe('WalletConnect v2 pairing UI', () => {
    it('shows the pairing QR code and reports a dismissal', async () => {
        const user = setupUser()
        const ui = await renderOnV2()
        const onClosed = vi.fn()

        act(() => ui.openPairing(PAIRING_URI, onClosed))

        const dialog = await openDialog()
        expect(dialog.getByText('Connect with WalletConnect v2')).toBeVisible()

        await user.click(dialog.getByRole('button', { name: 'Copy link' }))
        await expect(navigator.clipboard.readText()).resolves.toBe(PAIRING_URI)
        expect(await dialog.findByText('Copied')).toBeVisible()

        await user.click(dialog.getByRole('button', { name: 'close' }))

        expect(onClosed).toHaveBeenCalledTimes(1)
    })

    it('closes without reporting a dismissal once the wallet approves', async () => {
        const ui = await renderOnV2()
        const onClosed = vi.fn()

        act(() => ui.openPairing(PAIRING_URI, onClosed))
        await openDialog()
        act(() => ui.closePairing())

        await vi.waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        )
        expect(onClosed).not.toHaveBeenCalled()
    })

    it('prompts to open the wallet while a request is pending', async () => {
        const ui = await renderOnV2()

        let dismiss: () => void = () => undefined
        act(() => {
            dismiss = ui.showSignPrompt()
        })

        expect(
            await screen.findByText('Approve the request in Pera Wallet'),
        ).toBeVisible()

        act(() => dismiss())

        await vi.waitFor(() =>
            expect(
                screen.queryByText('Approve the request in Pera Wallet'),
            ).not.toBeInTheDocument(),
        )
    })
})
