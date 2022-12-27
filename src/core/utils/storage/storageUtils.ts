import {
  PERA_WALLET_LOCAL_STORAGE_KEYS,
  PeraWalletDetails
} from "./pera-wallet/peraWalletTypes";

function getLocalStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function getWalletDetailsFromStorage(): PeraWalletDetails | null {
  const storedWalletDetails = getLocalStorage()?.getItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET
  );

  if (storedWalletDetails) {
    return JSON.parse(storedWalletDetails) as PeraWalletDetails;
  }

  return null;
}

export {getWalletDetailsFromStorage};
