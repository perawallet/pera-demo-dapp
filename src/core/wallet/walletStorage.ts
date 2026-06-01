import type { CommsProtocol } from "./types";
import { DEFAULT_LIQUID_AUTH_URL } from "../liquid-auth/constants";

const PROTOCOL_KEY = "CommsProtocol";
const LIQUID_URL_KEY = "LiquidAuth.ServerUrl";

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
