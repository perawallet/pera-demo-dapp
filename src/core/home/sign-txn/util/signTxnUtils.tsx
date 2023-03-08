/* eslint-disable */
import algosdk, {SuggestedParams} from "algosdk";
import {apiGetTxnParams, ChainType} from "../../../utils/algod/algod";

const testAccounts = [
  algosdk.mnemonicToSecretKey(
    "cannon scatter chest item way pulp seminar diesel width tooth enforce fire rug mushroom tube sustain glide apple radar chronic ask plastic brown ability badge"
  ),
  algosdk.mnemonicToSecretKey(
    "person congress dragon morning road sweet horror famous bomb engine eager silent home slam civil type melt field dry daring wheel monitor custom above term"
  ),
  algosdk.mnemonicToSecretKey(
    "faint protect home drink journey humble tube clinic game rough conduct sell violin discover limit lottery anger baby leaf mountain peasant rude scene abstract casual"
  )
];

export function signTxnWithTestAccount(txn: algosdk.Transaction): Uint8Array {
  const sender = algosdk.encodeAddress(txn.from.publicKey);

  for (const testAccount of testAccounts) {
    if (testAccount.addr === sender) {
      return txn.signTxn(testAccount.sk);
    }
  }

  throw new Error(`Cannot sign transaction from unknown test account: ${sender}`);
}

export interface IScenarioTxn {
  txn: algosdk.Transaction;
  signers?: string[];
  authAddr?: string;
  message?: string;
}

export type ScenarioReturnType = {
  transaction: IScenarioTxn[][];
  transactionTimeout?: number;
};

export type Scenario = (chain: ChainType, address: string) => Promise<ScenarioReturnType>;

export enum AssetTransactionType {
  Transfer = "asset-transfer",
  OptIn = "asset-opt-in",
  Close = "asset-close"
}

function getAssetIndex(chain: ChainType, type: AssetTransactionType): number {
  if (chain === ChainType.MainNet) {
    if (type === AssetTransactionType.Transfer) {
      return 604; // IanCoin
    } else if (type === AssetTransactionType.Close) {
      return 672; // RotemCoin
    } else {
      return 312769; // Tether USDt
    }
  }

  if (type === AssetTransactionType.Transfer) {
    return 11711; // HipoCoin
  } else if (type === AssetTransactionType.Close) {
    return 180132; // testasset2
  } else {
    return 135270; // Turkish Lira
  }
}

function getAppIndex(chain: ChainType): number {
  if (chain === ChainType.MainNet) {
    return 305162725;
  }

  if (chain === ChainType.TestNet) {
    return 22314999;
  }

  throw new Error(`App not defined for chain ${chain}`);
}

const createAssetOptInTxn = async (
  chain: ChainType,
  address: string,
  assetIndex: number
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singlePayTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];
  return {
    transaction: [txnsToSign]
  };
};

const singlePayTxnWithClose: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const txnsToSign = [{txn}];
  return {
    transaction: [txnsToSign]
  };
};

const singlePayTxnWithRekey: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singlePayTxnWithRekeyAndClose: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singlePayTxnWithInvalidAuthAddress: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [
    {txn, message: "This is a transaction message", authAddr: "INVALID_ADDRESS"}
  ];

  return {
    transaction: [txnsToSign]
  };
};

const singleAssetOptInTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAssetOptInTxnToInvalidAsset: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = 100;

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAssetTransferTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAssetTransferTxnWithClose: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];

  return {
    transaction: [txnsToSign]
  };
};

const singleInvalidAssetTransferTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = 100; // Invalid asset id

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppOptIn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCall: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCallNoArgs: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCallWithRekey: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCloseOut: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationCloseOutTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppClearState: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationClearStateTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCreate: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const approvalProgram = Uint8Array.from([4, 129, 1, 67]);
  const clearProgram = Uint8Array.from([3, 129, 1, 67]);

  const txn = algosdk.makeApplicationCreateTxnFromObject({
    from: address,
    approvalProgram,
    clearProgram,
    numGlobalInts: 1,
    numGlobalByteSlices: 2,
    numLocalInts: 3,
    numLocalByteSlices: 4,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppCreateExtraPage: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const approvalProgram = Uint8Array.from([4, 129, 1, 67]);
  const clearProgram = Uint8Array.from([3, 129, 1, 67]);

  const txn = algosdk.makeApplicationCreateTxnFromObject({
    from: address,
    approvalProgram,
    clearProgram,
    numGlobalInts: 1,
    numGlobalByteSlices: 2,
    numLocalInts: 3,
    numLocalByteSlices: 4,
    extraPages: 1,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppUpdate: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const approvalProgram = Uint8Array.from([4, 129, 1, 67]);
  const clearProgram = Uint8Array.from([3, 129, 1, 67]);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationUpdateTxnFromObject({
    from: address,
    appIndex,
    approvalProgram,
    clearProgram,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const singleAppDelete: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const sign1FromGroupTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 1000000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn: txn1}, {txn: txn2, signers: []}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const sign2FromGroupTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 1000000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 500000,
    note: new Uint8Array(Buffer.from("this is a payment txn")),
    suggestedParams
  });

  const txnsToSign = [
    {txn: txn1},
    {txn: txn2, signers: []},
    {txn: txn3, message: "This is a transaction message"}
  ];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signGroupWithPayOptinTransfer: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 500000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn: txn1}, {txn: txn2}, {txn: txn3}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signGroupWithPayRekey: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 500000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 500000,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [{txn: txn1}, {txn: txn2, message: "This is a transaction message"}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signTxnWithAssetClose: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
  const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex: closeAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const txnsToSign = [{txn: txn1}, {txn: txn2}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signTxnWithRekey: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [{txn: txn1, message: "This is a transaction message"}, {txn: txn2}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signTxnWithRekeyAndAssetClose: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);
  const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    assetIndex,
    amount: 10,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 20,
    assetIndex: closeAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 30,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txn4 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 40,
    assetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [
    {txn: txn1, message: "This is a transaction message"},
    {txn: txn2},
    {txn: txn3},
    {txn: txn4, message: "This is a transaction message"}
  ];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const signGroupOf7: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);

  const optIn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const assetXfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const assetClose = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50,
    assetIndex: closeAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 500000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const accountClose = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 0,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    suggestedParams
  });

  const accountRekey = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const accountRekeyAndClose = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 50000,
    note: new Uint8Array(Buffer.from("example note value")),
    closeRemainderTo: testAccounts[1].addr,
    rekeyTo: testAccounts[2].addr,
    suggestedParams
  });

  const txnsToSign = [
    {txn: optIn},
    {txn: assetXfer},
    {txn: assetClose},
    {txn: payment},
    {txn: accountClose},
    {txn: accountRekey},
    {txn: accountRekeyAndClose}
  ];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const fullTxnGroup: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txnsToSign: Array<{txn: algosdk.Transaction; signers?: [string]}> = [];

  for (let i = 0; i < 8; i++) {
    const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

    const optIn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: address,
      to: address,
      amount: 0,
      assetIndex,
      note: new Uint8Array(Buffer.from("example note value")),
      suggestedParams
    });

    const closeOut = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: address,
      to: address,
      amount: 0,
      assetIndex,
      note: new Uint8Array(Buffer.from("example note value")),
      closeRemainderTo: testAccounts[1].addr,
      suggestedParams
    });

    txnsToSign.push({txn: optIn});
    txnsToSign.push({txn: closeOut});
  }

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  return {
    transaction: [txnsToSign]
  };
};

const multipleNonAtomicTxns: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const group1 = [{txn: txn1}];

  const group2 = [{txn: txn2, message: "This is a transaction message"}];

  const group3 = [{txn: txn3}];

  return {
    transaction: [group1, group2, group3]
  };
};

const multipleNonAtomicTxnsForOnlyAssets: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 10000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 30000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const group1 = [{txn: txn1}];

  const group2 = [{txn: txn2}];

  const group3 = [{txn: txn3, message: "This is a transaction message"}];

  return {
    transaction: [group1, group2, group3]
  };
};

const multipleNonAtomicTxnsMixed: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 10000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const group1 = [{txn: txn1}];

  const group2 = [{txn: txn2}];

  const group3 = [{txn: txn3}];

  return {
    transaction: [group1, group2, group3]
  };
};

const atomicGroupAndNonAtomicTxnsForOnlyPayment: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("txn 4")),
    suggestedParams
  });

  const group1 = [
    {txn: txn1, message: "This is a transaction message"},
    {txn: txn2, message: "This is a transaction message"}
  ];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}];

  const group3 = [{txn: txn4}];

  return {
    transaction: [group1, group2, group3]
  };
};

const atomicGroupAndNonAtomicTxnsMixed: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 10000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("txn 4")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3, message: "This is a transaction message"}];

  const group3 = [{txn: txn4}];

  return {
    transaction: [group1, group2, group3]
  };
};

const multipleAtomicGroupsForOnlyPayment: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100003,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 1")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}, {txn: txn4}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const multipleAtomicGroupsForOnlyAssets: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 10000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn4 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 2000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2, signers: []}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}, {txn: txn4, signers: []}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const multipleAtomicGroupsWithInvalidAsset: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const invalidAssetIndex = 100;

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 2000,
    assetIndex: invalidAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });
  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100003,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 1")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}, {txn: txn4}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const multipleAtomicGroupsMixed1: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 10000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2, signers: []}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}, {txn: txn4}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const multipleAtomicGroupsMixed2: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);
  const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
  const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 2000,
    assetIndex: transferAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn4 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: optInAssetIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const group1 = [{txn: txn1}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3, signers: []}, {txn: txn4}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const multipleAtomicGroupSignOnly2: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100004,
    note: new Uint8Array(Buffer.from("txn 4")),
    suggestedParams
  });

  const group1 = [{txn: txn1, signers: []}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3, signers: []}, {txn: txn4}];
  algosdk.assignGroupID(group2.map((toSign) => toSign.txn));

  return {
    transaction: [group1, group2]
  };
};

const atomicGroupAndNonAtomicTxnsSignOnly2: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100001,
    note: new Uint8Array(Buffer.from("atomic group 1 txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("atomic group 2 txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const group1 = [{txn: txn1, signers: []}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  const group2 = [{txn: txn3}];

  return {
    transaction: [group1, group2]
  };
};

const atomicNoSignTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100002,
    note: new Uint8Array(Buffer.from("txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const group1 = [
    {txn: txn1, signers: []},
    {txn: txn2, signers: []},
    {txn: txn3, signers: []}
  ];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  return {
    transaction: [group1]
  };
};

const atomicAndSingleNoSignTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn 1")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100002,
    note: new Uint8Array(Buffer.from("txn 2")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100003,
    note: new Uint8Array(Buffer.from("txn 3")),
    suggestedParams
  });

  const group1 = [{txn: txn1}];

  const group2 = [{txn: txn2, message: "This is a transaction message"}];

  const group3 = [{txn: txn3, signers: []}];

  return {
    transaction: [group1, group2, group3]
  };
};

const txnWithLargeNote: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("max length note (512)" + "!".repeat(491))),
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];
  return {
    transaction: [txnsToSign]
  };
};

const assetCreateTxnMaxInfoAndRekey: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: address,
    decimals: 2,
    defaultFrozen: false,
    total: BigInt("0xffffffffffffffff"),
    assetName: "Example asset",
    unitName: "EX",
    assetURL: "https://example.com",
    assetMetadataHash: new Uint8Array(
      Buffer.from(
        "59fc007607ccc82d96f016857aaa697c545002d18045e49324696f12b7be8f45",
        "hex"
      )
    ),
    manager: address,
    reserve: testAccounts[0].addr,
    clawback: testAccounts[1].addr,
    freeze: testAccounts[2].addr,
    note: new Uint8Array(Buffer.from("example note value")),
    rekeyTo: testAccounts[1].addr,
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];
  return {
    transaction: [txnsToSign]
  };
};

const assetCreateTxnMinInfo: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: address,
    decimals: 0,
    defaultFrozen: false,
    total: 1,
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];
  return {
    transaction: [txnsToSign]
  };
};

const assetReconfigTxnResetAll: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    from: address,
    assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
    clawback: address,
    freeze: testAccounts[0].addr,
    manager: testAccounts[1].addr,
    reserve: testAccounts[2].addr,
    strictEmptyAddressChecking: true,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];
  return {
    transaction: [txnsToSign]
  };
};

const assetReconfigTxnClearAll: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    from: address,
    assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
    strictEmptyAddressChecking: false,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];

  return {
    transaction: [txnsToSign]
  };
};

const assetDeleteTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
    from: address,
    assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];

  return {
    transaction: [txnsToSign]
  };
};

const zeroFeeTxnGroup: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn with 0 fee")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100001,
    note: new Uint8Array(Buffer.from("txn with double fee")),
    suggestedParams
  });

  txn2.fee += txn1.fee;
  txn1.fee = 0;

  const group1 = [{txn: txn1, signers: []}, {txn: txn2}];
  algosdk.assignGroupID(group1.map((toSign) => toSign.txn));

  return {
    transaction: [group1]
  };
};

const maxNumberOfTxns: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [];

  const numGroups = 4; // 64 / 16
  for (let i = 0; i < numGroups; i++) {
    const group: Array<{txn: algosdk.Transaction}> = [];
    for (let j = 0; j < 16; j++) {
      group.push({
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: testAccounts[0].addr,
          amount: 0,
          note: new Uint8Array(Buffer.from(`No ${i * 16 + j + 1} of 64`)),
          suggestedParams
        })
      });
    }

    algosdk.assignGroupID(group.map((toSign) => toSign.txn));
    groups.push(group);
  }

  return {
    transaction: groups
  };
};

const tooManyTxns: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [];

  const numGroups = 4; // 64 / 16
  for (let i = 0; i < numGroups; i++) {
    const group: Array<{txn: algosdk.Transaction}> = [];
    for (let j = 0; j < 16; j++) {
      group.push({
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: testAccounts[0].addr,
          amount: 0,
          note: new Uint8Array(Buffer.from(`No ${i * 16 + j + 1} of 65`)),
          suggestedParams
        })
      });
    }

    algosdk.assignGroupID(group.map((toSign) => toSign.txn));
    groups.push(group);
  }

  // one more!
  groups.push([
    {
      txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: address,
        to: testAccounts[0].addr,
        amount: 0,
        note: new Uint8Array(Buffer.from(`No 65 of 65`)),
        suggestedParams
      })
    }
  ]);

  return {
    transaction: groups
  };
};

const futureTransaction: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const minutes = prompt("Please enter minutes for future transaction: ");
  const exactDate = new Date().getTime();
  const futureTrxDate = exactDate + Number(minutes) * 60000;

  const differenceInSeconds = Math.round((futureTrxDate - exactDate) / 1000);
  const blockRound = Math.abs(Math.round(differenceInSeconds / 4));

  const firstRoundFuture = suggestedParams.firstRound + blockRound;
  const lastRoundFuture = firstRoundFuture + 1000;

  const newSuggestedParams: SuggestedParams = {
    fee: suggestedParams.fee,
    firstRound: firstRoundFuture,
    lastRound: lastRoundFuture,
    genesisHash: suggestedParams.genesisHash,
    genesisID: suggestedParams.genesisID
  };

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("Example future transaction")),
    suggestedParams: newSuggestedParams
  });

  const txnsToSign = [{txn, message: "This is a transaction message"}];

  return {
    transaction: [txnsToSign],
    transactionTimeout: differenceInSeconds * 1000
  };
};

const invalidGroupingIssue: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn3 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn4 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txn5 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: testAccounts[0].addr,
    to: address,
    amount: 1000000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn: txn1}, {txn: txn2}, {txn: txn3}, {txn: txn4}, {txn: txn5}];

  algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));

  txnsToSign.pop();

  return {
    transaction: [txnsToSign]
  };
};

const appCallWithBoxes: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const appIndex = getAppIndex(chain);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: address,
    appIndex,
    note: new Uint8Array(Buffer.from("example note value")),
    appArgs: [],
    suggestedParams,
    boxes: [{appIndex: appIndex, name: Uint8Array.from([0])}]
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

const invalidAuthAddress: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [
    {txn, message: "This is a transaction message", authAddr: "INVALID_ADDRESS"}
  ];

  return {
    transaction: [txnsToSign]
  };
};

const validAuthAddress: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [
    {txn, message: "This is a transaction message", authAddr: testAccounts[1].addr}
  ];

  return {
    transaction: [txnsToSign]
  };
};

const invalidSignerAddress: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [
    {txn, message: "This is a transaction message", signers: ["INVALID_ADDRESS"]}
  ];

  return {
    transaction: [txnsToSign]
  };
};

const validSignerAddress: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 100000,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [
    {txn, message: "This is a transaction message", signers: [testAccounts[1].addr]}
  ];

  return {
    transaction: [txnsToSign]
  };
};

const swapAlgoToUSDC: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: 31566704,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "NGIHJMECRSFHIEQDHBVTLR54K7DOZWM5M6UM3A5CIOYSP6H3QTGSHHGJCQ",
          amount: 5000000,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 605929989,
          appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
          suggestedParams
        })
      }
    ]
  ];

  groups[2][0].txn.fee = 2000;

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const swapAlgoToGoETH: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: 386195940,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "6NXX7RGJFLEI3HEQEZXDP73SMQKAPWS4N7CEQJ4IEVONUWYWJLT4NM5QQM",
          amount: 3000000,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 607660059,
          appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
          suggestedParams
        })
      }
    ]
  ];

  groups[2][0].txn.fee = 2000;

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const depositAlgoFF: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "AV6PFVXWDQ7RVNQYOEXCWXCLXVJ5V57WVMVQZ2TWH4EKTB7GSWKUIAUPXQ",
          amount: 2000000,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 686498781,
          appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
          suggestedParams
        })
      }
    ]
  ];

  groups[1][0].txn.fee = 3000;

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const poolAlgoUsdcFF: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: 919950894,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: "KIW56KLIBX5UMWS5RT346TNA4HRV5H445S2LMQLRCR73SOHRVSM5TZBQ4A",
          amount: 1160825,
          assetIndex: 31566704,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "KIW56KLIBX5UMWS5RT346TNA4HRV5H445S2LMQLRCR73SOHRVSM5TZBQ4A",
          amount: 3977452,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_1"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_2"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_3"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_4"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_5"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_6"))],
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeApplicationNoOpTxnFromObject({
          from: address,
          appIndex: 919954173,
          appArgs: [new Uint8Array(Buffer.from("pool_step_7"))],
          suggestedParams
        })
      }
    ]
  ];

  groups[3][0].txn.fee = 29000;

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const authAlgoGems: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          note: new Uint8Array(Buffer.from("challenge/1449301/gems")),
          suggestedParams
        })
      }
    ]
  ];

  return {
    transaction: groups
  };
};

const buyNFTAlgogems: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: 886237574,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: "N4EJ2ZFGWCEL4PVTCJSLD7RC4WVIUNO57V7LW2FQY7DFOP4EEN4XYC5UEM",
          to: address,
          amount: 1,
          assetIndex: 886237574,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "RJASLRMECMQL66PH2KLMFSCYMOOBOK7KRX3XMAWDKDB2PQ5J3U5FMPAJNE",
          amount: 3600000,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "VWZBFLBUN6O5A5W6IWHMDUVP5NH2LPV4ZYFMAHP4FQBBYP627MP6WPOEG4",
          amount: 400000,
          suggestedParams
        })
      }
    ]
  ];

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const buyNFTAlgoxNFT: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const groups: Array<Array<{txn: algosdk.Transaction}>> = [
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: 865021507,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: "CATN6JYGMBZF4OAQBXZTGALLB3X3XUUU6CQAKXUPNKVOC32VNTRWK25HD4",
          to: address,
          amount: 1,
          assetIndex: 865021507,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "BSKX6GSPTSY2KKXBO5L367OBY5SJT6GD25FV3RY25VLOGCMORQ6COPCOXY",
          amount: 196900,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "ANGEL3CMT7TEXSBJR3DCTJTZCQFOF6FJB6PDKU4IOAMTNPXGR7XUYKOU5Y",
          amount: 18803950,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "XNFT36FUCFRR6CK675FW4BEBCCCOJ4HOSMGCN6J2W6ZMB34KM2ENTNQCP4",
          amount: 689150,
          suggestedParams
        })
      }
    ],
    [
      {
        txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: address,
          to: "CATN6JYGMBZF4OAQBXZTGALLB3X3XUUU6CQAKXUPNKVOC32VNTRWK25HD4",
          amount: 1000,
          suggestedParams
        })
      }
    ]
  ];

  // Assign Group ID
  groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

  return {
    transaction: groups
  };
};

const singleZoneTransferTxn: Scenario = async (
  chain: ChainType,
  address: string
): Promise<ScenarioReturnType> => {
  const suggestedParams = await apiGetTxnParams(chain);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: testAccounts[0].addr,
    amount: 1000000,
    assetIndex: 444035862,
    note: new Uint8Array(Buffer.from("example note value")),
    suggestedParams
  });

  const txnsToSign = [{txn}];

  return {
    transaction: [txnsToSign]
  };
};

export const mainnetScenarios: Array<{name: string; scenario: Scenario}> = [
  {
    name: "1. Swap Algo to USDC (algofi)",
    scenario: swapAlgoToUSDC
  },
  {
    name: "2. Swap Algo to GoETH (algofi)",
    scenario: swapAlgoToGoETH
  },
  {
    name: "3. Deposit Algo (folksfinance)",
    scenario: depositAlgoFF
  },
  {
    name: "4. Pool ALGO-USDC (folksfinance)",
    scenario: poolAlgoUsdcFF
  },
  {
    name: "5. Auth (algogems)",
    scenario: authAlgoGems
  },
  {
    name: "6. Buy NFT (algogems)",
    scenario: buyNFTAlgogems
  },
  {
    name: "7. Buy NFT (algoxnft)",
    scenario: buyNFTAlgoxNFT
  },
  {
    name: "8. Zone Transfer",
    scenario: singleZoneTransferTxn
  }
];

export const scenarios: Array<{name: string; scenario: Scenario}> = [
  {
    name: "1. Sign single pay txn",
    scenario: singlePayTxn
  },
  {
    name: "2. Sign single pay txn with close",
    scenario: singlePayTxnWithClose
  },
  {
    name: "3. Sign single pay txn with rekey",
    scenario: singlePayTxnWithRekey
  },
  {
    name: "4. Sign single pay txn with rekey and close",
    scenario: singlePayTxnWithRekeyAndClose
  },
  {
    name: "5. Single pay txn with invalid auth address",
    scenario: singlePayTxnWithInvalidAuthAddress
  },
  {
    name: "6. Sign single asset opt-in txn",
    scenario: singleAssetOptInTxn
  },
  {
    name: "7. Sign single asset opt-in txn with invalid asset id",
    scenario: singleAssetOptInTxnToInvalidAsset
  },
  {
    name: "8. Sign single asset transfer txn",
    scenario: singleAssetTransferTxn
  },
  {
    name: "9. Sign single asset transfer txn with close",
    scenario: singleAssetTransferTxnWithClose
  },
  {
    name: "10. Sign single asset transfer txn with invalid asset id",
    scenario: singleInvalidAssetTransferTxn
  },
  {
    name: "11. Sign single app opt-in txn",
    scenario: singleAppOptIn
  },
  {
    name: "12. Sign single app call txn",
    scenario: singleAppCall
  },
  {
    name: "13. Sign single app call txn with rekey",
    scenario: singleAppCallWithRekey
  },
  {
    name: "14. Sign single app close out txn",
    scenario: singleAppCloseOut
  },
  {
    name: "15. Sign 1 of 2 txns from a group",
    scenario: sign1FromGroupTxn
  },
  {
    name: "16. Sign 2 of 3 txns from a group",
    scenario: sign2FromGroupTxn
  },
  {
    name: "17. Sign txn group with pay, asset opt-in, and asset transfer",
    scenario: signGroupWithPayOptinTransfer
  },
  {
    name: "18. Sign txn group with pay and rekey",
    scenario: signGroupWithPayRekey
  },
  {
    name: "19. Sign txn group with asset close",
    scenario: signTxnWithAssetClose
  },
  {
    name: "20. Sign txn group with rekey",
    scenario: signTxnWithRekey
  },
  {
    name: "21. Sign txn group with rekey and asset close",
    scenario: signTxnWithRekeyAndAssetClose
  },
  {
    name: "22. Sign group of 7",
    scenario: signGroupOf7
  },
  {
    name: "23. Full txn group",
    scenario: fullTxnGroup
  },
  {
    name: "24. Sign multiple non-atomic txns",
    scenario: multipleNonAtomicTxns
  },
  {
    name: "25. Sign multiple non-atomic txns for only assets",
    scenario: multipleNonAtomicTxnsForOnlyAssets
  },
  {
    name: "26. Sign mixed multiple non-atomic txns",
    scenario: multipleNonAtomicTxnsMixed
  },
  {
    name: "27. Sign atomic txn group and non-atomic txns for only payment",
    scenario: atomicGroupAndNonAtomicTxnsForOnlyPayment
  },
  {
    name: "28. Sign mixed atomic txn group and non-atomic txns",
    scenario: atomicGroupAndNonAtomicTxnsMixed
  },
  {
    name: "29. Sign multiple atomic txn groups for only payment",
    scenario: multipleAtomicGroupsForOnlyPayment
  },
  {
    name: "30. Sign multiple atomic txn groups for only assets",
    scenario: multipleAtomicGroupsForOnlyAssets
  },
  {
    name: "31. Sign multiple atomic txn groups with invalid asset",
    scenario: multipleAtomicGroupsWithInvalidAsset
  },
  {
    name: "32. Sign first mixed 2 atomic txn groups",
    scenario: multipleAtomicGroupsMixed1
  },
  {
    name: "33. Sign second mixed 2 atomic txn groups",
    scenario: multipleAtomicGroupsMixed2
  },
  {
    name: "34. Sign only 2 txns in multiple atomic txn groups",
    scenario: multipleAtomicGroupSignOnly2
  },
  {
    name: "35. Sign only 2 txns in atomic txn group and non-atomic txns",
    scenario: atomicGroupAndNonAtomicTxnsSignOnly2
  },
  {
    name: "36. Atomic group with no sig needed (invalid)",
    scenario: atomicNoSignTxn
  },
  {
    name: "37. Atomic group and single txn with no sig needed (invalid)",
    scenario: atomicAndSingleNoSignTxn
  },
  {
    name: "38. Txn with large note",
    scenario: txnWithLargeNote
  },
  {
    name: "39. Sign single app clear state txn",
    scenario: singleAppClearState
  },
  {
    name: "40. Sign single app create txn",
    scenario: singleAppCreate
  },
  {
    name: "41. Sign single app update txn",
    scenario: singleAppUpdate
  },
  {
    name: "42. Sign single app delete txn",
    scenario: singleAppDelete
  },
  {
    name: "43. Sign single app call with no args",
    scenario: singleAppCallNoArgs
  },
  {
    name: "44. Sign single app create txn with extra page (not working with ledger app v1.2.15)",
    scenario: singleAppCreateExtraPage
  },
  {
    name: "45. Sign asset create + rekey txn",
    scenario: assetCreateTxnMaxInfoAndRekey
  },
  {
    name: "46. Sign asset create txn with minimal info",
    scenario: assetCreateTxnMinInfo
  },
  {
    name: "47. Sign asset reconfig txn",
    scenario: assetReconfigTxnResetAll
  },
  {
    name: "48. Sign asset reconfig txn clear all",
    scenario: assetReconfigTxnClearAll
  },
  {
    name: "49. Sign asset delete txn",
    scenario: assetDeleteTxn
  },
  {
    name: "50. Sign txn group with 0 fee",
    scenario: zeroFeeTxnGroup
  },
  {
    name: "51. Sign 64 transactions",
    scenario: maxNumberOfTxns
  },
  {
    name: "52. Sign 65 transactions",
    scenario: tooManyTxns
  },
  {
    name: "53. Future transaction",
    scenario: futureTransaction
  },
  {
    name: "54. Invalid Grouping issue",
    scenario: invalidGroupingIssue
  },
  {
    name: "55. Application txn with boxes",
    scenario: appCallWithBoxes
  },
  {
    name: "56. Invalid auth address",
    scenario: invalidAuthAddress
  },
  {
    name: "57. Valid auth address",
    scenario: validAuthAddress
  },
  {
    name: "58. Invalid signers",
    scenario: invalidSignerAddress
  },
  {
    name: "59. Valid signers",
    scenario: validSignerAddress
  }
];

export {createAssetOptInTxn};
