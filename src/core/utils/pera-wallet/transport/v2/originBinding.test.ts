import {isArc60OriginMismatch} from "./originBinding";

describe("isArc60OriginMismatch", () => {
  it("matches the same host with or without a scheme", () => {
    expect(isArc60OriginMismatch("example.com", "https://example.com")).toBe(false);
    expect(isArc60OriginMismatch("https://example.com", "https://example.com")).toBe(false);
    expect(isArc60OriginMismatch("EXAMPLE.com", " https://example.com ")).toBe(false);
  });

  it("matches when both sides carry the same port and mismatches when only one does", () => {
    expect(isArc60OriginMismatch("localhost:3000", "http://localhost:3000")).toBe(false);
    expect(isArc60OriginMismatch("localhost", "http://localhost:3000")).toBe(true);
  });

  it("mismatches a different host", () => {
    expect(isArc60OriginMismatch("evil.example", "http://localhost")).toBe(true);
    expect(isArc60OriginMismatch("evil.example", "https://example.com")).toBe(true);
  });

  it("mismatches userinfo smuggling", () => {
    expect(isArc60OriginMismatch("https://example.com@evil.example", "https://example.com")).toBe(
      true
    );
  });

  it("never mismatches when the origin is unknown", () => {
    expect(isArc60OriginMismatch("evil.example", undefined)).toBe(false);
    expect(isArc60OriginMismatch("evil.example", "")).toBe(false);
  });
});
