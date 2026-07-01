import algosdk, { type Address, type SuggestedParams } from "algosdk";

// algosdk v3 requires participation keys as raw bytes (v2 accepted base64
// strings). Decode at the boundary so scenarios can keep using base64 literals.
const base64ToBytes = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

export interface BuildOnlineKeyregArgs {
  sender: string | Address;
  voteKey: string;
  selectionKey: string;
  stateProofKey: string;
  voteFirst: number;
  voteLast: number;
  voteKeyDilution: number;
  note?: string;
  rekeyTo?: string | Address;
  suggestedParams: SuggestedParams;
}

export const buildOnlineKeyreg = (args: BuildOnlineKeyregArgs): algosdk.Transaction => {
  return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    voteKey: base64ToBytes(args.voteKey),
    selectionKey: base64ToBytes(args.selectionKey),
    stateProofKey: base64ToBytes(args.stateProofKey),
    voteFirst: args.voteFirst,
    voteLast: args.voteLast,
    voteKeyDilution: args.voteKeyDilution,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    ...(args.rekeyTo ? { rekeyTo: args.rekeyTo } : {}),
    suggestedParams: args.suggestedParams
  });
};

export interface BuildOfflineKeyregArgs {
  sender: string | Address;
  nonParticipation?: boolean;
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildOfflineKeyreg = (args: BuildOfflineKeyregArgs): algosdk.Transaction => {
  return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    nonParticipation: args.nonParticipation,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams
  });
};
