import {ChainType} from "../algod/algod";
import {createWallet, type WalletDeps} from "./wallet";
import type {PairingUi, WalletTransport} from "./transport/WalletTransport";

type FakeTransport = Omit<WalletTransport, "accounts"> & {
  accounts: string[];
  fireDisconnect: () => void;
  setChain: jest.Mock;
  disconnect: jest.Mock;
};

const fakeTransport = (version: "v1" | "v2"): FakeTransport => {
  const handlers = new Set<() => void>();
  let connected = false;
  const t: FakeTransport = {
    version,
    get isConnected() {
      return connected;
    },
    accounts: [] as string[],
    connect: jest.fn(async () => {
      connected = true;
      t.accounts = [`${version}-ADDR`];
      return t.accounts;
    }),
    reconnectSession: jest.fn(async () => []),
    disconnect: jest.fn(async () => {
      connected = false;
      t.accounts = [];
      handlers.forEach((h) => h());
    }),
    signTransaction: jest.fn(async () => []),
    signData: jest.fn(async () => []),
    signArc60Data: jest.fn(async () => ({}) as any),
    onDisconnect: (h: () => void) => {
      handlers.add(h);
      return () => handlers.delete(h);
    },
    describe: () => (connected ? `${version}-server` : null),
    setChain: jest.fn(),
    fireDisconnect: () => handlers.forEach((h) => h())
  };
  return t;
};

const setup = (initialVersion: "v1" | "v2" = "v1") => {
  const v1 = fakeTransport("v1");
  const v2 = fakeTransport("v2");
  const createV2 = jest.fn((_chain: ChainType, _ui: PairingUi) => v2);
  const persistVersion = jest.fn();
  const deps: WalletDeps = {
    initialVersion,
    initialChain: ChainType.TestNet,
    createV1: () => v1,
    createV2,
    persistVersion
  };
  return {wallet: createWallet(deps), v1, v2, createV2, persistVersion};
};

describe("wallet dispatcher", () => {
  it("starts on the persisted version and forwards calls to it", async () => {
    const {wallet, v1, v2} = setup("v1");

    expect(wallet.version).toBe("v1");
    await wallet.connect();
    expect(v1.connect).toHaveBeenCalled();
    expect(v2.connect).not.toHaveBeenCalled();
    expect(wallet.accounts).toEqual(["v1-ADDR"]);
    expect(wallet.describe()).toBe("v1-server");
  });

  it("setVersion disconnects, swaps, persists and notifies", async () => {
    const {wallet, v1, v2, persistVersion} = setup("v1");
    const onChange = jest.fn();
    wallet.onVersionChange(onChange);
    await wallet.connect();

    await wallet.setVersion("v2");

    expect(v1.disconnect).toHaveBeenCalled();
    expect(wallet.version).toBe("v2");
    expect(persistVersion).toHaveBeenCalledWith("v2");
    expect(onChange).toHaveBeenCalledWith("v2");
    await wallet.connect();
    expect(v2.connect).toHaveBeenCalled();
  });

  it("setVersion to the current version is a no-op", async () => {
    const {wallet, v1, persistVersion} = setup("v1");
    await wallet.connect();

    await wallet.setVersion("v1");

    expect(v1.disconnect).not.toHaveBeenCalled();
    expect(persistVersion).not.toHaveBeenCalled();
  });

  it("forwards disconnect events from whichever transport is active", async () => {
    const {wallet, v1, v2} = setup("v1");
    const handler = jest.fn();
    wallet.onDisconnect(handler);

    v1.fireDisconnect();
    expect(handler).toHaveBeenCalledTimes(1);

    await wallet.setVersion("v2");
    v1.fireDisconnect();
    expect(handler).toHaveBeenCalledTimes(1);
    v2.fireDisconnect();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("setChain forwards to the active transport and remembers the chain for a later v2 transport", async () => {
    const {wallet, v1, createV2} = setup("v1");

    wallet.setChain(ChainType.MainNet);
    expect(v1.setChain).toHaveBeenCalledWith(ChainType.MainNet);

    await wallet.setVersion("v2");
    expect(createV2).toHaveBeenCalledWith(ChainType.MainNet, expect.anything());
  });

  it("hands the registered pairing UI to the v2 transport", async () => {
    const {wallet, createV2} = setup("v1");
    const ui: PairingUi = {
      openPairing: jest.fn(),
      closePairing: jest.fn(),
      showSignPrompt: () => () => undefined
    };
    wallet.setPairingUi(ui);

    await wallet.setVersion("v2");

    const passedUi = createV2.mock.calls[0][1];
    passedUi.openPairing("wc:x", () => undefined);
    expect(ui.openPairing).toHaveBeenCalledWith("wc:x", expect.any(Function));
  });

  it("uses a safe no-op UI until one is registered", () => {
    const {wallet, createV2} = setup("v2");

    const passedUi = createV2.mock.calls[0][1];
    expect(() => passedUi.openPairing("wc:x", () => undefined)).not.toThrow();
    expect(() => passedUi.closePairing()).not.toThrow();
    expect(() => passedUi.showSignPrompt()()).not.toThrow();
    expect(wallet.version).toBe("v2");
  });
});
