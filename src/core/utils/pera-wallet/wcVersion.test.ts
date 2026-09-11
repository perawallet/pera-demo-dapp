import {getPersistedWcVersion, persistWcVersion, WALLET_CONNECT_VERSIONS} from "./wcVersion";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/pera-wallet/peraWalletTypes";

describe("WalletConnect version setting", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to v1 when nothing is stored", () => {
    expect(getPersistedWcVersion()).toBe("v1");
  });

  it("defaults to v1 when the stored value is garbage", () => {
    localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET_CONNECT_VERSION, "v3");
    expect(getPersistedWcVersion()).toBe("v1");
  });

  it("round-trips v2", () => {
    persistWcVersion("v2");
    expect(localStorage.getItem("WalletConnectVersion")).toBe("v2");
    expect(getPersistedWcVersion()).toBe("v2");
  });

  it("lists both versions in display order", () => {
    expect(WALLET_CONNECT_VERSIONS).toEqual(["v1", "v2"]);
  });
});
