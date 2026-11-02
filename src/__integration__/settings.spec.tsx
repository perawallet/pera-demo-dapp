import { render, screen, waitFor, within } from '@testing-library/react'
import algosdk from 'algosdk'

import { App } from '@app/App'
import { useToastStore } from '@components/toast/useToastStore'
import { ChainType, getCustomNetworkSettings } from '@lib/algod/networks'
import { getPersistedNetwork } from '@lib/storage/settings'
import { header, openDialog, openMenu } from '@test-utils/appQueries'
import { testWallet } from '@test-utils/fakeWallet'
import { setupUser } from '@test-utils/render'

const lastToast = () => useToastStore.getState().toast?.message

const openSettings = async (user: ReturnType<typeof setupUser>) => {
    await user.click(header().getByRole('button', { name: 'Settings' }))

    return openMenu()
}

describe('network selection', () => {
    it('switches to MainNet with a warning banner and persists the choice', async () => {
        const user = setupUser()
        render(<App />)

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()

        await user.click(
            header().getByRole('button', { name: /Select network/ }),
        )
        await user.click((await openMenu()).getByText('MainNet'))

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'You are using MainNet right now',
        )
        expect(getPersistedNetwork()).toBe(ChainType.MainNet)
        expect(testWallet.transports.v1.setChain).toHaveBeenCalledWith(
            ChainType.MainNet,
        )
        // MainNet-only dApp scenarios become available.
        expect(
            screen.getByRole('button', { name: 'mainnet-dapp' }),
        ).toBeVisible()
    })

    it('saves a custom endpoint and switches to it', async () => {
        const user = setupUser()
        render(<App />)

        await user.click(
            header().getByRole('button', { name: /Select network/ }),
        )
        await user.click((await openMenu()).getByText('Custom…'))

        const dialog = await openDialog()
        const url = dialog.getByLabelText('Algod URL')
        await user.clear(url)
        await user.type(url, 'not a url')
        expect(
            dialog.getByRole('button', { name: 'Save and switch' }),
        ).toBeDisabled()

        await user.clear(url)
        await user.type(url, 'http://node.test')
        await user.clear(dialog.getByLabelText('Port'))
        await user.type(dialog.getByLabelText('Port'), '8080')
        await user.click(
            dialog.getByRole('button', { name: 'Save and switch' }),
        )

        await waitFor(() =>
            expect(header().getByText('http://node.test:8080')).toBeVisible(),
        )
        expect(getCustomNetworkSettings()).toMatchObject({
            baseServer: 'http://node.test',
            port: '8080',
        })
    })
})

describe('settings menu', () => {
    it('toggles compact mode on the connect SDK', async () => {
        const user = setupUser()
        render(<App />)

        const menu = await openSettings(user)
        await user.click(
            menu.getByRole('switch', { name: 'Compact connect mode' }),
        )

        expect(testWallet.peraConnect.updateConfig).toHaveBeenCalledWith({
            compactMode: true,
        })
        expect(localStorage.getItem('CompactMode')).toBe('true')
    })

    it('reports the extension and lets the user opt out of it', async () => {
        const user = setupUser()
        render(<App />)

        const menu = await openSettings(user)

        expect(await menu.findByText('window.pera detected')).toBeVisible()
        await user.click(
            menu.getByRole('switch', { name: 'Prefer Pera extension' }),
        )
        expect(testWallet.peraConnect.updateConfig).toHaveBeenCalledWith({
            shouldPreferExtension: false,
        })
    })

    it('switches to WalletConnect v2 and drops the session', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText('12.345678 ALGO')

        const menu = await openSettings(user)
        await user.click(
            menu.getByRole('combobox', { name: 'WalletConnect version' }),
        )
        await user.click(
            within(await screen.findByRole('listbox')).getByText('v2'),
        )

        await waitFor(() =>
            expect(lastToast()).toBe('Switched to WalletConnect v2'),
        )
        expect(testWallet.wallet.version).toBe('v2')
        expect(header().getByText('WC v2')).toBeVisible()
        expect(screen.queryByText('12.345678 ALGO')).not.toBeInTheDocument()
    })

    it('shows the connection target once connected', async () => {
        const user = setupUser()
        render(<App />)

        expect(
            (await openSettings(user)).getByText('Not connected'),
        ).toBeVisible()
        await user.keyboard('{Escape}')

        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText('12.345678 ALGO')

        expect(
            (await openSettings(user)).getByText('https://bridge.test'),
        ).toBeVisible()
    })

    it('lists toasts in the activity log and clears them', async () => {
        const user = setupUser()
        render(<App />)
        await user.click(header().getByRole('button', { name: 'Connect' }))
        await screen.findByText('12.345678 ALGO')

        await user.click((await openSettings(user)).getByText('Activity log'))

        const drawer = within(await screen.findByRole('presentation'))
        expect(
            drawer.getByText('Connected to Pera Wallet (3 accounts)'),
        ).toBeVisible()

        await user.click(drawer.getByRole('button', { name: 'Clear' }))

        expect(drawer.getByText(/No activity yet/)).toBeVisible()
    })
})

describe('custom network connection test', () => {
    const testConnection = async (
        result: () => Promise<{ genesisID: string }>,
    ) => {
        vi.spyOn(
            algosdk.Algodv2.prototype,
            'getTransactionParams',
        ).mockReturnValue({ do: result } as never)
        const user = setupUser()
        render(<App />)
        await user.click(
            header().getByRole('button', { name: /Select network/ }),
        )
        await user.click((await openMenu()).getByText('Custom…'))
        const dialog = await openDialog()
        await user.click(
            dialog.getByRole('button', { name: 'Test connection' }),
        )

        return dialog
    }

    it('confirms a reachable node', async () => {
        const dialog = await testConnection(async () => ({
            genesisID: 'dockernet-v1',
        }))

        expect(
            await dialog.findByText('Connected. Genesis ID: dockernet-v1'),
        ).toBeVisible()
    })

    it('warns when the node is MainNet', async () => {
        const dialog = await testConnection(async () => ({
            genesisID: 'mainnet-v1.0',
        }))

        expect(await dialog.findByText(/this is MAINNET/)).toBeVisible()
    })

    it('shows connection errors', async () => {
        const dialog = await testConnection(async () => {
            throw new Error('ECONNREFUSED')
        })

        expect(await dialog.findByText('ECONNREFUSED')).toBeVisible()
    })
})
