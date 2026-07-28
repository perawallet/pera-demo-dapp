import {ChainType} from "../core/utils/algod/algod";
import {getNetworkConfig} from "../core/utils/algod/networks";
import {MissingNetworkFixtureError} from "./network-fixtures";

export enum AssetTransactionType {
  Transfer = "asset-transfer",
  OptIn = "asset-opt-in",
  Close = "asset-close"
}

const FIELD_FOR_TYPE: Record<AssetTransactionType, "transfer" | "optIn" | "close"> = {
  [AssetTransactionType.Transfer]: "transfer",
  [AssetTransactionType.OptIn]: "optIn",
  [AssetTransactionType.Close]: "close"
};

export const getAssetIndex = (chain: ChainType, type: AssetTransactionType): number => {
  const {assetIds, label} = getNetworkConfig(chain);

  if (!assetIds) {
    throw new MissingNetworkFixtureError("asset", label);
  }

  return assetIds[FIELD_FOR_TYPE[type]];
};
