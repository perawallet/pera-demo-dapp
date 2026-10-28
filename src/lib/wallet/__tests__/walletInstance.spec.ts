import { STORAGE_KEYS } from '@lib/storage/storageKeys'

const loadFresh = async () => {
    vi.resetModules()
    return import('../walletInstance')
}

describe('walletInstance', () => {
    beforeEach(() => localStorage.clear())

    it('starts on the persisted WalletConnect version', async () => {
        localStorage.setItem(STORAGE_KEYS.WALLET_CONNECT_VERSION, 'v2')

        const { wallet } = await loadFresh()

        expect(wallet.version).toBe('v2')
        expect(wallet.isConnected).toBe(false)
    })

    it('builds the v1 SDK from the persisted settings', async () => {
        localStorage.setItem(STORAGE_KEYS.COMPACT_MODE, 'true')

        const { peraConnect, wallet } = await loadFresh()

        expect(wallet.version).toBe('v1')
        expect(peraConnect.compactMode).toBe(true)
    })
})
