// Jest can't resolve @perawallet/connect (ESM exports map), and the registry
// pulls it in via the arc60 group — stub the values the scenarios reference.
jest.mock(
  "@perawallet/connect",
  () => ({__esModule: true, ScopeType: {UNKNOWN: "unknown", AUTH: "auth"}}),
  {virtual: true}
);

import {getAllScenarios} from "./registry";

describe("scenario registry", () => {
  it("has a unique id for every scenario", () => {
    const ids = getAllScenarios().map((s) => s.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
  });
});
