import type {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignerTransaction,
  SignMetadata
} from "@perawallet/connect";

import type {ChainType} from "../algod/algod";
import type {PairingUi, WalletTransport} from "./transport/WalletTransport";
import type {WalletConnectVersion} from "./wcVersion";

export interface WalletDeps {
  initialVersion: WalletConnectVersion;
  initialChain: ChainType;
  createV1: () => WalletTransport;
  createV2: (chain: ChainType, ui: PairingUi) => WalletTransport;
  persistVersion: (version: WalletConnectVersion) => void;
}

export interface Wallet extends WalletTransport {
  /** Disconnects the current session, swaps the transport and persists. */
  setVersion(version: WalletConnectVersion): Promise<void>;
  /** React registers the pairing dialog / sign prompt implementation here. */
  setPairingUi(ui: PairingUi): void;
  onVersionChange(handler: (version: WalletConnectVersion) => void): () => void;
}

/** Forwards to whatever UI React has registered; safe before registration. */
const createUiProxy = (): PairingUi & {set(ui: PairingUi): void} => {
  let current: PairingUi | null = null;

  return {
    set: (ui) => {
      current = ui;
    },
    openPairing: (uri, onClosed) => current?.openPairing(uri, onClosed),
    closePairing: () => current?.closePairing(),
    showSignPrompt: () => current?.showSignPrompt() ?? (() => undefined)
  };
};

export const createWallet = (deps: WalletDeps): Wallet => {
  const ui = createUiProxy();
  const disconnectHandlers = new Set<() => void>();
  const versionHandlers = new Set<(version: WalletConnectVersion) => void>();
  let chain = deps.initialChain;
  let unsubscribeActive: () => void = () => undefined;
  let active: WalletTransport;

  const build = (version: WalletConnectVersion): WalletTransport =>
    version === "v2" ? deps.createV2(chain, ui) : deps.createV1();

  const activate = (transport: WalletTransport): void => {
    unsubscribeActive();
    active = transport;
    unsubscribeActive = active.onDisconnect(() => disconnectHandlers.forEach((h) => h()));
  };

  activate(build(deps.initialVersion));

  const wallet: Wallet = {
    get version() {
      return active.version;
    },
    get isConnected() {
      return active.isConnected;
    },
    get accounts() {
      return active.accounts;
    },
    async setVersion(version) {
      if (version === active.version) {
        return;
      }
      if (active.isConnected) {
        await active.disconnect();
      }
      activate(build(version));
      deps.persistVersion(version);
      versionHandlers.forEach((h) => h(version));
    },
    setPairingUi: (next) => ui.set(next),
    onVersionChange(handler) {
      versionHandlers.add(handler);
      return () => versionHandlers.delete(handler);
    },
    connect: () => active.connect(),
    reconnectSession: () => active.reconnectSession(),
    disconnect: () => active.disconnect(),
    signTransaction: (groups: SignerTransaction[][], signerAddress?: string) =>
      active.signTransaction(groups, signerAddress),
    signData: (
      data: PeraWalletArbitraryData[],
      signer: string,
      verifySignature?: boolean
    ) => active.signData(data, signer, verifySignature),
    signArc60Data: (
      payload: PeraWalletArc60SignData,
      metadata: SignMetadata,
      verifySignature?: boolean
    ): Promise<PeraWalletArc60SignDataResponse> =>
      active.signArc60Data(payload, metadata, verifySignature),
    onDisconnect(handler) {
      disconnectHandlers.add(handler);
      return () => disconnectHandlers.delete(handler);
    },
    describe: () => active.describe(),
    setChain(next) {
      chain = next;
      active.setChain(next);
    }
  };

  return wallet;
};
