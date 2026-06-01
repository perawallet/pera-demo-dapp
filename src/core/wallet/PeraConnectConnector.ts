import type { PeraWalletConnect, SignerTransaction, PeraWalletArbitraryData, PeraWalletArc60SignData } from "@perawallet/connect";
import type { CommsProtocol, ScenarioKind, WalletConnector } from "./types";

/** The PeraWalletManager singleton augments PeraWalletConnect with these. */
type PeraWalletLike = PeraWalletConnect & {
  connectAndSetupEventHandlers: (handlers: { onDisconnect: () => Promise<void> }) => Promise<string[]>;
  reconnectSessionAndSetupEventHandlers: (handlers: { onDisconnect: () => Promise<void> }) => Promise<string[]>;
};

export class PeraConnectConnector implements WalletConnector {
  readonly protocol: CommsProtocol = "walletconnect";
  accounts: string[] = [];

  constructor(
    private readonly peraWallet: PeraWalletLike,
    private readonly onDisconnect: () => Promise<void>
  ) {}

  get isConnected(): boolean {
    return this.peraWallet.isConnected;
  }

  async connect(): Promise<string[]> {
    this.accounts = await this.peraWallet.connectAndSetupEventHandlers({ onDisconnect: this.onDisconnect });
    return this.accounts;
  }

  async reconnect(): Promise<string[]> {
    this.accounts = await this.peraWallet.reconnectSessionAndSetupEventHandlers({ onDisconnect: this.onDisconnect });
    return this.accounts;
  }

  async disconnect(): Promise<void> {
    await this.peraWallet.disconnect();
    this.accounts = [];
  }

  signTransaction(groups: SignerTransaction[][]): Promise<Uint8Array[]> {
    return this.peraWallet.signTransaction(groups);
  }

  signArc60Data(payload: PeraWalletArc60SignData): Promise<Uint8Array> {
    return this.peraWallet.signArc60Data(payload, true);
  }

  signData(data: PeraWalletArbitraryData[], address: string): Promise<unknown> {
    return this.peraWallet.signData(data, address, true);
  }

  supports(_kind: ScenarioKind): boolean {
    return true;
  }
}
