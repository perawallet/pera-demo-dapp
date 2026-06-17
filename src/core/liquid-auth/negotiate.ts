// src/core/liquid-auth/negotiate.ts
// dApp (proposer) side of the Liquid Auth protocol-negotiation handshake.
// The dApp sends a JSON `liquidauth:negotiate:offer` as the first data-channel
// frame, then waits for the wallet's `liquidauth:negotiate:select`. See the
// wallet's PROTOCOL.md for the wire contract. Negotiation frames are JSON (they
// start with `{`); ARC-0027 frames are base64(CBOR) and never start with `{`,
// so the two are disjoint on the wire.
import { uuidv4 } from "./arc0027";

/** Frozen forever — the negotiation envelope must stay parseable by every peer. */
export const HANDSHAKE_VERSION = 1;
export const LIQUID_AUTH_VERSION = "1.0";

export type OfferProtocolId = "arc0027" | "walletconnect";

/** Which protocols the dApp advertises in its offer (selectable in the UI). */
export type LiquidAuthOfferMode = "arc0027" | "arc0027-walletconnect" | "walletconnect";

export interface OfferProtocol {
  id: OfferProtocolId;
  versions: string[];
}

/** Self-asserted dApp metadata. Untrusted by the wallet on its own. */
export interface PeerIdentity {
  name: string;
  url?: string;
  origin?: string;
  icon?: string;
  description?: string;
}

export interface NegotiationConfig {
  protocols: OfferProtocol[];
  peer: PeerIdentity;
}

const PROTOCOL_VERSIONS: Record<OfferProtocolId, string[]> = {
  arc0027: ["1.0"],
  walletconnect: ["2.0"]
};

/** Maps the selected UI mode to the protocols advertised in the offer. */
export const offerProtocolsForMode = (mode: LiquidAuthOfferMode): OfferProtocol[] => {
  switch (mode) {
    case "arc0027":
      return [{id: "arc0027", versions: PROTOCOL_VERSIONS.arc0027}];
    case "arc0027-walletconnect":
      return [
        {id: "arc0027", versions: PROTOCOL_VERSIONS.arc0027},
        {id: "walletconnect", versions: PROTOCOL_VERSIONS.walletconnect}
      ];
    case "walletconnect":
      return [{id: "walletconnect", versions: PROTOCOL_VERSIONS.walletconnect}];
  }
};

/** Build the JSON `liquidauth:negotiate:offer` frame. Returns the offer id so
 *  the caller can match it against the wallet's `select.requestId`. */
export const buildNegotiateOffer = (
  config: NegotiationConfig
): {id: string; frame: string} => {
  const id = uuidv4();
  const frame = JSON.stringify({
    id,
    reference: "liquidauth:negotiate:offer",
    params: {
      handshakeVersion: HANDSHAKE_VERSION,
      liquidAuthVersion: LIQUID_AUTH_VERSION,
      protocols: config.protocols,
      peer: config.peer
    }
  });
  return {id, frame};
};

export interface SelectResult {
  requestId: string;
  protocol?: {id: string; version: string};
  error?: {code: number; message?: string};
}

/** Parse a `liquidauth:negotiate:select` reply. Returns null for any frame that
 *  isn't a select (e.g. base64(CBOR) ARC-0027 frames, heartbeats, other JSON). */
export const parseSelectFrame = (raw: string): SelectResult | null => {
  let parsed: {reference?: unknown; requestId?: unknown; result?: {protocol?: {id: string; version: string}}; error?: {code: number; message?: string}};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !parsed ||
    parsed.reference !== "liquidauth:negotiate:select" ||
    typeof parsed.requestId !== "string"
  ) {
    return null;
  }
  return {
    requestId: parsed.requestId,
    protocol: parsed.result?.protocol,
    error: parsed.error
  };
};

/* eslint-disable no-magic-numbers */
const NEGOTIATION_ERROR_MESSAGES: Record<number, string> = {
  5000: "The wallet supports none of the offered protocols.",
  5001: "The wallet does not support this negotiation handshake version.",
  5002: "The wallet rejected the negotiation offer as malformed."
};
/* eslint-enable no-magic-numbers */

/** Thrown when the wallet returns a negotiation error select, or selects a
 *  protocol this dApp does not implement. */
export class NegotiationError extends Error {
  code: number;
  constructor(error: {code: number; message?: string}) {
    super(
      NEGOTIATION_ERROR_MESSAGES[error.code] || error.message || "Protocol negotiation failed."
    );
    this.code = error.code;
    this.name = "NegotiationError";
  }
}
