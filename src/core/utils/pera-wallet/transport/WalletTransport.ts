import type {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignerTransaction,
  SignMetadata
} from "@perawallet/connect";

import type {ChainType} from "../../algod/algod";
import type {WalletConnectVersion} from "../wcVersion";

/** Everything the dApp asks of a wallet connection, regardless of protocol. */
export interface WalletTransport {
  readonly version: WalletConnectVersion;
  readonly isConnected: boolean;
  /** Session-approved accounts in wallet order. Empty when disconnected. */
  readonly accounts: string[];
  connect(): Promise<string[]>;
  reconnectSession(): Promise<string[]>;
  disconnect(): Promise<void>;
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
  /** Subscribe to the session ending for any reason. Returns an unsubscribe. */
  onDisconnect(handler: () => void): () => void;
  /** Human-readable connection target for the "WC server" caption, or null
   *  when not connected. */
  describe(): string | null;
  /** The dispatcher calls this when the selected network changes. */
  setChain(chain: ChainType): void;
}

/** The signing subset components take as a prop. */
export type WalletSigner = Pick<WalletTransport, "signTransaction" | "signData" | "signArc60Data">;

/** UI hooks a transport needs from React land. Only v2 uses them; v1 renders
 *  its own modal inside the connect SDK. */
export interface PairingUi {
  /** Show the pairing URI. `onClosed` fires if the user dismisses before approval. */
  openPairing(uri: string, onClosed: () => void): void;
  closePairing(): void;
  /** Tell a mobile user to switch to the wallet app. Returns a dismiss function. */
  showSignPrompt(): () => void;
}
