import { encode as cborEncode } from "cbor-x";
import {
  decodeFrame,
  toBase64URL,
  fromBase64Url,
  buildSignTransactionsRequest,
  buildSignMessageRequest,
  arc0027ErrorMessage
} from "./arc0027";

describe("arc0027 helpers", () => {
  it("base64url round-trips bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    expect(Array.from(fromBase64Url(toBase64URL(bytes)))).toEqual([1, 2, 3, 4, 5]);
  });

  it("decodeFrame returns null for empty heartbeat frames", () => {
    expect(decodeFrame("")).toBeNull();
    expect(decodeFrame("   ")).toBeNull();
  });

  it("decodeFrame round-trips a cbor+base64url envelope", () => {
    const env = { id: "x", reference: "arc0027:sign_transactions:response", requestId: "r", result: { stxns: ["AAA"] } };
    const frame = toBase64URL(cborEncode(env));
    expect(decodeFrame(frame)).toEqual(env);
  });

  it("decodeFrame returns null for an unparseable frame", () => {
    expect(decodeFrame("!!!not-cbor!!!")).toBeNull();
  });

  it("buildSignTransactionsRequest builds a decodable sign_transactions:request", () => {
    const txns = [{ txn: "AAA" }, { txn: "BBB", signers: [] }];
    const frame = buildSignTransactionsRequest("msg-1", "prov", txns);
    const decoded = decodeFrame(frame) as any;
    expect(decoded.id).toBe("msg-1");
    expect(decoded.reference).toBe("arc0027:sign_transactions:request");
    expect(decoded.params.providerId).toBe("prov");
    expect(decoded.params.txns).toEqual(txns);
  });

  it("buildSignMessageRequest produces a decodable sign_message:request with standard-base64 binary fields", () => {
    const { messageId, frame } = buildSignMessageRequest({
      data: new Uint8Array([1, 2, 3]),
      signer: "ADDR",
      domain: "example.com",
      authenticatorData: new Uint8Array([4, 5, 6]),
      requestId: "req-1",
      scope: 1,
      encoding: "base64"
    });
    const decoded = decodeFrame(frame) as any;
    expect(typeof messageId).toBe("string");
    expect(decoded.id).toBe(messageId);
    expect(decoded.reference).toBe("arc0027:sign_message:request");
    expect(decoded.params.data).toBe("AQID"); // standard base64 of [1,2,3]
    expect(decoded.params.authenticatorData).toBe("BAUG"); // base64 of [4,5,6]
    expect(decoded.params.signer).toBe("ADDR");
    expect(decoded.params.domain).toBe("example.com");
    expect(decoded.params.requestId).toBe("req-1");
    expect(decoded.params.metadata).toEqual({ scope: 1, encoding: "base64" });
  });

  it("arc0027ErrorMessage maps known codes", () => {
    expect(arc0027ErrorMessage({ code: 4001, message: "x" })).toMatch(/rejected/i);
    expect(arc0027ErrorMessage({ code: 4003, message: "x" })).toMatch(/not supported/i);
    expect(arc0027ErrorMessage({ code: 9999, message: "boom" })).toBe("boom");
  });
});
