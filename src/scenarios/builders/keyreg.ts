import algosdk, { type Address, type SuggestedParams } from "algosdk";

export interface BuildOnlineKeyregArgs {
  sender: string | Address;
  voteKey: string;
  selectionKey: string;
  stateProofKey: string;
  voteFirst: number;
  voteLast: number;
  voteKeyDilution: number;
  note?: string;
  suggestedParams: SuggestedParams;
}

export const buildOnlineKeyreg = (args: BuildOnlineKeyregArgs): algosdk.Transaction => {
  return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    voteKey: args.voteKey,
    selectionKey: args.selectionKey,
    stateProofKey: args.stateProofKey,
    voteFirst: args.voteFirst,
    voteLast: args.voteLast,
    voteKeyDilution: args.voteKeyDilution,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
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
