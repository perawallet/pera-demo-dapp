import {ChainType} from "../core/utils/algod/algod";
import {getNetworkConfig} from "../core/utils/algod/networks";
import type {Network} from "./types";

/** Keyed on ChainType, not on the scenario network, so BetaNet / LocalNet /
 *  Custom do not share owned-asset state just because they share a scenario
 *  set. MainNet and TestNet keys are unchanged, because those ChainType values
 *  serialise to the same strings as before. */
const storageKey = (chain: ChainType, address: string) =>
  `pera-demo:owned-asset:${chain}:${address}`;

/** Which scenario set this network gets. Do NOT use this for storage keys. */
export const scenarioNetworkForChain = (chain: ChainType): Network =>
  getNetworkConfig(chain).scenarioNetwork;

export const getOwnedAsset = (chain: ChainType, address: string): number | null => {
  const raw = localStorage.getItem(storageKey(chain, address));

  if (raw === null) return null;

  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const setOwnedAsset = (
  chain: ChainType,
  address: string,
  assetId: number
): void => {
  localStorage.setItem(storageKey(chain, address), String(assetId));
};

export const clearOwnedAsset = (chain: ChainType, address: string): void => {
  localStorage.removeItem(storageKey(chain, address));
};

/** Drop every owned-asset record for the Custom network. Called when the custom
 *  endpoint changes, so a stale asset id from a previous node is not reused. */
export const clearCustomNetworkOwnedAssets = (): void => {
  const prefix = `pera-demo:owned-asset:${ChainType.Custom}:`;
  const staleKeys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));

  staleKeys.forEach((key) => localStorage.removeItem(key));
};
