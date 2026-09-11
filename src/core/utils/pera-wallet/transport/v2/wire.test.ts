import algosdk from "algosdk";
import type {PeraWalletArc60SignData} from "@perawallet/connect";

import {
  buildArc60SignDataResponse,
  buildArc60WireParams,
  buildLegacySignDataParams,
  buildSignTxnParams,
  composeWalletTransaction,
  decodeSignedResults
} from "./wire";

const A = algosdk.generateAccount();
const B = algosdk.generateAccount();

const params: algosdk.SuggestedParams = {
  fee: 1000,
  minFee: 1000,
  flatFee: true,
  firstValid: 1,
  lastValid: 1000,
  genesisID: "testnet-v1.0",
  genesisHash: algosdk.base64ToBytes("SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
};

const makePay = () =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: A.addr,
    receiver: B.addr,
    amount: 1,
    suggestedParams: params
  });

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

describe("algo_signTxn params", () => {
  it("base64-encodes the unsigned txn and omits optional fields when absent", () => {
    const txn = makePay();

    expect(composeWalletTransaction({txn})).toEqual({
      txn: b64(algosdk.encodeUnsignedTransaction(txn))
    });
  });

  it("copies an explicit signers list, including an empty one", () => {
    const txn = makePay();

    expect(composeWalletTransaction({txn, signers: [A.addr.toString()]}).signers).toEqual([
      A.addr.toString()
    ]);
    expect(composeWalletTransaction({txn, signers: []}).signers).toEqual([]);
  });

  it("marks txns without a signers list as external when a signerAddress is given", () => {
    const txn = makePay();

    expect(composeWalletTransaction({txn}, B.addr.toString()).signers).toEqual([]);
  });

  it("passes authAddr, message and msig through", () => {
    const txn = makePay();
    const msig = {version: 1, threshold: 1, addrs: [A.addr.toString(), B.addr.toString()]};

    expect(
      composeWalletTransaction({txn, authAddr: B.addr.toString(), message: "hi", msig})
    ).toMatchObject({authAddr: B.addr.toString(), message: "hi", msig});
  });

  it("flattens groups into one positional array, matching the v1 wire", () => {
    const t1 = makePay();
    const t2 = makePay();
    const t3 = makePay();

    const result = buildSignTxnParams([[{txn: t1}, {txn: t2}], [{txn: t3}]]);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
    expect(result[0][2].txn).toBe(b64(algosdk.encodeUnsignedTransaction(t3)));
  });
});

describe("algo_signData params", () => {
  it("builds the legacy array form with base64 data, signer and numeric chainId", () => {
    const result = buildLegacySignDataParams(
      [{data: new Uint8Array([1, 2, 3]), message: "why"}],
      A.addr.toString(),
      416002
    );

    expect(result).toEqual([
      {data: "AQID", message: "why", signer: A.addr.toString(), chainId: 416002}
    ]);
  });

  it("builds the ARC-60 single-object form", () => {
    const payload: PeraWalletArc60SignData = {
      data: Buffer.from("hello").toString("base64"),
      signer: algosdk.decodeAddress(A.addr.toString()).publicKey,
      domain: "example.com",
      authenticatorData: new Uint8Array([7, 7]),
      requestId: "r1"
    };

    const result = buildArc60WireParams(payload, {scope: 1, encoding: "base64"});

    expect(result).toEqual({
      data: Buffer.from("hello").toString("base64"),
      signer: A.addr.toString(),
      domain: "example.com",
      authenticatorData: "Bwc=",
      metadata: {scope: 1, encoding: "base64"},
      requestId: "r1"
    });
    expect(Array.isArray(result)).toBe(false);
  });

  it("re-encodes non-base64 data to base64 on the wire", () => {
    const payload: PeraWalletArc60SignData = {
      data: "hello",
      signer: algosdk.decodeAddress(A.addr.toString()).publicKey,
      domain: "example.com",
      authenticatorData: new Uint8Array([7, 7])
    };

    const result = buildArc60WireParams(payload, {scope: 1, encoding: "utf8"});

    expect(result.data).toBe(Buffer.from("hello").toString("base64"));
    expect(result).not.toHaveProperty("requestId");
  });

  it("builds the ARC-60 response from the payload and signature", () => {
    const payload: PeraWalletArc60SignData = {
      data: "ZGF0YQ==",
      signer: new Uint8Array(32),
      domain: "example.com",
      authenticatorData: new Uint8Array([1]),
      hdPath: "m/44'"
    };
    const signature = new Uint8Array([9, 9]);

    expect(buildArc60SignDataResponse(payload, signature)).toEqual({
      data: "ZGF0YQ==",
      signer: payload.signer,
      domain: "example.com",
      authenticatorData: payload.authenticatorData,
      hdPath: "m/44'",
      signature
    });
  });
});

describe("result decoding", () => {
  it("decodes base64 strings and drops null slots", () => {
    expect(decodeSignedResults(["AQID", null, "BA=="])).toEqual([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4])
    ]);
  });

  it("accepts number arrays", () => {
    expect(decodeSignedResults([[1, 2], undefined, [3]])).toEqual([
      new Uint8Array([1, 2]),
      new Uint8Array([3])
    ]);
  });

  it("wraps a single non-array result", () => {
    expect(decodeSignedResults("AQ==")).toEqual([new Uint8Array([1])]);
  });

  it("throws on a shape it cannot decode", () => {
    expect(() => decodeSignedResults([{bad: true}])).toThrow(/Unexpected/);
  });
});
