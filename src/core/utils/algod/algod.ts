import algosdk from "algosdk";

export enum ChainType {
  MainNet = "mainnet",
  TestNet = "testnet"
}

const mainNetClient = new algosdk.Algodv2(
  process.env.REACT_APP_ALGOSDK_TOKEN!,
  process.env.REACT_APP_ALGOSDK_SERVER_MAINNET,
  Number(process.env.REACT_APP_ALGOSDK_PORT)
);
const testNetClient = new algosdk.Algodv2(
  process.env.REACT_APP_ALGOSDK_TOKEN!,
  process.env.REACT_APP_ALGOSDK_SERVER_TESTNET,
  Number(process.env.REACT_APP_ALGOSDK_PORT)
);

function clientForChain(chain: ChainType): algosdk.Algodv2 {
  switch (chain) {
    case ChainType.MainNet:
      return mainNetClient;
    case ChainType.TestNet:
      return testNetClient;
    default:
      throw new Error(`Unknown chain type: ${chain}`);
  }
}

async function apiGetTxnParams(chain: ChainType): Promise<algosdk.SuggestedParams> {
  const params = await clientForChain(chain).getTransactionParams().do();

  return params;
}

export {clientForChain, apiGetTxnParams};
