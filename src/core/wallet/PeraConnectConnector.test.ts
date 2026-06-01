import { PeraConnectConnector } from "./PeraConnectConnector";

const makeFakePeraWallet = () => ({
  isConnected: false,
  connectAndSetupEventHandlers: jest.fn().mockResolvedValue(["ADDR1"]),
  reconnectSessionAndSetupEventHandlers: jest.fn().mockResolvedValue(["ADDR1"]),
  disconnect: jest.fn().mockResolvedValue(undefined),
  signTransaction: jest.fn().mockResolvedValue([new Uint8Array([1])]),
  signArc60Data: jest.fn().mockResolvedValue(new Uint8Array([9])),
  signData: jest.fn().mockResolvedValue(["sig"])
});

describe("PeraConnectConnector", () => {
  it("reports the walletconnect protocol and supports all kinds", () => {
    const c = new PeraConnectConnector(makeFakePeraWallet() as any, async () => {});
    expect(c.protocol).toBe("walletconnect");
    expect(c.supports("txn")).toBe(true);
    expect(c.supports("arbitrary-data")).toBe(true);
    expect(c.supports("arc60")).toBe(true);
  });

  it("connect delegates and records accounts", async () => {
    const fake = makeFakePeraWallet();
    const c = new PeraConnectConnector(fake as any, async () => {});
    const accounts = await c.connect();
    expect(accounts).toEqual(["ADDR1"]);
    expect(c.accounts).toEqual(["ADDR1"]);
    expect(fake.connectAndSetupEventHandlers).toHaveBeenCalled();
  });

  it("signTransaction delegates to peraWallet.signTransaction", async () => {
    const fake = makeFakePeraWallet();
    const c = new PeraConnectConnector(fake as any, async () => {});
    const groups = [[{ txn: {} } as any]];
    await c.signTransaction(groups);
    expect(fake.signTransaction).toHaveBeenCalledWith(groups);
  });

  it("signArc60Data delegates with the show-flag", async () => {
    const fake = makeFakePeraWallet();
    const c = new PeraConnectConnector(fake as any, async () => {});
    await c.signArc60Data({ signer: "ADDR1" } as any);
    expect(fake.signArc60Data).toHaveBeenCalledWith({ signer: "ADDR1" }, true);
  });
});
