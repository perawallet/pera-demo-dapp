import algosdk from "algosdk";

export type EmptySignatureType = "sig" | "msig" | "lsig" | "pqsig" | "unknown";

export interface EmptySignatureDescription {
  type: EmptySignatureType;
  /** The auth address of a rekeyed account (`sgnr`), or null. */
  authAddr: string | null;
}

const TYPE_LABELS: Record<EmptySignatureType, string> = {
  sig: "ed25519",
  msig: "multisig",
  lsig: "logic sig",
  pqsig: "post-quantum",
  unknown: "unknown"
};

const UNKNOWN: EmptySignatureDescription = {type: "unknown", authAddr: null};

/** Head and tail of an address, enough to tell accounts apart in the log. */
const ADDRESS_HEAD = 6;
const ADDRESS_TAIL = 4;

const shortAddress = (address: string): string =>
  `${address.slice(0, ADDRESS_HEAD)}…${address.slice(-ADDRESS_TAIL)}`;

/** Reads use-wallet's empty signature: base64 of a msgpack `SignedTransaction`
 *  without `txn`. The signature field it carries is the account type (none at
 *  all for ed25519), and `sgnr` is the auth address of a rekeyed account. */
export const describeEmptySignature = (value: string): EmptySignatureDescription => {
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    const fields = algosdk.msgpackRawDecode(bytes);

    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      return UNKNOWN;
    }

    const record = fields as Record<string, unknown>;
    const type = (["pqsig", "lsig", "msig"] as const).find((key) => key in record) ?? "sig";
    const authAddr = record.sgnr instanceof Uint8Array ? algosdk.encodeAddress(record.sgnr) : null;

    return {type, authAddr};
  } catch {
    return UNKNOWN;
  }
};

/** One log line for the connected accounts. An account the wallet left out
 *  is unknown, which simulates as a single ed25519 key. */
export const summarizeEmptySignatures = (
  emptySignatures: Record<string, string>,
  accounts: string[]
): string => {
  const addresses = accounts.length > 0 ? accounts : Object.keys(emptySignatures);

  if (addresses.length === 0) {
    return "Empty signatures: the wallet returned none.";
  }

  const parts = addresses.map((address) => {
    const value = emptySignatures[address];

    if (value === undefined) {
      return `${shortAddress(address)} unknown (not returned)`;
    }

    const {type, authAddr} = describeEmptySignature(value);
    const rekey = authAddr ? `, rekeyed to ${shortAddress(authAddr)}` : "";

    return `${shortAddress(address)} ${TYPE_LABELS[type]}${rekey}`;
  });

  return `Empty signatures: ${parts.join("; ")}`;
};
