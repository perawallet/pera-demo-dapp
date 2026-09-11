export type WcV2ErrorType =
  | "MISSING_PROJECT_ID"
  | "UNSUPPORTED_NETWORK"
  | "MODAL_CLOSED"
  | "NOT_CONNECTED"
  | "NO_PAIRING_URI"
  | "NO_SIGNATURE"
  | "REQUEST_FAILED"
  | "SIGN_DATA_DOMAIN_MISMATCH"
  | "SIGN_DATA_VERIFICATION_FAILED";

export class WcV2Error extends Error {
  readonly type: WcV2ErrorType;
  /** JSON-RPC error code, when the wallet or relay supplied one. */
  readonly code?: number;

  constructor(type: WcV2ErrorType, message: string, code?: number) {
    super(message);
    this.name = "WcV2Error";
    this.type = type;
    this.code = code;
  }
}

export const isWcV2Error = (error: unknown, type?: WcV2ErrorType): error is WcV2Error =>
  error instanceof WcV2Error && (type === undefined || error.type === type);
