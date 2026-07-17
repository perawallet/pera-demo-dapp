import { ChainType } from "../core/utils/algod/algod";
import type { Network } from "./types";

const storageKey = (network: Network, address: string) =>
  `pera-demo:owned-asset:${network}:${address}`;

export const networkForChain = (chain: ChainType): Network =>
  chain === ChainType.MainNet ? "mainnet" : "testnet";

export const getOwnedAsset = (network: Network, address: string): number | null => {
  const raw = localStorage.getItem(storageKey(network, address));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const setOwnedAsset = (network: Network, address: string, assetId: number): void => {
  localStorage.setItem(storageKey(network, address), String(assetId));
};

export const clearOwnedAsset = (network: Network, address: string): void => {
  localStorage.removeItem(storageKey(network, address));
};
