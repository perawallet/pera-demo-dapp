import algosdk from "algosdk";

import {describeEmptySignature, summarizeEmptySignatures} from "./emptySignature";

const encode = (fields: Record<string, unknown>): string =>
  Buffer.from(algosdk.msgpackRawEncode(fields)).toString("base64");

const account = algosdk.generateAccount();
const other = algosdk.generateAccount();
const ADDRESS = account.addr.toString();
const OTHER = other.addr.toString();

describe("describeEmptySignature", () => {
  it("reads the empty map as an ed25519 account that isn't rekeyed", () => {
    expect(describeEmptySignature("gA==")).toEqual({type: "sig", authAddr: null});
  });

  it("names a multisig account", () => {
    const value = encode({msig: {v: 1, thr: 1, subsig: [{pk: account.addr.publicKey}]}});

    expect(describeEmptySignature(value)).toEqual({type: "msig", authAddr: null});
  });

  it("names a logic sig account", () => {
    expect(describeEmptySignature(encode({lsig: {l: new Uint8Array([1])}}))).toEqual({
      type: "lsig",
      authAddr: null
    });
  });

  it("names a post-quantum account", () => {
    expect(describeEmptySignature(encode({pqsig: {sch: 1, pk: new Uint8Array([1])}}))).toEqual({
      type: "pqsig",
      authAddr: null
    });
  });

  it("reports the auth address of a rekeyed account", () => {
    expect(describeEmptySignature(encode({sgnr: other.addr.publicKey}))).toEqual({
      type: "sig",
      authAddr: OTHER
    });
  });

  it("reports anything it can't decode as unknown", () => {
    expect(describeEmptySignature("not base64!")).toEqual({type: "unknown", authAddr: null});
  });
});

describe("summarizeEmptySignatures", () => {
  it("describes every connected account, including the ones the wallet left out", () => {
    const summary = summarizeEmptySignatures(
      {[ADDRESS]: encode({pqsig: {sch: 1}, sgnr: other.addr.publicKey})},
      [ADDRESS, OTHER]
    );

    expect(summary).toBe(
      `Empty signatures: ${ADDRESS.slice(0, 6)}…${ADDRESS.slice(-4)} post-quantum, rekeyed to ` +
        `${OTHER.slice(0, 6)}…${OTHER.slice(-4)}; ${OTHER.slice(0, 6)}…${OTHER.slice(-4)} unknown (not returned)`
    );
  });

  it("says so when the wallet returned nothing", () => {
    expect(summarizeEmptySignatures({}, [])).toBe("Empty signatures: the wallet returned none.");
  });
});
