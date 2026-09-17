import {resolveArc60SignerForChain, type Arc60SignerResolution} from "./arc60Signer";
import {ChainType} from "../algod/algod";

// Real addresses (valid checksums). Nothing here decodes them — the lookup is
// a mock — but the SDK's own resolveArc60Signer rejects malformed input with
// SIGN_DATA_INVALID_ADDRESS, so keep the fixtures honest.
const ACCOUNT = "3JRC5TKDQZGJM5WJJX7UBZU6VIZQ5VNPKYP7ZB5RNQERV2YU4KWDFUKF6E";
const AUTH_ADDR = "Z2GMDWJDQ3NF5SNPB5T2PTEFKXE4JAOHCDTEIDYBNYWOM45JF3YD6Z3RQE";

const resolution = (
  over: Partial<Arc60SignerResolution> = {}
): Arc60SignerResolution => ({
  signerAddress: ACCOUNT,
  signer: new Uint8Array([1, 2, 3]),
  isRekeyed: false,
  ...over
});

describe("resolveArc60SignerForChain", () => {
  it("resolves on TestNet, where the pinned chain ID matches the wallet's network", async () => {
    const lookup = jest.fn(async () => resolution());

    const outcome = await resolveArc60SignerForChain(ChainType.TestNet, ACCOUNT, lookup);

    expect(lookup).toHaveBeenCalledWith(ACCOUNT);
    expect(outcome).toEqual({status: "resolved", resolution: resolution()});
  });

  it("resolves on MainNet", async () => {
    const lookup = jest.fn(async () => resolution());

    const outcome = await resolveArc60SignerForChain(ChainType.MainNet, ACCOUNT, lookup);

    expect(outcome.status).toBe("resolved");
  });

  it("hands back the auth address for a rekeyed account", async () => {
    const rekeyed = resolution({signerAddress: AUTH_ADDR, isRekeyed: true});
    const lookup = jest.fn(async () => rekeyed);

    const outcome = await resolveArc60SignerForChain(ChainType.TestNet, ACCOUNT, lookup);

    expect(outcome).toEqual({status: "resolved", resolution: rekeyed});
  });

  // LocalNet and Custom sign under the all-networks chain ID 4160, so connect
  // has no network to read the rekey on and the SDK would throw
  // SIGN_DATA_NETWORK_REQUIRED. Skipping keeps the rest of the ARC-60 scenarios
  // usable there instead of failing every one of them.
  it.each([
    [ChainType.LocalNet, "LocalNet"],
    [ChainType.Custom, "Custom"],
    [ChainType.BetaNet, "BetaNet"]
  ])("reports %s unavailable without calling the lookup", async (chain, label) => {
    const lookup = jest.fn(async () => resolution());

    const outcome = await resolveArc60SignerForChain(chain, ACCOUNT, lookup);

    expect(lookup).not.toHaveBeenCalled();
    expect(outcome.status).toBe("unavailable");
    if (outcome.status === "unavailable") {
      expect(outcome.reason).toContain(label);
    }
  });

  it("lets a lookup failure propagate rather than assuming the account is not rekeyed", async () => {
    const lookup = jest.fn(async () => {
      throw new Error("SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED");
    });

    await expect(
      resolveArc60SignerForChain(ChainType.TestNet, ACCOUNT, lookup)
    ).rejects.toThrow("SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED");
  });
});
