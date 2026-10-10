import {isValidAddress} from "algosdk";

import type {
  AssetTransactionType,
  PeraTransactionType
} from "../../../transaction/transactionTypes";

/** Every field the Create Transaction dialog collects. Numeric on-chain values
 *  that can exceed `Number.MAX_SAFE_INTEGER` are held as strings so the form
 *  never silently rounds a uint64 the user typed. */
export interface TxnForm {
  address: string;
  toAddress: string;
  amount: string;
  note: string;
  assetIndex: string;
  rekeyTo: string;
  closeTo: string;
  transactionAmount: number;

  // keyreg
  voteKey?: string;
  selectionKey?: string;
  stateProofKey?: string;
  voteFirst?: number;
  voteLast?: number;
  voteKeyDilution?: number;
  isOnlineKeyregTxn?: boolean;

  // acfg
  assetTxnType?: AssetTransactionType;
  unitName?: string;
  assetName?: string;
  defaultFrozen?: boolean;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  assetURL?: string;
  total?: string;
  decimals?: number;

  // afrz
  freezeTarget?: string;
  frozen?: boolean;
}

export type TxnFieldErrors = Partial<Record<keyof TxnForm, string>>;

export const UINT64_MAX = 18446744073709551615n;

/** Protocol limits on asset parameters. A transaction that breaks one of these
 *  builds without complaint in algosdk and is then rejected by the node, so the
 *  form has to catch them before the user signs. */
export const ASA_UNIT_NAME_MAX_BYTES = 8;
export const ASA_ASSET_NAME_MAX_BYTES = 32;
export const ASA_URL_MAX_BYTES = 96;
export const ASA_MAX_DECIMALS = 19;

export const NOTE_MAX_BYTES = 1024;

/** Base64 encodes 3 bytes into 4 characters, with up to 2 padding characters. */
const BASE64_GROUP_CHARS = 4;
const BASE64_GROUP_BYTES = 3;
const BASE64_MAX_PADDING = 2;

/** Asset indexes and asset totals both start at 1. */
const MIN_ASSET_INDEX = 1n;
const MIN_ASSET_TOTAL = 1n;

const VOTE_KEY_BYTES = 32;
const SELECTION_KEY_BYTES = 32;
const STATE_PROOF_KEY_BYTES = 64;

const ADDRESS_INVALID = "Not a valid Algorand address";
const REQUIRED = "Required";

export const emptyTxnForm = (address: string): TxnForm => ({
  address,
  toAddress: "",
  amount: "",
  note: "",
  assetIndex: "",
  rekeyTo: "",
  closeTo: "",
  transactionAmount: 1,
  assetTxnType: "create"
});

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** Blank means "leave this field off the transaction", which is what the
 *  protocol expects for an unset manager, rekey target or close-to. Passing the
 *  empty string to algosdk instead throws a malformed-address error. */
export const optionalAddress = (value?: string): string | undefined => {
  const trimmed = (value ?? "").trim();

  return trimmed === "" ? undefined : trimmed;
};

/** Strict, unlike `algosdk.base64ToBytes`, which happily decodes junk. Returns
 *  the decoded length without allocating, or undefined if not valid base64. */
const base64ByteLength = (value: string): number | undefined => {
  if (value.length === 0 || value.length % BASE64_GROUP_CHARS !== 0) {
    return undefined;
  }

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    return undefined;
  }

  const padding = value.endsWith("==")
    ? BASE64_MAX_PADDING
    : value.endsWith("=")
      ? 1
      : 0;

  return (value.length / BASE64_GROUP_CHARS) * BASE64_GROUP_BYTES - padding;
};

/** Parses a decimal string as a uint64. Returns the value or the reason it is
 *  unusable, never a rounded number. */
export const parseUint64 = (
  raw: string | undefined
): {value?: bigint; error?: string} => {
  const trimmed = (raw ?? "").trim();

  if (trimmed === "") {
    return {error: REQUIRED};
  }

  if (!/^\d+$/.test(trimmed)) {
    return {error: "Must be a whole number"};
  }

  const value = BigInt(trimmed);

  if (value > UINT64_MAX) {
    return {error: `Must be at most ${UINT64_MAX}`};
  }

  return {value};
};

const checkUint64 = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  raw: string | undefined,
  minimum = 0n
) => {
  const {value, error} = parseUint64(raw);

  if (error) {
    errors[key] = error;
    return;
  }

  if (value! < minimum) {
    errors[key] = `Must be at least ${minimum}`;
  }
};

const checkRequiredAddress = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  raw: string | undefined,
  blankMessage = REQUIRED
) => {
  const trimmed = (raw ?? "").trim();

  if (trimmed === "") {
    errors[key] = blankMessage;
    return;
  }

  if (!isValidAddress(trimmed)) {
    errors[key] = ADDRESS_INVALID;
  }
};

/** A blank optional address is fine. A non-blank invalid one is an error rather
 *  than something to quietly drop, so the signed transaction always matches
 *  what the form showed. */
const checkOptionalAddress = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  raw: string | undefined
) => {
  const trimmed = (raw ?? "").trim();

  if (trimmed !== "" && !isValidAddress(trimmed)) {
    errors[key] = ADDRESS_INVALID;
  }
};

const checkByteLimit = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  raw: string | undefined,
  maxBytes: number
) => {
  if (raw && byteLength(raw) > maxBytes) {
    errors[key] = `Must be at most ${maxBytes} bytes`;
  }
};

const checkPositiveInteger = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  value: number | undefined
) => {
  if (value === undefined) {
    errors[key] = REQUIRED;
    return;
  }

  if (!Number.isInteger(value) || value < 1) {
    errors[key] = "Must be at least 1";
  }
};

const checkBase64Key = (
  errors: TxnFieldErrors,
  key: keyof TxnForm,
  raw: string | undefined,
  expectedBytes: number
) => {
  const trimmed = (raw ?? "").trim();

  if (trimmed === "") {
    errors[key] = REQUIRED;
    return;
  }

  if (base64ByteLength(trimmed) !== expectedBytes) {
    errors[key] = `Must decode to ${expectedBytes} bytes of base64`;
  }
};

const validatePay = (form: TxnForm, errors: TxnFieldErrors) => {
  checkRequiredAddress(errors, "toAddress", form.toAddress);
  checkUint64(errors, "amount", form.amount);
  checkOptionalAddress(errors, "rekeyTo", form.rekeyTo);
  checkOptionalAddress(errors, "closeTo", form.closeTo);
};

const validateAxfer = (form: TxnForm, errors: TxnFieldErrors) => {
  checkRequiredAddress(errors, "toAddress", form.toAddress);
  checkPositiveInteger(errors, "transactionAmount", form.transactionAmount);

  // Bulk transfers take their asset IDs from the Pera API, not from the form.
  if (form.transactionAmount <= 1) {
    checkUint64(errors, "assetIndex", form.assetIndex, MIN_ASSET_INDEX);
  }

  checkUint64(errors, "amount", form.amount);
  checkOptionalAddress(errors, "rekeyTo", form.rekeyTo);
  checkOptionalAddress(errors, "closeTo", form.closeTo);
};

const validateKeyreg = (form: TxnForm, errors: TxnFieldErrors) => {
  checkOptionalAddress(errors, "rekeyTo", form.rekeyTo);

  if (!form.isOnlineKeyregTxn) {
    return;
  }

  checkBase64Key(errors, "voteKey", form.voteKey, VOTE_KEY_BYTES);
  checkBase64Key(errors, "selectionKey", form.selectionKey, SELECTION_KEY_BYTES);
  checkBase64Key(errors, "stateProofKey", form.stateProofKey, STATE_PROOF_KEY_BYTES);
  checkPositiveInteger(errors, "voteFirst", form.voteFirst);
  checkPositiveInteger(errors, "voteLast", form.voteLast);
  checkPositiveInteger(errors, "voteKeyDilution", form.voteKeyDilution);

  if (
    !errors.voteFirst &&
    !errors.voteLast &&
    form.voteLast !== undefined &&
    form.voteFirst !== undefined &&
    form.voteLast <= form.voteFirst
  ) {
    errors.voteLast = "Must be greater than vote first";
  }
};

const validateAcfg = (form: TxnForm, errors: TxnFieldErrors) => {
  const assetTxnType: AssetTransactionType = form.assetTxnType ?? "create";

  if (assetTxnType === "create") {
    checkUint64(errors, "total", form.total, MIN_ASSET_TOTAL);

    const decimals = form.decimals ?? 0;

    if (!Number.isInteger(decimals) || decimals < 0 || decimals > ASA_MAX_DECIMALS) {
      errors.decimals = `Must be between 0 and ${ASA_MAX_DECIMALS}`;
    }

    checkByteLimit(errors, "unitName", form.unitName, ASA_UNIT_NAME_MAX_BYTES);
    checkByteLimit(errors, "assetName", form.assetName, ASA_ASSET_NAME_MAX_BYTES);
    checkByteLimit(errors, "assetURL", form.assetURL, ASA_URL_MAX_BYTES);
    checkOptionalAddress(errors, "manager", form.manager);
    checkOptionalAddress(errors, "reserve", form.reserve);
    checkOptionalAddress(errors, "freeze", form.freeze);
    checkOptionalAddress(errors, "clawback", form.clawback);
    return;
  }

  checkUint64(errors, "assetIndex", form.assetIndex, MIN_ASSET_INDEX);

  if (assetTxnType === "modify") {
    checkOptionalAddress(errors, "manager", form.manager);
    checkOptionalAddress(errors, "reserve", form.reserve);
    checkOptionalAddress(errors, "freeze", form.freeze);
    checkOptionalAddress(errors, "clawback", form.clawback);
  }
};

const validateAfrz = (form: TxnForm, errors: TxnFieldErrors) => {
  checkUint64(errors, "assetIndex", form.assetIndex, MIN_ASSET_INDEX);
  checkRequiredAddress(errors, "freezeTarget", form.freezeTarget);
  checkOptionalAddress(errors, "rekeyTo", form.rekeyTo);
};

/** Returns one message per invalid field. An empty object means the form can be
 *  turned into a transaction. */
export const validateTxnForm = (
  form: TxnForm,
  type: PeraTransactionType
): TxnFieldErrors => {
  const errors: TxnFieldErrors = {};

  checkByteLimit(errors, "note", form.note, NOTE_MAX_BYTES);

  checkRequiredAddress(
    errors,
    "address",
    form.address,
    "Connect a wallet to set the sender address"
  );


  switch (type) {
    case "pay":
      validatePay(form, errors);
      break;
    case "axfer":
      validateAxfer(form, errors);
      break;
    case "keyreg":
      validateKeyreg(form, errors);
      break;
    case "acfg":
      validateAcfg(form, errors);
      break;
    case "afrz":
      validateAfrz(form, errors);
      break;
  }

  return errors;
};

/** Decides which of the validation errors the form should actually display.
 *  Errors stay hidden until the user visits a field or tries to submit, so an
 *  untouched form is never pre-filled with complaints. This is what keeps a
 *  freshly reset form quiet after a successful create. */
export const visibleErrors = (
  errors: TxnFieldErrors,
  touched: ReadonlySet<keyof TxnForm>,
  submitAttempted: boolean
): TxnFieldErrors => {
  if (submitAttempted) {
    return {...errors};
  }

  const visible: TxnFieldErrors = {};

  for (const key of Object.keys(errors) as (keyof TxnForm)[]) {
    if (touched.has(key)) {
      visible[key] = errors[key];
    }
  }

  return visible;
};
