import {
  buildNegotiateOffer,
  offerProtocolsForMode,
  parseSelectFrame,
  NegotiationError
} from "./negotiate";

describe("offerProtocolsForMode", () => {
  it("maps each mode to the advertised protocols", () => {
    expect(offerProtocolsForMode("arc0027")).toEqual([
      {id: "arc0027", versions: ["1.0"]}
    ]);
    expect(offerProtocolsForMode("arc0027-walletconnect")).toEqual([
      {id: "arc0027", versions: ["1.0"]},
      {id: "walletconnect", versions: ["2.0"]}
    ]);
    expect(offerProtocolsForMode("walletconnect")).toEqual([
      {id: "walletconnect", versions: ["2.0"]}
    ]);
  });
});

describe("buildNegotiateOffer", () => {
  it("builds a JSON offer frame carrying handshake version, protocols and peer", () => {
    const {id, frame} = buildNegotiateOffer({
      protocols: [{id: "arc0027", versions: ["1.0"]}],
      peer: {name: "Pera Demo dApp", origin: "https://demo.test"}
    });
    expect(frame.startsWith("{")).toBe(true);
    const parsed = JSON.parse(frame);
    expect(parsed).toMatchObject({
      id,
      reference: "liquidauth:negotiate:offer",
      params: {
        handshakeVersion: 1,
        protocols: [{id: "arc0027", versions: ["1.0"]}],
        peer: {name: "Pera Demo dApp", origin: "https://demo.test"}
      }
    });
    expect(typeof id).toBe("string");
  });
});

describe("parseSelectFrame", () => {
  it("parses a success select", () => {
    const raw = JSON.stringify({
      id: "s1",
      reference: "liquidauth:negotiate:select",
      requestId: "o1",
      result: {handshakeVersion: 1, protocol: {id: "arc0027", version: "1.0"}}
    });
    expect(parseSelectFrame(raw)).toEqual({
      requestId: "o1",
      protocol: {id: "arc0027", version: "1.0"},
      error: undefined
    });
  });

  it("parses an error select", () => {
    const raw = JSON.stringify({
      id: "s2",
      reference: "liquidauth:negotiate:select",
      requestId: "o2",
      error: {code: 5000, message: "no overlap"}
    });
    expect(parseSelectFrame(raw)).toMatchObject({
      requestId: "o2",
      error: {code: 5000}
    });
  });

  it("returns null for non-select JSON and for malformed input", () => {
    expect(
      parseSelectFrame(JSON.stringify({reference: "arc0027:enable:response"}))
    ).toBeNull();
    expect(parseSelectFrame("not json")).toBeNull();
  });
});

describe("NegotiationError", () => {
  it("maps known codes to friendly messages and keeps the code", () => {
    const error = new NegotiationError({code: 5000});
    expect(error.code).toBe(5000);
    expect(error.message).toMatch(/none of the offered protocols/i);
    expect(error.name).toBe("NegotiationError");
  });
});
