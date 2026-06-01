// src/core/liquid-auth/arc0027.ts
import { encode as cborEncode, decode as cborDecode } from "cbor-x";

export interface MultisigMetadata {
  version: number;
  threshold: number;
  addrs: string[];
}

/** ARC-0001 wallet transaction (matches @algorandfoundation/provider's
 *  IARC0001Transaction; inlined because that package is unpublished). */
export interface IARC0001Transaction {
  authAddr?: string;
  msig?: MultisigMetadata;
  signers?: string[];
  stxn?: string;
  txn: string;
}

export interface Arc0027ResponseEnvelope {
  id: string;
  reference: string;
  requestId: string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Bytes → base64url (no padding). Copied verbatim from @algorandfoundation/provider
 *  so the wire bytes match what the wallet decodes. */
export const toBase64URL = (arr: Uint8Array | ArrayBuffer): string => {
  const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  const len = bytes.length;
  let base64 = "";
  for (let i = 0; i < len; i += 3) {
    base64 += B64URL_CHARS[bytes[i] >> 2];
    base64 += B64URL_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += B64URL_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += B64URL_CHARS[bytes[i + 2] & 63];
  }
  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1);
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2);
  }
  return base64;
};

/** base64url (or standard base64) → bytes. Tolerates +/ and whitespace. */
export const fromBase64Url = (base64url: string): Uint8Array =>
  new Uint8Array(
    atob(base64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""))
      .split("")
      .map((c) => c.charCodeAt(0))
  );

/** Standard base64 (NOT base64url) — the ARC-60 sign_message params require it. */
const toStandardBase64 = (bytes: Uint8Array): string => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

/** Decode an inbound data-channel text frame. Returns null for heartbeats
 *  (empty) and for any frame that isn't a valid cbor+base64(url) envelope. */
export const decodeFrame = (raw: string): unknown => {
  if (!raw || raw.trim() === "") return null;
  try {
    return cborDecode(fromBase64Url(raw));
  } catch {
    return null;
  }
};

const uuidv4 = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/** Build the ARC-0027 `sign_transactions` request frame (replaces
 *  @algorandfoundation/provider's toSignTransactionsParamsRequestMessage). */
export const buildSignTransactionsRequest = (
  messageId: string,
  providerId: string,
  txns: IARC0001Transaction[]
): string =>
  toBase64URL(
    cborEncode({
      id: messageId,
      reference: "arc0027:sign_transactions:request",
      params: { providerId, txns }
    })
  );

export interface SignMessageRequestInput {
  data: Uint8Array;
  signer: string;
  domain: string;
  authenticatorData: Uint8Array;
  requestId?: string;
  scope: number;
  encoding: string;
}

/** Build the ARC-0027 `sign_message` (ARC-60) request frame by hand.
 *  Binary fields are standard-base64 strings per the wallet's arc60PayloadSchema. */
export const buildSignMessageRequest = (
  input: SignMessageRequestInput
): { messageId: string; frame: string } => {
  const messageId = uuidv4();
  const envelope = {
    id: messageId,
    reference: "arc0027:sign_message:request",
    params: {
      data: toStandardBase64(input.data),
      signer: input.signer,
      domain: input.domain,
      authenticatorData: toStandardBase64(input.authenticatorData),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      metadata: { scope: input.scope, encoding: input.encoding }
    }
  };
  return { messageId, frame: toBase64URL(cborEncode(envelope)) };
};

const ERROR_MESSAGES: Record<number, string> = {
  4000: "The wallet reported an unknown error.",
  4001: "Request rejected in the wallet.",
  4002: "The wallet timed out.",
  4003: "Not supported by the wallet.",
  4004: "Network not supported by the wallet.",
  4100: "The wallet is not authorized to sign for this account.",
  4200: "The wallet rejected the request as invalid input.",
  4201: "Invalid group id.",
  4300: "The wallet failed to post some transactions."
};

export const arc0027ErrorMessage = (error: { code: number; message: string }): string =>
  ERROR_MESSAGES[error.code] || error.message || "Liquid Auth request failed.";

/** Thrown by the connector when the wallet returns an ARC-0027 error frame. */
export class Arc0027Error extends Error {
  code: number;
  constructor(error: { code: number; message: string }) {
    super(arc0027ErrorMessage(error));
    this.code = error.code;
    this.name = "Arc0027Error";
  }
}
