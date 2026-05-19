import type { SignerTransaction, PeraWalletArbitraryData, PeraWalletArc60SignData } from "@perawallet/connect";
import type { ChainType } from "../core/utils/algod/algod";

export type ScenarioCategory =
  | "single-pay"
  | "single-axfer"
  | "single-acfg"
  | "single-afrz"
  | "single-appl"
  | "single-keyreg"
  | "atomic-group"
  | "non-atomic-multi"
  | "multi-group-mixed"
  | "arbitrary-data"
  | "arc60"
  | "edge-case"
  | "mainnet-dapp";

export type Modifier =
  | "close"
  | "rekey"
  | "rekeyed-sender"
  | "partial-sign"
  | "invalid"
  | "scale";

export type Network = "testnet" | "mainnet";

export interface ScenarioReturnType {
  transaction: SignerTransaction[][];
  /** Optional delay before submit. Used by `future-transaction`. */
  transactionTimeout?: number;
}

export interface ArbitraryDataReturnType {
  data: PeraWalletArbitraryData[];
}

export interface Arc60ReturnType {
  payload: PeraWalletArc60SignData;
}

export type ScenarioBuildResult = ScenarioReturnType | ArbitraryDataReturnType | Arc60ReturnType;

export interface Scenario {
  /** Stable kebab-case slug. Never changes once shipped. */
  id: string;
  title: string;
  /** Required. Describe what the scenario tests / what it builds. */
  description: string;
  /** Required. What the wallet should show and the expected outcome (success / rejection). */
  expected: string;
  category: ScenarioCategory;
  modifiers: Modifier[];
  networks: Network[];
  /** Defaults to "txn" if omitted. */
  kind?: "txn" | "arbitrary-data" | "arc60";
  build: (chain: ChainType, address: string) => Promise<ScenarioBuildResult>;
}
