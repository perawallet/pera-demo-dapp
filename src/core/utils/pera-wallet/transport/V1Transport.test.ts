import {V1Transport, type V1Manager} from "./V1Transport";
import {ChainType} from "../../algod/algod";

const makeManager = () => {
  const disconnectHandlers: Array<() => Promise<void>> = [];
  const manager = {
    isConnected: false,
    connector: null as {bridge: string} | null,
    connectAndSetupEventHandlers: jest.fn(async ({onDisconnect}) => {
      disconnectHandlers.push(onDisconnect);
      manager.isConnected = true;
      manager.connector = {bridge: "https://bridge.example"};
      return ["ADDR1", "ADDR2"];
    }),
    reconnectSessionAndSetupEventHandlers: jest.fn(async ({onDisconnect}) => {
      disconnectHandlers.push(onDisconnect);
      manager.isConnected = true;
      manager.connector = {bridge: "https://bridge.example"};
      return ["ADDR1"];
    }),
    disconnect: jest.fn(async () => {
      manager.isConnected = false;
      manager.connector = null;
      // Mirror the real SDK: `disconnect()` -> `killSession()` triggers the
      // same "disconnect" event that any other disconnect path fires, so an
      // explicit `transport.disconnect()` call also echoes through here.
      disconnectHandlers.forEach((h) => h());
    }),
    signTransaction: jest.fn(async () => [new Uint8Array([1])]),
    signData: jest.fn(async () => [new Uint8Array([2])]),
    signArc60Data: jest.fn(async () => ({signature: new Uint8Array([3])})),
    updateConfig: jest.fn()
  };
  return {manager: manager as unknown as V1Manager, fireDisconnect: () => disconnectHandlers.forEach((h) => h())};
};

describe("V1Transport", () => {
  it("reports version v1 and no accounts before connecting", () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);

    expect(transport.version).toBe("v1");
    expect(transport.isConnected).toBe(false);
    expect(transport.accounts).toEqual([]);
    expect(transport.describe()).toBeNull();
  });

  it("connects through the manager and exposes the accounts and bridge", async () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);

    await expect(transport.connect()).resolves.toEqual(["ADDR1", "ADDR2"]);
    expect(transport.accounts).toEqual(["ADDR1", "ADDR2"]);
    expect(transport.isConnected).toBe(true);
    expect(transport.describe()).toBe("https://bridge.example");
  });

  it("reconnects through the manager", async () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);

    await expect(transport.reconnectSession()).resolves.toEqual(["ADDR1"]);
    expect(transport.accounts).toEqual(["ADDR1"]);
  });

  it("fires onDisconnect handlers when the SDK reports a disconnect and clears accounts", async () => {
    const {manager, fireDisconnect} = makeManager();
    const transport = new V1Transport(manager);
    const handler = jest.fn();
    transport.onDisconnect(handler);
    await transport.connect();

    fireDisconnect();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(transport.accounts).toEqual([]);
  });

  it("stops calling an unsubscribed handler", async () => {
    const {manager, fireDisconnect} = makeManager();
    const transport = new V1Transport(manager);
    const handler = jest.fn();
    const unsubscribe = transport.onDisconnect(handler);
    await transport.connect();
    unsubscribe();

    fireDisconnect();

    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnect calls the manager and fires handlers exactly once, even though the SDK's own disconnect event echoes the same teardown", async () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);
    const handler = jest.fn();
    transport.onDisconnect(handler);
    await transport.connect();

    await transport.disconnect();

    expect(manager.disconnect).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(transport.accounts).toEqual([]);
  });

  it("does not fire handlers again for a disconnect event that arrives after the session already ended", async () => {
    const {manager, fireDisconnect} = makeManager();
    const transport = new V1Transport(manager);
    const handler = jest.fn();
    transport.onDisconnect(handler);
    await transport.connect();
    await transport.disconnect();
    handler.mockClear();

    // A late/duplicate "disconnect" event from the SDK after the session is
    // already torn down should be a no-op.
    fireDisconnect();

    expect(handler).not.toHaveBeenCalled();
    expect(transport.accounts).toEqual([]);
  });

  it("does not fire handlers for a disconnect event when connect resolved with no accounts", async () => {
    const disconnectHandlers: Array<() => Promise<void>> = [];
    const manager = {
      isConnected: false,
      connector: null as {bridge: string} | null,
      connectAndSetupEventHandlers: jest.fn(async ({onDisconnect}) => {
        disconnectHandlers.push(onDisconnect);
        // Mirrors the user closing the connect modal before approving.
        return [];
      }),
      reconnectSessionAndSetupEventHandlers: jest.fn(),
      disconnect: jest.fn(),
      signTransaction: jest.fn(),
      signData: jest.fn(),
      signArc60Data: jest.fn(),
      updateConfig: jest.fn()
    } as unknown as V1Manager;
    const transport = new V1Transport(manager);
    const handler = jest.fn();
    transport.onDisconnect(handler);
    await transport.connect();

    disconnectHandlers.forEach((h) => h());

    expect(handler).not.toHaveBeenCalled();
    expect(transport.accounts).toEqual([]);
  });

  it("forwards signing calls verbatim", async () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);
    const groups = [[{txn: {} as any}]];
    const data = [{data: new Uint8Array([9]), message: "m"}];
    const payload = {} as any;
    const metadata = {scope: 1, encoding: "base64"};

    await transport.signTransaction(groups, "SIGNER");
    await transport.signData(data, "SIGNER", true);
    await transport.signArc60Data(payload, metadata, true);

    expect(manager.signTransaction).toHaveBeenCalledWith(groups, "SIGNER");
    expect(manager.signData).toHaveBeenCalledWith(data, "SIGNER", true);
    expect(manager.signArc60Data).toHaveBeenCalledWith(payload, metadata, true);
  });

  it("setChain forwards the numeric chain id to updateConfig", () => {
    const {manager} = makeManager();
    const transport = new V1Transport(manager);

    transport.setChain(ChainType.BetaNet);

    expect(manager.updateConfig).toHaveBeenCalledWith({chainId: 416003});
  });
});
