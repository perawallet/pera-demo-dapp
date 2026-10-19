import { StrictMode } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'

import { App } from '@app/App'
import { useToastStore } from '@components/toast/useToastStore'
import { shortenAddress } from '@lib/format/format'
import { header } from '@test-utils/appQueries'
import { fakeAlgod } from '@test-utils/fakeAlgod'
import { testWallet } from '@test-utils/fakeWallet'
import { TEST_ADDRESSES } from '@test-utils/fixtures'
import { setupUser } from '@test-utils/render'

const [FIRST, SECOND] = TEST_ADDRESSES
const lastToast = () => useToastStore.getState().toast?.message

describe('wallet session', () => {
    it('connects, shows the balance and the active account', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(header().getByRole('button', { name: 'Connect' }))

        expect(
            await screen.findByText(shortenAddress(FIRST, 8, 4)),
        ).toBeInTheDocument()
        expect(screen.getByText('12.345678 ALGO')).toBeInTheDocument()
        expect(lastToast()).toBe('Connected to Pera Wallet (3 accounts)')
        expect(fakeAlgod.accountInformation).toHaveBeenCalledWith(FIRST)
    })

    it('restores a persisted session on load', async () => {
        testWallet.transports.v1.restoredAccounts = [SECOND]

        render(<App />)

        expect(
            await screen.findByText(shortenAddress(SECOND, 8, 4)),
        ).toBeInTheDocument()
        expect(lastToast()).toBe('Connected to Pera Wallet')
    })

    it('restores the session once under StrictMode', async () => {
        testWallet.transports.v1.restoredAccounts = [SECOND]

        render(
            <StrictMode>
                <App />
            </StrictMode>,
        )

        await screen.findByText(shortenAddress(SECOND, 8, 4))
        expect(testWallet.transports.v1.reconnectSession).toHaveBeenCalledTimes(
            1,
        )
        expect(useToastStore.getState().history).toHaveLength(1)
    })

    it('does nothing when the user closes the connect modal', async () => {
        const user = setupUser()
        testWallet.transports.v1.nextAccounts = []
        render(<App />)

        await user.click(header().getByRole('button', { name: 'Connect' }))

        expect(header().getByRole('button', { name: 'Connect' })).toBeVisible()
        expect(lastToast()).toBeUndefined()
    })

    it('reports a failed connection', async () => {
        const user = setupUser()
        testWallet.transports.v1.connect.mockRejectedValueOnce(
            new Error('Bridge unreachable'),
        )
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        render(<App />)

        await user.click(header().getByRole('button', { name: 'Connect' }))

        await waitFor(() => expect(lastToast()).toBe('Bridge unreachable'))
    })

    it('switches the active account and refetches its balance', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText(shortenAddress(FIRST, 8, 4))

        await user.click(header().getByRole('button', { name: 'Account menu' }))
        const menu = await screen.findByRole('menu')
        expect(
            within(menu).getByText('Connected accounts (3)'),
        ).toBeInTheDocument()
        await user.click(within(menu).getByText(shortenAddress(SECOND)))

        expect(
            await screen.findByText(shortenAddress(SECOND, 8, 4)),
        ).toBeInTheDocument()
        expect(fakeAlgod.accountInformation).toHaveBeenCalledWith(SECOND)
    })

    it('copies the active address', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText(shortenAddress(FIRST, 8, 4))

        await user.click(header().getByRole('button', { name: 'Account menu' }))
        await user.click(await screen.findByText('Copy address'))

        await expect(navigator.clipboard.readText()).resolves.toBe(FIRST)
        expect(lastToast()).toBe('Address copied to clipboard')
    })

    it('disconnects from the account menu', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText(shortenAddress(FIRST, 8, 4))

        await user.click(header().getByRole('button', { name: 'Account menu' }))
        await user.click(await screen.findByText('Disconnect'))

        expect(
            await header().findByRole('button', { name: 'Connect' }),
        ).toBeVisible()
        expect(testWallet.transports.v1.disconnect).toHaveBeenCalled()
        expect(screen.queryByText('12.345678 ALGO')).not.toBeInTheDocument()
    })

    it('clears the session when the wallet ends it', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText(shortenAddress(FIRST, 8, 4))

        testWallet.transports.v1.endSession()

        expect(
            await header().findByRole('button', { name: 'Connect' }),
        ).toBeVisible()
    })
})
