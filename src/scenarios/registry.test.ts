// Jest can't resolve @perawallet/connect (ESM exports map), and the registry
// pulls it in via the arc60 group — stub the values the scenarios reference.
jest.mock(
  "@perawallet/connect",
  () => ({__esModule: true, ScopeType: {UNKNOWN: "unknown", AUTH: "auth"}}),
  {virtual: true}
);

import {getAllScenarios, getScenarios} from "./registry";

describe("scenario registry", () => {
  it("has a unique id for every scenario", () => {
    const ids = getAllScenarios().map((s) => s.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
  });

  // Resolution replaces the payload's `signer` with the account's auth
  // address, which would defeat a scenario whose purpose is a mismatched
  // signer — and skipping it anywhere else leaves rekeyed accounts unable to
  // sign at all. Pin the exact opt-out set so neither drifts.
  it("opts only the signer-mismatch scenario out of ARC-60 signer resolution", () => {
    const arc60 = getAllScenarios().filter((s) => s.kind === "arc60");
    const optedOut = arc60.filter((s) => s.preservesArc60Signer).map((s) => s.id);

    expect(arc60.length).toBeGreaterThan(1);
    expect(optedOut).toEqual(["arc60-signer-mismatch"]);
  });

  it("gives the testnet scenario set to every testnet-class network", () => {
    const testNetIds = getScenarios("testnet").map((s) => s.id);

    expect(testNetIds.length).toBeGreaterThan(0);
    expect(getScenarios("mainnet").map((s) => s.id)).not.toEqual(testNetIds);
  });
});
