import algosdk from "algosdk";
import { decode as cborDecode } from "cbor-x";
import { fromBase64Url, toBase64URL } from "./arc0027";
import { LiquidAuthConnector } from "./LiquidAuthConnector";

const makeFakeClient = () => {
  const calls: { messageId: string; frame: string }[] = [];
  let nextResult: Record<string, unknown> = {};
  return {
    calls,
    setResult: (r: Record<string, unknown>) => { nextResult = r; },
    connect: jest.fn(async (onQr: (i: any) => void) => { onQr({ requestId: "r", deepLink: "liquid://x" }); return ["ADDR"]; }),
    request: jest.fn(async (messageId: string, frame: string) => { calls.push({ messageId, frame }); return nextResult; }),
    onClose: jest.fn(),
    close: jest.fn()
  };
};

const makePaymentTxn = (sender: string) =>
  algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    suggestedParams: { fee: 1000, firstValid: 1, lastValid: 10, genesisHash: new Uint8Array(32), genesisID: "testnet-v1.0", minFee: 1000 } as any
  });

describe("LiquidAuthConnector", () => {
  const ADDR = algosdk.generateAccount().addr.toString();

  it("protocol is liquid-auth and arbitrary-data is unsupported", () => {
    const c = new LiquidAuthConnector(makeFakeClient() as any);
    expect(c.protocol).toBe("liquid-auth");
    expect(c.supports("txn")).toBe(true);
    expect(c.supports("arc60")).toBe(true);
    expect(c.supports("arbitrary-data")).toBe(false);
  });

  it("signTransaction flattens groups, sends sign_transactions, and filters null stxns", async () => {
    const fake = makeFakeClient();
    const c = new LiquidAuthConnector(fake as any);
    await c.connect();

    const txnA = makePaymentTxn(ADDR);
    const txnB = makePaymentTxn(ADDR);
    const signedBytes = new Uint8Array([7, 7, 7]);
    fake.setResult({ stxns: [toBase64URL(signedBytes), null] });

    const groups = [[{ txn: txnA }, { txn: txnB, signers: [] }]] as any;
    const result = await c.signTransaction(groups);

    const env = cborDecode(fromBase64Url(fake.calls[0].frame)) as any;
    expect(env.reference).toBe("arc0027:sign_transactions:request");
    expect(env.params.txns).toHaveLength(2);
    expect(env.params.txns[1].signers).toEqual([]);

    expect(result).toHaveLength(1);
    expect(Array.from(result[0])).toEqual([7, 7, 7]);
  });

  it("signArc60Data sends sign_message and decodes the base64 signature", async () => {
    const fake = makeFakeClient();
    const c = new LiquidAuthConnector(fake as any);
    await c.connect();
    fake.setResult({ signature: "AQID" }); // base64 of [1,2,3]

    const payload = {
      data: new Uint8Array([1]),
      signer: ADDR,
      domain: "example.com",
      authenticatorData: new Uint8Array(32),
      requestId: "req",
      metadata: { scope: 1, encoding: "base64" }
    } as any;
    const sig = await c.signArc60Data(payload);

    const env = cborDecode(fromBase64Url(fake.calls[0].frame)) as any;
    expect(env.reference).toBe("arc0027:sign_message:request");
    expect(Array.from(sig)).toEqual([1, 2, 3]);
  });
});
