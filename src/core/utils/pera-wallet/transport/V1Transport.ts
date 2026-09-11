import type {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignerTransaction,
  SignMetadata
} from "@perawallet/connect";

import type {ChainType} from "../../algod/algod";
import {getNetworkConfig} from "../../algod/networks";
import type {WalletTransport} from "./WalletTransport";

/** The slice of `PeraWalletManager` this wrapper needs. Declared structurally
 *  so tests can hand in a fake without importing the connect SDK. */
export interface V1Manager {
  readonly isConnected: boolean;
  readonly connector: {bridge: string} | null;
  connectAndSetupEventHandlers(handlers: {onDisconnect: () => Promise<void>}): Promise<string[]>;
  reconnectSessionAndSetupEventHandlers(handlers: {
    onDisconnect: () => Promise<void>;
  }): Promise<string[]>;
  disconnect(): Promise<void | undefined>;
  signTransaction(groups: SignerTransaction[][], signerAddress?: string): Promise<Uint8Array[]>;
  signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    verifySignature?: boolean
  ): Promise<Uint8Array[]>;
  signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse>;
  updateConfig(options: {chainId?: number}): void;
}

/** WalletConnect v1 through the existing `@perawallet/connect` manager. The
 *  manager keeps owning the modal, the bridge and session persistence; this
 *  class only adapts it to `WalletTransport`. */
export class V1Transport implements WalletTransport {
  readonly version = "v1" as const;
  private manager: V1Manager;
  private connectedAccounts: string[] = [];
  private disconnectHandlers = new Set<() => void>();
  // The SDK's own "disconnect" event fires for every disconnect path,
  // including the one triggered by our own explicit `disconnect()` call.
  // Tracking session activity lets `handleDisconnected` collapse the
  // resulting double-fire into a single notification per session.
  private hasActiveSession = false;

  constructor(manager: V1Manager) {
    this.manager = manager;
  }

  get isConnected(): boolean {
    return this.manager.isConnected;
  }

  get accounts(): string[] {
    return this.connectedAccounts;
  }

  async connect(): Promise<string[]> {
    const accounts = await this.manager.connectAndSetupEventHandlers({
      onDisconnect: async () => this.handleDisconnected()
    });
    // Defensive: the SDK types `connectAndSetupEventHandlers` as possibly
    // resolving with undefined, so `?? []` keeps a stray undefined from
    // crashing here. It is not the modal-close path — on CONNECT_MODAL_CLOSED
    // the SDK's `.catch` returns without settling, so the promise never
    // resolves at all.
    this.connectedAccounts = accounts ?? [];
    this.hasActiveSession = this.connectedAccounts.length > 0;
    return this.connectedAccounts;
  }

  async reconnectSession(): Promise<string[]> {
    const accounts = await this.manager.reconnectSessionAndSetupEventHandlers({
      onDisconnect: async () => this.handleDisconnected()
    });
    this.connectedAccounts = accounts ?? [];
    this.hasActiveSession = this.connectedAccounts.length > 0;
    return this.connectedAccounts;
  }

  async disconnect(): Promise<void> {
    await this.manager.disconnect();
    this.handleDisconnected();
  }

  signTransaction(groups: SignerTransaction[][], signerAddress?: string): Promise<Uint8Array[]> {
    return this.manager.signTransaction(groups, signerAddress);
  }

  signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    verifySignature?: boolean
  ): Promise<Uint8Array[]> {
    return this.manager.signData(data, signer, verifySignature);
  }

  signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse> {
    return this.manager.signArc60Data(payload, metadata, verifySignature);
  }

  onDisconnect(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  describe(): string | null {
    return this.manager.isConnected ? this.manager.connector?.bridge ?? null : null;
  }

  setChain(chain: ChainType): void {
    this.manager.updateConfig({chainId: getNetworkConfig(chain).chainId});
  }

  private handleDisconnected(): void {
    // Idempotent: the SDK's "disconnect" event and our own explicit
    // `disconnect()` call both reach here for the same session teardown.
    // Only the first call for a given session should clear state and
    // notify subscribers.
    if (!this.hasActiveSession) {
      return;
    }
    this.hasActiveSession = false;
    this.connectedAccounts = [];
    this.disconnectHandlers.forEach((handler) => handler());
  }
}
