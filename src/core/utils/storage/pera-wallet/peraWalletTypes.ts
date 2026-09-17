/** Mirrors `PeraWalletType` in `@perawallet/connect`. Declared locally so
 *  Jest-tested modules never have to resolve that package's ESM exports map. */
export type PeraWalletType = "pera-wallet" | "pera-wallet-web" | "pera-wallet-extension";

export interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
}

const PERA_WALLET_LOCAL_STORAGE_KEYS = {
  WALLET: "PeraWallet.Wallet",
  COMPACT_MODE: "CompactMode",
  PREFER_EXTENSION: "PreferExtension",
  SELECTED_NETWORK: "SelectedNetwork",
  CUSTOM_NETWORK: "CustomNetwork",
  WALLET_CONNECT_VERSION: "WalletConnectVersion"
};

export {PERA_WALLET_LOCAL_STORAGE_KEYS};
