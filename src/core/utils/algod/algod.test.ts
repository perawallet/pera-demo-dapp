import {ChainType, clientForChain} from "./algod";
import {setCustomNetworkSettings} from "./networks";

describe("clientForChain", () => {
  beforeEach(() => localStorage.clear());

  it("returns the same cached client for repeated calls", () => {
    expect(clientForChain(ChainType.TestNet)).toBe(clientForChain(ChainType.TestNet));
  });

  it("returns different clients for different networks", () => {
    expect(clientForChain(ChainType.TestNet)).not.toBe(clientForChain(ChainType.BetaNet));
  });

  it("builds a client for every network without throwing", () => {
    [
      ChainType.MainNet,
      ChainType.TestNet,
      ChainType.BetaNet,
      ChainType.LocalNet,
      ChainType.Custom
    ].forEach((chain) => {
      expect(clientForChain(chain)).toBeDefined();
    });
  });

  it("returns a new client after the custom endpoint changes", () => {
    setCustomNetworkSettings({
      baseServer: "http://localhost",
      port: 4001,
      token: "a".repeat(64)
    });
    const before = clientForChain(ChainType.Custom);

    setCustomNetworkSettings({
      baseServer: "http://localhost",
      port: 9999,
      token: "a".repeat(64)
    });

    expect(clientForChain(ChainType.Custom)).not.toBe(before);
  });
});
