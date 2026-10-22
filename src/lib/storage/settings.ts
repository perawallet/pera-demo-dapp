import { ChainType } from '@lib/algod/networks'
import {
    WALLET_CONNECT_VERSIONS,
    type WalletConnectVersion,
} from '@lib/wallet/wcVersion'

import { readItem, readJson, writeItem } from './localStore'
import { STORAGE_KEYS, type PeraWalletDetails } from './storageKeys'

// Every getter falls back to a default when the stored value is absent or
// unrecognised, so a stale or hand-edited entry cannot wedge the app.

export const getPersistedNetwork = (): ChainType => {
    const stored = readItem(STORAGE_KEYS.SELECTED_NETWORK)

    return Object.values(ChainType).includes(stored as ChainType)
        ? (stored as ChainType)
        : ChainType.TestNet
}

export const persistNetwork = (chain: ChainType): void =>
    writeItem(STORAGE_KEYS.SELECTED_NETWORK, chain)

export const getPersistedCompactMode = (): boolean =>
    readItem(STORAGE_KEYS.COMPACT_MODE) === 'true'

export const persistCompactMode = (isCompact: boolean): void =>
    writeItem(STORAGE_KEYS.COMPACT_MODE, String(isCompact))

// Defaults to enabled, matching the SDK, so only an explicit opt-out disables it.
export const getPersistedPreferExtension = (): boolean =>
    readItem(STORAGE_KEYS.PREFER_EXTENSION) !== 'false'

export const persistPreferExtension = (shouldPrefer: boolean): void =>
    writeItem(STORAGE_KEYS.PREFER_EXTENSION, String(shouldPrefer))

export const getPersistedWcVersion = (): WalletConnectVersion => {
    const stored = readItem(STORAGE_KEYS.WALLET_CONNECT_VERSION)

    return WALLET_CONNECT_VERSIONS.includes(stored as WalletConnectVersion)
        ? (stored as WalletConnectVersion)
        : 'v1'
}

export const persistWcVersion = (version: WalletConnectVersion): void =>
    writeItem(STORAGE_KEYS.WALLET_CONNECT_VERSION, version)

/** The session `@perawallet/connect` wrote; used to show the wallet type. */
export const getStoredPeraWalletDetails = (): PeraWalletDetails | null =>
    readJson<PeraWalletDetails>(STORAGE_KEYS.WALLET)
