import {ChainType} from "../core/utils/algod/algod";
import {
  getOwnedAsset,
  setOwnedAsset,
  clearOwnedAsset,
  scenarioNetworkForChain
} from "./owned-asset";

describe("owned-asset storage", () => {
  const ADDR_A = "AAAA";
  const ADDR_B = "BBBB";

  beforeEach(() => localStorage.clear());

  it("round-trips set/get/clear", () => {
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBeNull();
    setOwnedAsset(ChainType.TestNet, ADDR_A, 12345);
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBe(12345);
    clearOwnedAsset(ChainType.TestNet, ADDR_A);
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBeNull();
  });

  it("keys records by chain AND address", () => {
    setOwnedAsset(ChainType.TestNet, ADDR_A, 111);
    expect(getOwnedAsset(ChainType.MainNet, ADDR_A)).toBeNull();
    expect(getOwnedAsset(ChainType.TestNet, ADDR_B)).toBeNull();
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBe(111);
  });

  it("does not share state between networks that share a scenario set", () => {
    setOwnedAsset(ChainType.LocalNet, ADDR_A, 777);

    expect(getOwnedAsset(ChainType.BetaNet, ADDR_A)).toBeNull();
    expect(getOwnedAsset(ChainType.Custom, ADDR_A)).toBeNull();
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBeNull();
    expect(getOwnedAsset(ChainType.LocalNet, ADDR_A)).toBe(777);
  });

  it("keeps the existing key format for MainNet and TestNet", () => {
    setOwnedAsset(ChainType.TestNet, ADDR_A, 222);

    expect(localStorage.getItem("pera-demo:owned-asset:testnet:AAAA")).toBe("222");
  });

  it("returns null for corrupt stored values", () => {
    localStorage.setItem("pera-demo:owned-asset:testnet:AAAA", "not-a-number");
    expect(getOwnedAsset(ChainType.TestNet, ADDR_A)).toBeNull();
  });

  it("maps every network to its scenario set", () => {
    expect(scenarioNetworkForChain(ChainType.MainNet)).toBe("mainnet");
    expect(scenarioNetworkForChain(ChainType.TestNet)).toBe("testnet");
    expect(scenarioNetworkForChain(ChainType.BetaNet)).toBe("testnet");
    expect(scenarioNetworkForChain(ChainType.LocalNet)).toBe("testnet");
    expect(scenarioNetworkForChain(ChainType.Custom)).toBe("testnet");
  });
});
