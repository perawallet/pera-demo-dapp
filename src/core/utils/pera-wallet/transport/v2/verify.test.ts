import algosdk from "algosdk";
import nacl from "tweetnacl";
import {sha256} from "js-sha256";

import {verifyArc60Signature, verifyLegacySignature} from "./verify";

const account = algosdk.generateAccount();
const address = account.addr.toString();

describe("verifyLegacySignature", () => {
  it("accepts a signature produced by algosdk.signBytes (MX prefix)", () => {
    const data = new Uint8Array([1, 2, 3]);
    const signature = algosdk.signBytes(data, account.sk);

    expect(verifyLegacySignature(data, signature, address)).toBe(true);
  });

  it("rejects a tampered message and a wrong signer", () => {
    const data = new Uint8Array([1, 2, 3]);
    const signature = algosdk.signBytes(data, account.sk);
    const other = algosdk.generateAccount().addr.toString();

    expect(verifyLegacySignature(new Uint8Array([1, 2, 4]), signature, address)).toBe(false);
    expect(verifyLegacySignature(data, signature, other)).toBe(false);
  });

  it("returns false instead of throwing on a malformed address", () => {
    expect(verifyLegacySignature(new Uint8Array([1]), new Uint8Array(64), "not-an-address")).toBe(false);
  });
});

describe("verifyArc60Signature", () => {
  const data = Buffer.from("{\"domain\":\"example.com\"}");
  const authenticatorData = new Uint8Array(sha256.array("example.com"));
  const message = new Uint8Array([...sha256.array(data), ...sha256.array(authenticatorData)]);

  it("accepts ed25519 over sha256(data) || sha256(authenticatorData)", () => {
    const signature = nacl.sign.detached(message, account.sk);

    expect(verifyArc60Signature(data, authenticatorData, signature, address)).toBe(true);
  });

  it("rejects a raw signature over data (no hashing)", () => {
    // `new Uint8Array(data)` (not `data` directly): this project's jsdom test
    // environment (jest-environment-jsdom@27.5.1 under Node 22) gives `Buffer`
    // instances that fail tweetnacl's own `instanceof Uint8Array` guard, since
    // jsdom's vm context has its own Uint8Array realm distinct from Node's
    // Buffer. Rebuilding as a plain Uint8Array sidesteps that realm mismatch
    // without changing what this test asserts.
    const signature = nacl.sign.detached(new Uint8Array(data), account.sk);

    expect(verifyArc60Signature(data, authenticatorData, signature, address)).toBe(false);
  });

  it("rejects a wrong signer", () => {
    const signature = nacl.sign.detached(message, account.sk);
    const other = algosdk.generateAccount().addr.toString();

    expect(verifyArc60Signature(data, authenticatorData, signature, other)).toBe(false);
  });
});
