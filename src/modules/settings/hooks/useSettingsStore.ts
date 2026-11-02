import { create } from 'zustand'

import {
    ChainType,
    getCustomNetworkSettings,
    setCustomNetworkSettings,
    type CustomNetworkSettings,
} from '@lib/algod/networks'
import {
    getPersistedCompactMode,
    getPersistedNetwork,
    getPersistedPreferExtension,
    getPersistedWcVersion,
    persistCompactMode,
    persistNetwork,
    persistPreferExtension,
} from '@lib/storage/settings'
import { peraConnect, wallet } from '@lib/wallet/walletInstance'
import type { WalletConnectVersion } from '@lib/wallet/wcVersion'
import { clearCustomNetworkOwnedAssets } from '@scenarios/owned-asset'

interface SettingsState {
    chain: ChainType
    /** Bumped on every network action. Saving a new Custom endpoint leaves
     *  `chain` unchanged, so queries key on this to drop the old node's data. */
    endpointRevision: number
    isCompactMode: boolean
    shouldPreferExtension: boolean
    wcVersion: WalletConnectVersion
    setChain: (chain: ChainType) => void
    saveCustomNetwork: (settings: CustomNetworkSettings) => void
    setCompactMode: (isCompactMode: boolean) => void
    setPreferExtension: (shouldPreferExtension: boolean) => void
    /** Swaps the transport; any live session is disconnected. */
    setWcVersion: (version: WalletConnectVersion) => Promise<void>
}

const isSameEndpoint = (a: CustomNetworkSettings, b: CustomNetworkSettings) =>
    a.baseServer === b.baseServer &&
    String(a.port) === String(b.port) &&
    a.token === b.token

// Actions persist the setting and push it into the wallet singletons, which
// read their options outside React.
export const useSettingsStore = create<SettingsState>()((set, get) => ({
    chain: getPersistedNetwork(),
    endpointRevision: 0,
    isCompactMode: getPersistedCompactMode(),
    shouldPreferExtension: getPersistedPreferExtension(),
    wcVersion: getPersistedWcVersion(),
    setChain: chain => {
        persistNetwork(chain)
        wallet.setChain(chain)
        set(state => ({ chain, endpointRevision: state.endpointRevision + 1 }))
    },
    saveCustomNetwork: settings => {
        // Assets created on the previous node do not exist on the new one.
        if (!isSameEndpoint(getCustomNetworkSettings(), settings)) {
            clearCustomNetworkOwnedAssets()
        }
        setCustomNetworkSettings(settings)
        get().setChain(ChainType.Custom)
    },
    setCompactMode: isCompactMode => {
        persistCompactMode(isCompactMode)
        peraConnect.updateConfig({ compactMode: isCompactMode })
        set({ isCompactMode })
    },
    setPreferExtension: shouldPreferExtension => {
        persistPreferExtension(shouldPreferExtension)
        peraConnect.updateConfig({ shouldPreferExtension })
        set({ shouldPreferExtension })
    },
    setWcVersion: async version => {
        await wallet.setVersion(version)
        wallet.setChain(get().chain)
        set({ wcVersion: version })
    },
}))
