import algosdk, { type Address, type SuggestedParams } from "algosdk";

export interface BuildPaymentArgs {
  sender: string | Address;
  receiver: string | Address;
  amount: number;
  note?: string;
  suggestedParams: SuggestedParams;
  closeRemainderTo?: string | Address;
  rekeyTo?: string | Address;
  lease?: Uint8Array;
}

export const buildPayment = (args: BuildPaymentArgs): algosdk.Transaction => {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: args.sender,
    receiver: args.receiver,
    amount: args.amount,
    note: args.note ? new Uint8Array(Buffer.from(args.note)) : undefined,
    suggestedParams: args.suggestedParams,
    closeRemainderTo: args.closeRemainderTo,
    rekeyTo: args.rekeyTo,
    lease: args.lease
  });
};
