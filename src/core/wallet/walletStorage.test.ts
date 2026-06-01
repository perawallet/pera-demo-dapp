import { getCommsProtocol, setCommsProtocol, getLiquidAuthUrl, setLiquidAuthUrl } from "./walletStorage";
import { DEFAULT_LIQUID_AUTH_URL } from "../liquid-auth/constants";

describe("walletStorage", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to walletconnect", () => {
    expect(getCommsProtocol()).toBe("walletconnect");
  });

  it("persists the comms protocol", () => {
    setCommsProtocol("liquid-auth");
    expect(getCommsProtocol()).toBe("liquid-auth");
  });

  it("ignores an unknown stored protocol", () => {
    localStorage.setItem("CommsProtocol", "bogus");
    expect(getCommsProtocol()).toBe("walletconnect");
  });

  it("defaults the liquid-auth url and persists overrides", () => {
    expect(getLiquidAuthUrl()).toBe(DEFAULT_LIQUID_AUTH_URL);
    setLiquidAuthUrl("https://my.ngrok.app");
    expect(getLiquidAuthUrl()).toBe("https://my.ngrok.app");
  });
});
