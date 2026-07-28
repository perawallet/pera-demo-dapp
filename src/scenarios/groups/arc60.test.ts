// src/scenarios/groups/arc60.test.ts
// jsdom (jest 27) lacks TextEncoder, crypto.subtle, and crypto.randomUUID —
// polyfill from Node before importing the module under test.
import { TextEncoder, TextDecoder } from "util";
import { webcrypto } from "crypto";

Object.assign(globalThis, { TextEncoder, TextDecoder });
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

jest.mock(
  "@perawallet/connect",
  () => ({ __esModule: true, ScopeType: { AUTH: "auth" } }),
  { virtual: true }
);

import algosdk from "algosdk";

import { buildArc60Payload } from "./arc60";
import { testAccounts } from "../test-accounts";

// Must be a real address: buildArc60Payload runs it through
// algosdk.decodeAddress, which rejects anything failing the checksum.
const SIGNER = testAccounts[0].addr.toString();
// `signer` in the returned payload is the decoded 32-byte public key, not the
// address string.
const SIGNER_PUBLIC_KEY = algosdk.decodeAddress(SIGNER).publicKey;

const decodeSiwa = (payload: { data: string }) =>
  JSON.parse(Buffer.from(payload.data, "base64").toString());

describe("buildArc60Payload overrides", () => {
  it("defaults: chain 283, version 1, signer == account_address", async () => {
    const payload = await buildArc60Payload({ signerAddress: SIGNER });
    const siwa = decodeSiwa(payload);
    expect(siwa.chain_id).toBe("283");
    expect(siwa.version).toBe("1");
    expect(siwa.account_address).toBe(SIGNER);
    expect(payload.signer).toEqual(SIGNER_PUBLIC_KEY);
    expect(siwa.nonce).toBeTruthy();
  });

  it("overrides chain_id", async () => {
    const siwa = decodeSiwa(
      await buildArc60Payload({ signerAddress: SIGNER, chainId: "999" })
    );
    expect(siwa.chain_id).toBe("999");
  });

  it("overrides account_address independently of signer", async () => {
    const payload = await buildArc60Payload({
      signerAddress: SIGNER,
      accountAddressOverride: "OTHERADDRESS"
    });
    expect(decodeSiwa(payload).account_address).toBe("OTHERADDRESS");
    expect(payload.signer).toEqual(SIGNER_PUBLIC_KEY);
  });

  it("overrides version and issued-at", async () => {
    const siwa = decodeSiwa(
      await buildArc60Payload({
        signerAddress: SIGNER,
        version: "2",
        issuedAt: "2030-01-01T00:00:00.000Z"
      })
    );
    expect(siwa.version).toBe("2");
    expect(siwa["issued-at"]).toBe("2030-01-01T00:00:00.000Z");
  });

  it("omits named fields to break the schema", async () => {
    const siwa = decodeSiwa(
      await buildArc60Payload({
        signerAddress: SIGNER,
        omitFields: ["domain", "type"]
      })
    );
    expect(siwa.domain).toBeUndefined();
    expect(siwa.type).toBeUndefined();
    expect(siwa.statement).toBeTruthy();
  });
});
