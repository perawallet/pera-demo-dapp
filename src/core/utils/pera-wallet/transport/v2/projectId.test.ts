import {normalizeProjectId} from "./projectId";

describe("normalizeProjectId", () => {
  it("treats a missing id as unset", () => {
    expect(normalizeProjectId(undefined)).toBeUndefined();
  });

  it("treats an empty or whitespace-only id as unset", () => {
    expect(normalizeProjectId("")).toBeUndefined();
    expect(normalizeProjectId("  \n")).toBeUndefined();
  });

  it("strips a trailing newline from the CI secret", () => {
    expect(normalizeProjectId("abc\n")).toBe("abc");
  });

  it("strips surrounding spaces", () => {
    expect(normalizeProjectId(" abc ")).toBe("abc");
  });

  it("leaves a clean id unchanged", () => {
    expect(normalizeProjectId("abc")).toBe("abc");
  });
});
