import algosdk from "algosdk";
import type {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction,
  SignerTransaction,
  SignMetadata
} from "@perawallet/connect";

/*
 * Request and response encoding for WalletConnect v2. Every shape here is
 * byte-for-byte what `@perawallet/connect` puts on the v1 wire
 * (`transport/MobileTransport.ts`, `util/transaction/transactionUtils.ts`,
 * `transport/arc60Wire.ts`), because the mobile app validates both protocols
 * with the same schemas.
 */

export const WC_METHOD_SIGN_TXN = "algo_signTxn";
export const WC_METHOD_SIGN_DATA = "algo_signData";

export const base64ToBytes = (b64: string): Uint8Array =>
  Uint8Array.from(Buffer.from(b64, "base64"));

const bytesToBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

export const composeWalletTransaction = (
  transaction: SignerTransaction,
  signerAddress?: string
): PeraWalletTransaction => {
  let signers: PeraWalletTransaction["signers"];

  if (Array.isArray(transaction.signers)) {
    // The dApp's explicit signers list is authoritative (ARC-0001); an empty
    // array marks the txn as not-to-be-signed by this wallet.
    signers = transaction.signers;
  } else if (signerAddress) {
    // Legacy single-signer mode: txns without an explicit signers list are
    // marked external (not to be signed).
    signers = [];
  }

  const wireTxn: PeraWalletTransaction = {
    txn: bytesToBase64(algosdk.encodeUnsignedTransaction(transaction.txn))
  };

  if (Array.isArray(signers)) {
    wireTxn.signers = signers;
  }
  if (transaction.authAddr) {
    wireTxn.authAddr = transaction.authAddr;
  }
  if (transaction.message) {
    wireTxn.message = transaction.message;
  }
  if (transaction.msig) {
    wireTxn.msig = transaction.msig;
  }

  return wireTxn;
};

/** ARC-0025: the whole ARC-0001 group array in the first positional slot. */
export const buildSignTxnParams = (
  groups: SignerTransaction[][],
  signerAddress?: string
): [PeraWalletTransaction[]] => [
  groups.flat().map((transaction) => composeWalletTransaction(transaction, signerAddress))
];

export interface LegacySignDataWireItem {
  data: string;
  message: string;
  signer: string;
  chainId: number;
}

export const buildLegacySignDataParams = (
  data: PeraWalletArbitraryData[],
  signer: string,
  chainId: number
): LegacySignDataWireItem[] =>
  data.map((item) => ({
    data: bytesToBase64(item.data),
    message: item.message,
    signer,
    chainId
  }));

/** ARC-60 goes over `algo_signData` as a single object, never an array; the
 *  mobile app discriminates on `Array.isArray(params)`. */
export const buildArc60WireParams = (
  payload: PeraWalletArc60SignData,
  metadata: SignMetadata
): Record<string, unknown> => {
  const dataBase64 =
    Buffer.isEncoding(metadata.encoding) && metadata.encoding !== "base64"
      ? Buffer.from(payload.data, metadata.encoding).toString("base64")
      : payload.data;

  const wireParams: Record<string, unknown> = {
    data: dataBase64,
    signer: algosdk.encodeAddress(payload.signer),
    domain: payload.domain,
    authenticatorData: bytesToBase64(payload.authenticatorData),
    metadata: {scope: metadata.scope, encoding: "base64"}
  };

  if (payload.requestId !== undefined) {
    wireParams.requestId = payload.requestId;
  }
  if (payload.hdPath !== undefined) {
    wireParams.hdPath = payload.hdPath;
  }

  return wireParams;
};

export const buildArc60SignDataResponse = (
  payload: PeraWalletArc60SignData,
  signature: Uint8Array
): PeraWalletArc60SignDataResponse => ({
  data: payload.data,
  signer: payload.signer,
  domain: payload.domain,
  authenticatorData: payload.authenticatorData,
  ...(payload.requestId !== undefined && {requestId: payload.requestId}),
  ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
  signature
});

/** Slot-ordered wallet results to bytes. Null slots (txns the wallet was told
 *  not to sign) are dropped, exactly as connect's `MobileTransport` does. */
export const decodeSignedResults = (result: unknown): Uint8Array[] => {
  const items = Array.isArray(result) ? result : [result];

  return items
    .filter((item) => item !== null && item !== undefined)
    .map((item) => {
      if (typeof item === "string") {
        return base64ToBytes(item);
      }
      if (Array.isArray(item) && item.every((n) => typeof n === "number")) {
        return Uint8Array.from(item as number[]);
      }
      throw new Error(`Unexpected wallet result item: ${JSON.stringify(item)}`);
    });
};
