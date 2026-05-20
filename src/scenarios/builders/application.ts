import algosdk, { type Address, type SuggestedParams, type OnApplicationComplete } from "algosdk";

export interface BuildAppCallArgs {
  sender: string | Address;
  appIndex: number;
  onComplete: OnApplicationComplete;
  appArgs?: Uint8Array[];
  accounts?: (string | Address)[];
  foreignApps?: number[];
  foreignAssets?: number[];
  boxes?: { appIndex: number; name: Uint8Array }[];
  note?: string;
  suggestedParams: SuggestedParams;
  rekeyTo?: string | Address;
}

export const buildAppCall = (args: BuildAppCallArgs): algosdk.Transaction => {
  return algosdk.makeApplicationCallTxnFromObject({
    sender: args.sender,
    appIndex: args.appIndex,
    onComplete: args.onComplete,
    appArgs: args.appArgs,
    accounts: args.accounts,
    foreignApps: args.foreignApps,
    foreignAssets: args.foreignAssets,
    boxes: args.boxes,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams,
    rekeyTo: args.rekeyTo
  });
};

export interface BuildAppCreateArgs {
  sender: string | Address;
  approvalProgram: Uint8Array;
  clearProgram: Uint8Array;
  numLocalInts: number;
  numLocalByteSlices: number;
  numGlobalInts: number;
  numGlobalByteSlices: number;
  extraPages?: number;
  appArgs?: Uint8Array[];
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildAppCreate = (args: BuildAppCreateArgs): algosdk.Transaction => {
  return algosdk.makeApplicationCreateTxnFromObject({
    sender: args.sender,
    approvalProgram: args.approvalProgram,
    clearProgram: args.clearProgram,
    numLocalInts: args.numLocalInts,
    numLocalByteSlices: args.numLocalByteSlices,
    numGlobalInts: args.numGlobalInts,
    numGlobalByteSlices: args.numGlobalByteSlices,
    extraPages: args.extraPages,
    appArgs: args.appArgs,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams,
    onComplete: algosdk.OnApplicationComplete.NoOpOC
  });
};
