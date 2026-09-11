import algosdk from "algosdk";
import nacl from "tweetnacl";
import {sha256} from "js-sha256";

import {ChainType} from "../../../algod/algod";
import type {PairingUi} from "../WalletTransport";
import type {WcClient, WcSession} from "./wcClient";
import {pairingDeepLink, V2Transport, type V2TransportDeps} from "./V2Transport";
import {isWcV2Error} from "./WcV2Error";

expect.extend({
  toSatisfy(received: unknown, predicate: (value: unknown) => boolean) {
    const pass = predicate(received);
    return {pass, message: () => `expected ${String(received)} ${pass ? "not " : ""}to satisfy predicate`};
  }
});

declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toSatisfy(predicate: (value: unknown) => boolean): R;
    }
  }
}

const TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe";
const MAINNET = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k";
const A = algosdk.generateAccount();
const B = algosdk.generateAccount();
const ADDR_A = A.addr.toString();
const ADDR_B = B.addr.toString();
// jsdom serves the tests from http://localhost; ARC-60 payloads must name that
// host or the transport's SIWA origin binding rejects them.
const PAGE_DOMAIN = window.location.host;

const makeSession = (over: Partial<WcSession> = {}, chainId = TESTNET): WcSession => ({
  topic: "topic-1",
  expiry: Math.floor(Date.now() / 1000) + 3600,
  namespaces: {
    algorand: {
      accounts: [`${chainId}:${ADDR_A}`, `${chainId}:${ADDR_B}`],
      methods: ["algo_signTxn", "algo_signData"],
      events: []
    }
  },
  peer: {metadata: {name: "Pera", description: "", url: "https://perawallet.app", icons: []}},
  ...over
});

type Handler = (args: {topic: string}) => void;

const makeClient = (sessions: WcSession[] = []) => {
  const handlers: Record<string, Handler[]> = {session_delete: [], session_expire: []};
  let approvalResolver: ((s: WcSession) => void) | null = null;
  const client: WcClient & {
    emit: (event: "session_delete" | "session_expire", topic: string) => void;
    approve: (s: WcSession) => void;
  } = {
    connect: jest.fn(async () => ({
      uri: "wc:abc@2?relay-protocol=irn&symKey=123",
      approval: () => new Promise<WcSession>((resolve) => (approvalResolver = resolve))
    })),
    // The mock resolves a concrete value; `request` is generic in `T`, so the
    // cast is what lets a fixed return type stand in for it.
    request: jest.fn(async () => ["AQID", null]) as WcClient["request"],
    disconnect: jest.fn(async () => undefined),
    session: {getAll: () => sessions},
    on: (event, handler) => handlers[event].push(handler),
    off: (event, handler) => {
      handlers[event] = handlers[event].filter((h) => h !== handler);
    },
    emit: (event, topic) => handlers[event].forEach((h) => h({topic})),
    approve: (s) => approvalResolver?.(s)
  };
  return client;
};

const makeUi = () => {
  const ui = {
    openPairing: jest.fn<void, [string, () => void]>(),
    closePairing: jest.fn(),
    showSignPrompt: jest.fn(() => jest.fn())
  };
  return ui as PairingUi & typeof ui;
};

const makeTransport = (over: Partial<V2TransportDeps> = {}, sessions: WcSession[] = []) => {
  const client = makeClient(sessions);
  const ui = makeUi();
  const createClient = jest.fn(async () => client);
  const transport = new V2Transport({
    getProjectId: () => "pid",
    initialChain: ChainType.TestNet,
    createClient,
    ui,
    isTouchDevice: () => false,
    ...over
  });
  return {transport, client, ui, createClient};
};

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("V2Transport connect", () => {
  it("throws MISSING_PROJECT_ID without creating a client", async () => {
    const {transport, createClient} = makeTransport({getProjectId: () => undefined});

    await expect(transport.connect()).rejects.toSatisfy((e) => isWcV2Error(e, "MISSING_PROJECT_ID"));
    expect(createClient).not.toHaveBeenCalled();
  });

  it("throws UNSUPPORTED_NETWORK on LocalNet and Custom without creating a client", async () => {
    for (const chain of [ChainType.LocalNet, ChainType.Custom]) {
      const {transport, createClient} = makeTransport({initialChain: chain});

      await expect(transport.connect()).rejects.toSatisfy((e) =>
        isWcV2Error(e, "UNSUPPORTED_NETWORK")
      );
      expect(createClient).not.toHaveBeenCalled();
    }
  });

  it("proposes exactly one algorand namespace for the current chain", async () => {
    const {transport, client} = makeTransport();
    const pending = transport.connect();
    await flush();

    expect(client.connect).toHaveBeenCalledWith({
      requiredNamespaces: {
        algorand: {chains: [TESTNET], methods: ["algo_signTxn", "algo_signData"], events: []}
      }
    });
    client.approve(makeSession());
    await pending;
  });

  it("shows the pairing URI, then resolves with bare addresses on the proposed chain", async () => {
    const {transport, client, ui} = makeTransport();
    const pending = transport.connect();
    await flush();

    expect(ui.openPairing).toHaveBeenCalledWith(
      "wc:abc@2?relay-protocol=irn&symKey=123",
      expect.any(Function)
    );
    client.approve(
      makeSession({
        namespaces: {
          algorand: {
            accounts: [`${TESTNET}:${ADDR_A}`, `${MAINNET}:${ADDR_B}`, `${TESTNET}:${ADDR_B}`],
            methods: ["algo_signTxn"],
            events: []
          }
        }
      })
    );

    await expect(pending).resolves.toEqual([ADDR_A, ADDR_B]);
    expect(ui.closePairing).toHaveBeenCalled();
    expect(transport.isConnected).toBe(true);
    expect(transport.accounts).toEqual([ADDR_A, ADDR_B]);
    expect(transport.describe()).toBe("wss://relay.walletconnect.com (topic topic-1…)");
  });

  it("rejects with MODAL_CLOSED when the user dismisses the dialog first", async () => {
    const {transport, ui} = makeTransport();
    const pending = transport.connect();
    await flush();
    const onClosed = ui.openPairing.mock.calls[0][1];

    onClosed();

    await expect(pending).rejects.toSatisfy((e) => isWcV2Error(e, "MODAL_CLOSED"));
    expect(transport.isConnected).toBe(false);
  });

  it("reuses one client across connects", async () => {
    const {transport, client, createClient} = makeTransport();
    const first = transport.connect();
    await flush();
    client.approve(makeSession());
    await first;
    await transport.disconnect();
    const second = transport.connect();
    await flush();
    client.approve(makeSession({topic: "topic-2"}));
    await second;

    expect(createClient).toHaveBeenCalledTimes(1);
  });
});

describe("V2Transport session lifecycle", () => {
  it("fires onDisconnect and clears state on session_delete for the active topic only", async () => {
    const {transport, client} = makeTransport();
    const handler = jest.fn();
    transport.onDisconnect(handler);
    const pending = transport.connect();
    await flush();
    client.approve(makeSession());
    await pending;

    client.emit("session_delete", "other-topic");
    expect(handler).not.toHaveBeenCalled();

    client.emit("session_delete", "topic-1");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(transport.isConnected).toBe(false);
    expect(transport.accounts).toEqual([]);
  });

  it("disconnect sends USER_DISCONNECTED and fires handlers", async () => {
    const {transport, client} = makeTransport();
    const handler = jest.fn();
    transport.onDisconnect(handler);
    const pending = transport.connect();
    await flush();
    client.approve(makeSession());
    await pending;

    await transport.disconnect();

    expect(client.disconnect).toHaveBeenCalledWith({
      topic: "topic-1",
      reason: {code: 6000, message: "User disconnected"}
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(transport.isConnected).toBe(false);
  });

  it("disconnect when not connected is a no-op", async () => {
    const {transport, client} = makeTransport();

    await expect(transport.disconnect()).resolves.toBeUndefined();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("setChain to a different network disconnects a live session and later proposes the new chain", async () => {
    const {transport, client} = makeTransport();
    const pending = transport.connect();
    await flush();
    client.approve(makeSession());
    await pending;

    transport.setChain(ChainType.MainNet);
    await flush();

    expect(client.disconnect).toHaveBeenCalled();
    expect(transport.isConnected).toBe(false);

    const again = transport.connect();
    await flush();
    expect(client.connect).toHaveBeenLastCalledWith({
      requiredNamespaces: {
        algorand: {chains: [MAINNET], methods: ["algo_signTxn", "algo_signData"], events: []}
      }
    });
    client.approve(makeSession({}, MAINNET));
    await again;
  });

  it("setChain to the same network keeps the session", async () => {
    const {transport, client} = makeTransport();
    const pending = transport.connect();
    await flush();
    client.approve(makeSession());
    await pending;

    transport.setChain(ChainType.TestNet);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(transport.isConnected).toBe(true);
  });
});

describe("V2Transport reconnect", () => {
  it("adopts the newest unexpired algorand session for the current chain", async () => {
    const now = 1_700_000_000;
    const sessions = [
      makeSession({topic: "old", expiry: now + 100}),
      makeSession({topic: "expired", expiry: now - 1}),
      makeSession({topic: "newest", expiry: now + 500}),
      {
        ...makeSession({topic: "eth", expiry: now + 900}),
        namespaces: {eip155: {accounts: ["eip155:1:0x1"], methods: [], events: []}}
      }
    ];
    const {transport} = makeTransport({now: () => now * 1000}, sessions);

    await expect(transport.reconnectSession()).resolves.toEqual([ADDR_A, ADDR_B]);
    expect(transport.describe()).toContain("newest");
    expect(transport.isConnected).toBe(true);
  });

  it("ignores sessions approved for another chain", async () => {
    const {transport} = makeTransport({}, [makeSession({}, MAINNET)]);

    await expect(transport.reconnectSession()).resolves.toEqual([]);
    expect(transport.isConnected).toBe(false);
  });

  it("resolves empty when there is no project id (never throws on page load)", async () => {
    const {transport, createClient} = makeTransport({getProjectId: () => undefined});

    await expect(transport.reconnectSession()).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("resolves empty on LocalNet without creating a client", async () => {
    const {transport, createClient} = makeTransport({initialChain: ChainType.LocalNet});

    await expect(transport.reconnectSession()).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("V2Transport signing", () => {
  const params: algosdk.SuggestedParams = {
    fee: 1000,
    minFee: 1000,
    flatFee: true,
    firstValid: 1,
    lastValid: 1000,
    genesisID: "testnet-v1.0",
    genesisHash: algosdk.base64ToBytes("SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
  };
  const pay = () =>
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: A.addr,
      receiver: B.addr,
      amount: 1,
      suggestedParams: params
    });

  const connected = async (over: Partial<V2TransportDeps> = {}) => {
    const made = makeTransport(over);
    const pending = made.transport.connect();
    await flush();
    made.client.approve(makeSession());
    await pending;
    return made;
  };

  it("throws NOT_CONNECTED before a session exists", async () => {
    const {transport} = makeTransport();

    await expect(transport.signTransaction([[{txn: pay()}]])).rejects.toSatisfy((e) =>
      isWcV2Error(e, "NOT_CONNECTED")
    );
  });

  it("sends algo_signTxn with [WalletTransaction[]] on the session chain and decodes results", async () => {
    const {transport, client} = await connected();
    const txn = pay();

    const result = await transport.signTransaction([[{txn}, {txn: pay(), signers: []}]]);

    expect(client.request).toHaveBeenCalledWith({
      topic: "topic-1",
      chainId: TESTNET,
      request: {
        method: "algo_signTxn",
        params: [
          [
            {txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64")},
            expect.objectContaining({signers: []})
          ]
        ]
      }
    });
    expect(result).toEqual([new Uint8Array([1, 2, 3])]);
  });

  it("sends legacy algo_signData as an array with the numeric chain id", async () => {
    const {transport, client} = await connected();
    (client.request as jest.Mock).mockResolvedValueOnce(["AQ=="]);

    await transport.signData([{data: new Uint8Array([1]), message: "m"}], ADDR_A, false);

    expect(client.request).toHaveBeenCalledWith({
      topic: "topic-1",
      chainId: TESTNET,
      request: {
        method: "algo_signData",
        params: [{data: "AQ==", message: "m", signer: ADDR_A, chainId: 416002}]
      }
    });
  });

  it("wraps a raw JSON-RPC rejection in a readable WcV2Error", async () => {
    const {transport, client} = await connected();
    (client.request as jest.Mock).mockRejectedValueOnce({code: -32000, message: "User rejected"});

    const error = await transport.signTransaction([[{txn: pay()}]]).catch((e) => e);

    expect(isWcV2Error(error, "REQUEST_FAILED")).toBe(true);
    expect(error.message).toBe("User rejected");
    expect(error.code).toBe(-32000);
    expect(String(error)).toBe("WcV2Error: User rejected");
  });

  it("re-throws a real Error from the client unchanged", async () => {
    const {transport, client} = await connected();
    const original = new Error("relay down");
    (client.request as jest.Mock).mockRejectedValueOnce(original);

    await expect(transport.signTransaction([[{txn: pay()}]])).rejects.toBe(original);
  });

  it("verifies legacy signatures when asked and rejects bad ones", async () => {
    const {transport, client} = await connected();
    const data = new Uint8Array([5, 6]);
    const good = algosdk.signBytes(data, A.sk);
    (client.request as jest.Mock).mockResolvedValueOnce([Buffer.from(good).toString("base64")]);

    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).resolves.toEqual([good]);

    (client.request as jest.Mock).mockResolvedValueOnce([
      Buffer.from(new Uint8Array(64)).toString("base64")
    ]);
    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).rejects.toSatisfy((e) =>
      isWcV2Error(e, "SIGN_DATA_VERIFICATION_FAILED")
    );
  });

  it("verifies a rekeyed account's signature against its auth address", async () => {
    const resolveAuthAddr = jest.fn(async () => ADDR_B);
    const {transport, client} = await connected({resolveAuthAddr});
    const data = new Uint8Array([5, 6]);
    const signedByAuthAddr = algosdk.signBytes(data, B.sk);
    (client.request as jest.Mock).mockResolvedValueOnce([
      Buffer.from(signedByAuthAddr).toString("base64")
    ]);

    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).resolves.toEqual([
      signedByAuthAddr
    ]);
    expect(resolveAuthAddr).toHaveBeenCalledWith(ADDR_A, ChainType.TestNet);
  });

  it("verifies against the signer when the account is not rekeyed", async () => {
    const {transport, client} = await connected({resolveAuthAddr: async () => null});
    const data = new Uint8Array([5, 6]);
    const good = algosdk.signBytes(data, A.sk);
    (client.request as jest.Mock).mockResolvedValueOnce([Buffer.from(good).toString("base64")]);

    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).resolves.toEqual([good]);

    (client.request as jest.Mock).mockResolvedValueOnce([
      Buffer.from(new Uint8Array(64)).toString("base64")
    ]);
    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).rejects.toSatisfy((e) =>
      isWcV2Error(e, "SIGN_DATA_VERIFICATION_FAILED")
    );
  });

  it("falls back to the signer when the auth address lookup fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const {transport, client} = await connected({
      resolveAuthAddr: async () => {
        throw new Error("algod unreachable");
      }
    });
    const data = new Uint8Array([5, 6]);
    const good = algosdk.signBytes(data, A.sk);
    (client.request as jest.Mock).mockResolvedValueOnce([Buffer.from(good).toString("base64")]);

    await expect(transport.signData([{data, message: "m"}], ADDR_A, true)).resolves.toEqual([good]);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it("sends ARC-60 algo_signData as a single object and returns the response shape", async () => {
    const {transport, client} = await connected();
    (client.request as jest.Mock).mockResolvedValueOnce(["CQk="]);
    const payload = {
      data: Buffer.from("{}").toString("base64"),
      signer: algosdk.decodeAddress(ADDR_A).publicKey,
      domain: PAGE_DOMAIN,
      authenticatorData: new Uint8Array([1])
    };

    const response = await transport.signArc60Data(payload, {scope: 1, encoding: "base64"}, false);

    const sent = (client.request as jest.Mock).mock.calls.at(-1)[0];
    expect(sent.request.method).toBe("algo_signData");
    expect(Array.isArray(sent.request.params)).toBe(false);
    expect(sent.request.params).toMatchObject({
      signer: ADDR_A,
      domain: PAGE_DOMAIN,
      metadata: {scope: 1, encoding: "base64"}
    });
    expect(response.signature).toEqual(new Uint8Array([9, 9]));
    expect(response.domain).toBe(PAGE_DOMAIN);
  });

  it("rejects an ARC-60 payload whose domain is not the page origin before contacting the wallet", async () => {
    const {transport, client} = await connected();
    (client.request as jest.Mock).mockClear();
    const payload = {
      data: Buffer.from("{}").toString("base64"),
      signer: algosdk.decodeAddress(ADDR_A).publicKey,
      domain: "evil.example",
      authenticatorData: new Uint8Array([1])
    };

    await expect(
      transport.signArc60Data(payload, {scope: 1, encoding: "base64"}, false)
    ).rejects.toSatisfy((e) => isWcV2Error(e, "SIGN_DATA_DOMAIN_MISMATCH"));
    expect(client.request).not.toHaveBeenCalled();
  });

  it("verifies ARC-60 signatures when asked and rejects bad ones", async () => {
    const {transport, client} = await connected();
    const json = `{"domain":"${PAGE_DOMAIN}"}`;
    const jsonBytes = new Uint8Array(Buffer.from(json));
    const authenticatorData = new Uint8Array(sha256.array(PAGE_DOMAIN));
    const payload = {
      data: Buffer.from(json).toString("base64"),
      signer: algosdk.decodeAddress(ADDR_A).publicKey,
      domain: PAGE_DOMAIN,
      authenticatorData
    };
    // ARC-60: ed25519(sha256(data) || sha256(authenticatorData)), no prefix.
    const message = new Uint8Array([
      ...sha256.array(jsonBytes),
      ...sha256.array(authenticatorData)
    ]);
    const good = nacl.sign.detached(message, A.sk);
    (client.request as jest.Mock).mockResolvedValueOnce([Buffer.from(good).toString("base64")]);

    const response = await transport.signArc60Data(payload, {scope: 1, encoding: "base64"}, true);

    expect(response.signature).toEqual(good);

    (client.request as jest.Mock).mockResolvedValueOnce([
      Buffer.from(new Uint8Array(64)).toString("base64")
    ]);
    await expect(
      transport.signArc60Data(payload, {scope: 1, encoding: "base64"}, true)
    ).rejects.toSatisfy((e) => isWcV2Error(e, "SIGN_DATA_VERIFICATION_FAILED"));
  });

  it("shows and dismisses the sign prompt on touch devices only", async () => {
    const touch = makeTransport({isTouchDevice: () => true});
    const pending = touch.transport.connect();
    await flush();
    touch.client.approve(makeSession());
    await pending;
    const dismiss = jest.fn();
    touch.ui.showSignPrompt.mockReturnValueOnce(dismiss);

    await touch.transport.signTransaction([[{txn: pay()}]]);

    expect(touch.ui.showSignPrompt).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);

    const desktop = await connected();
    await desktop.transport.signTransaction([[{txn: pay()}]]);
    expect(desktop.ui.showSignPrompt).not.toHaveBeenCalled();
  });
});

describe("pairingDeepLink", () => {
  it("wraps the wc uri in the perawallet-wc scheme", () => {
    expect(pairingDeepLink("wc:abc@2?relay-protocol=irn&symKey=1")).toBe(
      "perawallet-wc://wc?uri=wc%3Aabc%402%3Frelay-protocol%3Dirn%26symKey%3D1"
    );
  });
});
