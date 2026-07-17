import algosdk, { type Address, type SuggestedParams } from "algosdk";

export interface BuildAssetTransferArgs {
  sender: string | Address;
  receiver: string | Address;
  amount: number;
  assetIndex: number;
  note?: string;
  suggestedParams: SuggestedParams;
  closeRemainderTo?: string | Address;
  rekeyTo?: string | Address;
  /** Clawback: the account whose holding is revoked; `sender` must be the asset's clawback address. */
  assetSender?: string | Address;
}

export const buildAssetTransfer = (args: BuildAssetTransferArgs): algosdk.Transaction => {
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    receiver: args.receiver,
    amount: args.amount,
    assetIndex: args.assetIndex,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams,
    closeRemainderTo: args.closeRemainderTo,
    rekeyTo: args.rekeyTo,
    assetSender: args.assetSender
  });
};

export interface BuildAssetCreateArgs {
  sender: string | Address;
  total: number | bigint;
  decimals: number;
  defaultFrozen: boolean;
  unitName?: string;
  assetName?: string;
  assetURL?: string;
  manager?: string | Address;
  reserve?: string | Address;
  freeze?: string | Address;
  clawback?: string | Address;
  note?: string;
  suggestedParams: SuggestedParams;
  rekeyTo?: string | Address;
  assetMetadataHash?: Uint8Array;
}

export const buildAssetCreate = (args: BuildAssetCreateArgs): algosdk.Transaction => {
  return algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    total: args.total,
    decimals: args.decimals,
    defaultFrozen: args.defaultFrozen,
    unitName: args.unitName,
    assetName: args.assetName,
    assetURL: args.assetURL,
    manager: args.manager,
    reserve: args.reserve,
    freeze: args.freeze,
    clawback: args.clawback,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams,
    rekeyTo: args.rekeyTo,
    assetMetadataHash: args.assetMetadataHash
  });
};

export interface BuildAssetReconfigArgs {
  sender: string | Address;
  assetIndex: number;
  manager?: string | Address;
  reserve?: string | Address;
  freeze?: string | Address;
  clawback?: string | Address;
  strictEmptyAddressChecking: boolean;
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildAssetReconfig = (args: BuildAssetReconfigArgs): algosdk.Transaction => {
  return algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    assetIndex: args.assetIndex,
    manager: args.manager,
    reserve: args.reserve,
    freeze: args.freeze,
    clawback: args.clawback,
    strictEmptyAddressChecking: args.strictEmptyAddressChecking,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams
  });
};

export interface BuildAssetDestroyArgs {
  sender: string | Address;
  assetIndex: number;
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildAssetDestroy = (args: BuildAssetDestroyArgs): algosdk.Transaction => {
  return algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    assetIndex: args.assetIndex,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams
  });
};

export interface BuildAssetFreezeArgs {
  sender: string | Address;
  assetIndex: number;
  freezeTarget: string | Address;
  frozen: boolean;
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildAssetFreeze = (args: BuildAssetFreezeArgs): algosdk.Transaction => {
  return algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    assetIndex: args.assetIndex,
    freezeTarget: args.freezeTarget,
    frozen: args.frozen,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams
  });
};
