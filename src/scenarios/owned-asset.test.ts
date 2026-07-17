import { ChainType } from "../core/utils/algod/algod";
import {
  getOwnedAsset,
  setOwnedAsset,
  clearOwnedAsset,
  networkForChain
} from "./owned-asset";

describe("owned-asset storage", () => {
  const ADDR_A = "AAAA";
  const ADDR_B = "BBBB";

  beforeEach(() => localStorage.clear());

  it("round-trips set/get/clear", () => {
    expect(getOwnedAsset("testnet", ADDR_A)).toBeNull();
    setOwnedAsset("testnet", ADDR_A, 12345);
    expect(getOwnedAsset("testnet", ADDR_A)).toBe(12345);
    clearOwnedAsset("testnet", ADDR_A);
    expect(getOwnedAsset("testnet", ADDR_A)).toBeNull();
  });

  it("keys records by network AND address", () => {
    setOwnedAsset("testnet", ADDR_A, 111);
    expect(getOwnedAsset("mainnet", ADDR_A)).toBeNull();
    expect(getOwnedAsset("testnet", ADDR_B)).toBeNull();
    expect(getOwnedAsset("testnet", ADDR_A)).toBe(111);
  });

  it("returns null for corrupt stored values", () => {
    localStorage.setItem("pera-demo:owned-asset:testnet:AAAA", "not-a-number");
    expect(getOwnedAsset("testnet", ADDR_A)).toBeNull();
  });

  it("maps ChainType to Network", () => {
    expect(networkForChain(ChainType.TestNet)).toBe("testnet");
    expect(networkForChain(ChainType.MainNet)).toBe("mainnet");
  });
});
