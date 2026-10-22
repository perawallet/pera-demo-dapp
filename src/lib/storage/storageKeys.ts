/** Mirrors `PeraWalletType` in `@perawallet/connect`. */
export type PeraWalletType =
    | 'pera-wallet'
    | 'pera-wallet-web'
    | 'pera-wallet-extension'

/** Shape `@perawallet/connect` persists under `STORAGE_KEYS.WALLET`. */
export interface PeraWalletDetails {
    type: PeraWalletType
    accounts: string[]
    selectedAccount: string
}

/** Existing keys are kept verbatim so returning users keep their settings. */
export const STORAGE_KEYS = {
    WALLET: 'PeraWallet.Wallet',
    COMPACT_MODE: 'CompactMode',
    PREFER_EXTENSION: 'PreferExtension',
    SELECTED_NETWORK: 'SelectedNetwork',
    CUSTOM_NETWORK: 'CustomNetwork',
    WALLET_CONNECT_VERSION: 'WalletConnectVersion',
} as const
