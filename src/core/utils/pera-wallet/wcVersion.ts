import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/pera-wallet/peraWalletTypes";

export type WalletConnectVersion = "v1" | "v2";

/** Display order for the version picker. v1 first because it is the default. */
export const WALLET_CONNECT_VERSIONS: readonly WalletConnectVersion[] = ["v1", "v2"];

const isWalletConnectVersion = (value: unknown): value is WalletConnectVersion =>
  WALLET_CONNECT_VERSIONS.includes(value as WalletConnectVersion);

/** The version the user last selected. Falls back to v1 when absent or
 *  unrecognised, so a stale or hand-edited value cannot wedge the app. */
export const getPersistedWcVersion = (): WalletConnectVersion => {
  const stored = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET_CONNECT_VERSION);

  return isWalletConnectVersion(stored) ? stored : "v1";
};

export const persistWcVersion = (version: WalletConnectVersion): void => {
  localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET_CONNECT_VERSION, version);
};
