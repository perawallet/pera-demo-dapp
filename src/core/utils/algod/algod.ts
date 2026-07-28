import algosdk from "algosdk";

import {ChainType, getNetworkConfig} from "./networks";

/** Cached by credentials rather than by ChainType, so editing the custom
 *  endpoint produces a new client instead of reusing a stale one. */
const clientCache = new Map<string, algosdk.Algodv2>();

const clientForChain = (chain: ChainType): algosdk.Algodv2 => {
  const {algod} = getNetworkConfig(chain);
  const cacheKey = `${algod.token}|${algod.baseServer}|${algod.port}`;
  const cached = clientCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const client = new algosdk.Algodv2(algod.token, algod.baseServer, algod.port);

  clientCache.set(cacheKey, client);

  return client;
};

const apiGetTxnParams = async (chain: ChainType): Promise<algosdk.SuggestedParams> => {
  const params = await clientForChain(chain).getTransactionParams().do();

  return params;
};

export {ChainType, clientForChain, apiGetTxnParams};
