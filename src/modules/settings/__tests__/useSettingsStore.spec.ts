import { ChainType, getCustomNetworkSettings } from '@lib/algod/networks'
import { getPersistedNetwork } from '@lib/storage/settings'
import { getOwnedAsset, setOwnedAsset } from '@scenarios/owned-asset'
import { testWallet } from '@test-utils/fakeWallet'
import { resetStores } from '@test-utils/resetStores'

import { useSettingsStore } from '../hooks/useSettingsStore'

vi.mock(
    '@lib/wallet/walletInstance',
    async () => (await import('@test-utils/fakeWallet')).testWallet,
)

const ENDPOINT = { baseServer: 'http://node.test', port: '8080', token: 't' }

describe('useSettingsStore', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
    })

    it('persists the network, tells the wallet and bumps the revision', () => {
        useSettingsStore.getState().setChain(ChainType.BetaNet)

        expect(useSettingsStore.getState()).toMatchObject({
            chain: ChainType.BetaNet,
            endpointRevision: 1,
        })
        expect(getPersistedNetwork()).toBe(ChainType.BetaNet)
        expect(testWallet.transports.v1.setChain).toHaveBeenCalledWith(
            ChainType.BetaNet,
        )
    })

    it('forgets Custom-network assets when the endpoint changes', () => {
        setOwnedAsset(ChainType.Custom, 'ADDR', 7)

        useSettingsStore.getState().saveCustomNetwork(ENDPOINT)

        expect(getOwnedAsset(ChainType.Custom, 'ADDR')).toBeNull()
        expect(getCustomNetworkSettings()).toEqual(ENDPOINT)
        expect(useSettingsStore.getState().chain).toBe(ChainType.Custom)
    })

    it('keeps Custom-network assets when the same endpoint is saved again', () => {
        useSettingsStore.getState().saveCustomNetwork(ENDPOINT)
        setOwnedAsset(ChainType.Custom, 'ADDR', 7)

        useSettingsStore.getState().saveCustomNetwork({ ...ENDPOINT })

        expect(getOwnedAsset(ChainType.Custom, 'ADDR')).toBe(7)
        // Still a network action, so stale queries are dropped.
        expect(useSettingsStore.getState().endpointRevision).toBe(2)
    })

    it('rebuilds the connect SDK for compact mode and the extension preference', () => {
        useSettingsStore.getState().setCompactMode(true)
        useSettingsStore.getState().setPreferExtension(false)

        expect(testWallet.peraConnect.updateConfig).toHaveBeenNthCalledWith(1, {
            compactMode: true,
        })
        expect(testWallet.peraConnect.updateConfig).toHaveBeenNthCalledWith(2, {
            shouldPreferExtension: false,
        })
        expect(localStorage.getItem('CompactMode')).toBe('true')
        expect(localStorage.getItem('PreferExtension')).toBe('false')
    })

    it('swaps the transport and keeps it on the selected network', async () => {
        useSettingsStore.getState().setChain(ChainType.MainNet)

        await useSettingsStore.getState().setWcVersion('v2')

        expect(testWallet.wallet.version).toBe('v2')
        expect(testWallet.transports.v2.setChain).toHaveBeenCalledWith(
            ChainType.MainNet,
        )
        expect(useSettingsStore.getState().wcVersion).toBe('v2')

        await useSettingsStore.getState().setWcVersion('v1')
    })

    // ARC-60 signer lookups always go through the v1 SDK, whichever
    // transport signs, so it has to follow the network under v2 as well.
    it.each([
        [ChainType.MainNet, 416_001],
        [ChainType.TestNet, 416_002],
    ])(
        'points the connect SDK at %s under WalletConnect v2',
        async (chain, chainId) => {
            useSettingsStore.getState().setChain(ChainType.BetaNet)
            await useSettingsStore.getState().setWcVersion('v2')
            testWallet.peraConnect.updateConfig.mockClear()

            useSettingsStore.getState().setChain(chain)

            expect(testWallet.peraConnect.updateConfig).toHaveBeenCalledWith({
                chainId,
            })

            await useSettingsStore.getState().setWcVersion('v1')
        },
    )
})
