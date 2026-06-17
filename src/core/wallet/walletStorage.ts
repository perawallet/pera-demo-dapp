import type { CommsProtocol } from "./types";
import { DEFAULT_LIQUID_AUTH_URL } from "../liquid-auth/constants";
import type { LiquidAuthOfferMode } from "../liquid-auth/negotiate";

const PROTOCOL_KEY = "CommsProtocol";
const LIQUID_URL_KEY = "LiquidAuth.ServerUrl";
const LIQUID_OFFER_KEY = "LiquidAuth.OfferMode";

const VALID_OFFER_MODES: LiquidAuthOfferMode[] = [
  "arc0027",
  "arc0027-walletconnect",
  "walletconnect"
];

export const getCommsProtocol = (): CommsProtocol => {
  const stored = localStorage.getItem(PROTOCOL_KEY);
  return stored === "liquid-auth" ? "liquid-auth" : "walletconnect";
};

export const setCommsProtocol = (protocol: CommsProtocol): void => {
  localStorage.setItem(PROTOCOL_KEY, protocol);
};

export const getLiquidAuthUrl = (): string =>
  localStorage.getItem(LIQUID_URL_KEY) || DEFAULT_LIQUID_AUTH_URL;

export const setLiquidAuthUrl = (url: string): void => {
  localStorage.setItem(LIQUID_URL_KEY, url);
};

/** Which protocols the dApp advertises in its negotiation offer. */
export const getLiquidAuthOffer = (): LiquidAuthOfferMode => {
  const stored = localStorage.getItem(LIQUID_OFFER_KEY) as LiquidAuthOfferMode | null;
  return stored && VALID_OFFER_MODES.includes(stored) ? stored : "arc0027";
};

export const setLiquidAuthOffer = (mode: LiquidAuthOfferMode): void => {
  localStorage.setItem(LIQUID_OFFER_KEY, mode);
};
