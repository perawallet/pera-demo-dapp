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
  | "multi-account"
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

export interface NoticeReturnType {
  /** Scenario completed without any wallet request; show this in the log. */
  notice: string;
}

export type ScenarioBuildResult =
  | ScenarioReturnType
  | ArbitraryDataReturnType
  | Arc60ReturnType
  | NoticeReturnType;

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
  /**
   * Minimum number of connected (session-approved) accounts required to run
   * this scenario. Used by multi-signer scenarios that need ≥2 real accounts.
   * When set, the UI disables the scenario until enough accounts are approved,
   * and `accounts` is guaranteed to hold at least this many entries in `build`.
   */
  minAccounts?: number;
  /** Requires the owned test asset (see owned-asset.ts). UI disables the
   *  scenario with a hint until the setup scenario has stored one. */
  requiresOwnedAsset?: boolean;
  /** After submit, wait for confirmation and store the created asset ID as
   *  the owned test asset. Used only by the setup scenario. */
  captureCreatedAsset?: boolean;
  /** After a successful submit, clear the stored owned asset (destroy). */
  clearsOwnedAssetOnSuccess?: boolean;
  /**
   * @param address The active/selected account (first approved account by
   *   default). Single-signer scenarios use only this.
   * @param accounts All session-approved accounts, in wallet order. Multi-signer
   *   scenarios (see `minAccounts`) read `accounts[0]`, `accounts[1]`, … as
   *   distinct real signers.
   */
  build: (
    chain: ChainType,
    address: string,
    accounts: string[]
  ) => Promise<ScenarioBuildResult>;
}
