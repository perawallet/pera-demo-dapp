// src/core/wallet/types.ts
import type { SignerTransaction, PeraWalletArbitraryData, PeraWalletArc60SignData } from "@perawallet/connect";

export type CommsProtocol = "walletconnect" | "liquid-auth";

export type ScenarioKind = "txn" | "arbitrary-data" | "arc60";

/** The minimal surface Home.tsx / SignTxn.tsx need from a comms protocol.
 *  Both @perawallet/connect (WalletConnect) and Liquid Auth implement this. */
export interface WalletConnector {
  readonly protocol: CommsProtocol;
  readonly isConnected: boolean;
  readonly accounts: string[];
  connect(): Promise<string[]>;
  reconnect(): Promise<string[]>;
  disconnect(): Promise<void>;
  signTransaction(groups: SignerTransaction[][]): Promise<Uint8Array[]>;
  signArc60Data(payload: PeraWalletArc60SignData): Promise<Uint8Array>;
  /** Arbitrary-data signing. Optional: Liquid Auth has no method for it. */
  signData?(data: PeraWalletArbitraryData[], address: string): Promise<unknown>;
  supports(kind: ScenarioKind): boolean;
}
