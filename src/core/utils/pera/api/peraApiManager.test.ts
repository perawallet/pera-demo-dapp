import {ChainType} from "../../algod/algod";
import peraApiManager from "./peraApiManager";

describe("peraApiManager", () => {
  it("has a fetcher for networks with a Pera API", () => {
    peraApiManager.updateFetcher(ChainType.MainNet);
    expect(peraApiManager.isAvailable).toBe(true);
    expect(peraApiManager.fetcher).not.toBeNull();

    peraApiManager.updateFetcher(ChainType.TestNet);
    expect(peraApiManager.isAvailable).toBe(true);
  });

  it("has no fetcher for networks without a Pera API", () => {
    [ChainType.BetaNet, ChainType.LocalNet, ChainType.Custom].forEach((chain) => {
      peraApiManager.updateFetcher(chain);
      expect(peraApiManager.isAvailable).toBe(false);
      expect(peraApiManager.fetcher).toBeNull();
    });
  });
});
