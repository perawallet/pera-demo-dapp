import {ChainType} from "./algod";
import {
  getNetworkConfig,
  getCustomNetworkSettings,
  setCustomNetworkSettings,
  LOCALNET_DEFAULTS
} from "./networks";

describe("network config registry", () => {
  beforeEach(() => localStorage.clear());

  it("resolves the MainNet preset with its fixtures and Pera API", () => {
    const config = getNetworkConfig(ChainType.MainNet);

    expect(config.label).toBe("MainNet");
    expect(config.chainId).toBe(416001);
    expect(config.scenarioNetwork).toBe("mainnet");
    expect(config.peraApiBaseUrl).toBe("https://mainnet.api.perawallet.app/v1/");
    expect(config.appIndex).toBe(305162725);
    expect(config.assetIds).toEqual({transfer: 604, optIn: 312769, close: 672});
  });

  it("resolves the TestNet preset with its fixtures and Pera API", () => {
    const config = getNetworkConfig(ChainType.TestNet);

    expect(config.chainId).toBe(416002);
    expect(config.scenarioNetwork).toBe("testnet");
    expect(config.peraApiBaseUrl).toBe("https://testnet.api.perawallet.app/v1/");
    expect(config.appIndex).toBe(22314999);
    expect(config.assetIds).toEqual({transfer: 11711, optIn: 135270, close: 180132});
  });

  it("gives BetaNet its own chain id but no Pera API and no fixtures", () => {
    const config = getNetworkConfig(ChainType.BetaNet);

    expect(config.chainId).toBe(416003);
    expect(config.scenarioNetwork).toBe("testnet");
    expect(config.peraApiBaseUrl).toBeUndefined();
    expect(config.appIndex).toBeUndefined();
    expect(config.assetIds).toBeUndefined();
  });

  it("gives LocalNet the network-agnostic chain id and AlgoKit defaults", () => {
    const config = getNetworkConfig(ChainType.LocalNet);

    expect(config.chainId).toBe(4160);
    expect(config.scenarioNetwork).toBe("testnet");
    expect(config.algod.baseServer).toBe("http://localhost");
    expect(config.algod.port).toBe(4001);
    expect(config.algod.token).toBe("a".repeat(64));
    expect(config.peraApiBaseUrl).toBeUndefined();
  });

  it("falls back to the LocalNet defaults for Custom when nothing is stored", () => {
    expect(getCustomNetworkSettings()).toEqual(LOCALNET_DEFAULTS);
    expect(getNetworkConfig(ChainType.Custom).algod).toEqual(LOCALNET_DEFAULTS);
  });

  it("merges persisted settings into the Custom config", () => {
    setCustomNetworkSettings({
      baseServer: "https://fnet-api.example.com",
      port: "",
      token: "abc"
    });

    const config = getNetworkConfig(ChainType.Custom);

    expect(config.algod.baseServer).toBe("https://fnet-api.example.com");
    expect(config.algod.token).toBe("abc");
    expect(config.chainId).toBe(4160);
    expect(config.scenarioNetwork).toBe("testnet");
  });

  it("falls back to the LocalNet defaults when stored settings are corrupt", () => {
    localStorage.setItem("CustomNetwork", "not-json");

    expect(getCustomNetworkSettings()).toEqual(LOCALNET_DEFAULTS);
  });
});
