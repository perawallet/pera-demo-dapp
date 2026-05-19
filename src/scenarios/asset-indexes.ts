import {ChainType} from "../core/utils/algod/algod";

export enum AssetTransactionType {
  Transfer = "asset-transfer",
  OptIn = "asset-opt-in",
  Close = "asset-close"
}

export const getAssetIndex = (chain: ChainType, type: AssetTransactionType): number => {
  if (chain === ChainType.MainNet) {
    if (type === AssetTransactionType.Transfer) {
      return 604; // IanCoin
    } else if (type === AssetTransactionType.Close) {
      return 672; // RotemCoin
    } else {
      return 312769; // Tether USDt
    }
  }

  if (type === AssetTransactionType.Transfer) {
    return 11711; // HipoCoin
  } else if (type === AssetTransactionType.Close) {
    return 180132; // testasset2
  } else {
    return 135270; // Turkish Lira
  }
};
