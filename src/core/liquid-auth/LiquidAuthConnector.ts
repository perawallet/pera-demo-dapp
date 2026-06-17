import algosdk from "algosdk";
import { SignalClient } from "@algorandfoundation/liquid-client";
import type { SignerTransaction, PeraWalletArc60SignData } from "@perawallet/connect";
import type { CommsProtocol, ScenarioKind, WalletConnector } from "../wallet/types";
import { LiquidAuthClient, type QrInfo } from "./LiquidAuthClient";
import {
  buildSignTransactionsRequest,
  buildSignMessageRequest,
  fromBase64Url,
  toBase64URL,
  type IARC0001Transaction
} from "./arc0027";
import { offerProtocolsForMode, type NegotiationConfig } from "./negotiate";
import { LIQUID_AUTH_PROVIDER_ID } from "./constants";
import { getLiquidAuthOffer } from "../wallet/walletStorage";

/** Builds the negotiation config from the stored offer mode + this dApp's
 *  self-asserted identity. Read at connect() time so the UI selector takes
 *  effect without rebuilding the connector. */
const defaultNegotiation = (): NegotiationConfig => {
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  return {
    protocols: offerProtocolsForMode(getLiquidAuthOffer()),
    peer: {
      name: "Pera Demo dApp",
      url: origin,
      origin,
      description: "Pera Wallet developer demo dApp"
    }
  };
};

export class LiquidAuthConnector implements WalletConnector {
  readonly protocol: CommsProtocol = "liquid-auth";
  accounts: string[] = [];
  private connected = false;
  private qrCallback: ((info: QrInfo) => void) | null = null;

  constructor(
    private readonly client: LiquidAuthClient,
    private readonly onDisconnect?: () => void,
    private readonly negotiationProvider: () => NegotiationConfig = defaultNegotiation
  ) {
    this.client.onClose(() => {
      this.connected = false;
      this.accounts = [];
      // Surface a dropped/closed data channel to consumers (Home clears its
      // connected-account state), mirroring the WalletConnect disconnect event.
      this.onDisconnect?.();
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  /** Register the callback the UI uses to render the QR during connect(). */
  onQr(cb: (info: QrInfo) => void): void {
    this.qrCallback = cb;
  }

  async connect(): Promise<string[]> {
    const accounts = await this.client.connect(
      (info) => this.qrCallback?.(info),
      this.negotiationProvider()
    );
    this.accounts = accounts;
    this.connected = accounts.length > 0;
    return accounts;
  }

  /** Liquid Auth has no persisted browser session here; reconnect is a no-op. */
  async reconnect(): Promise<string[]> {
    return [];
  }

  async disconnect(): Promise<void> {
    this.client.close();
    this.connected = false;
    this.accounts = [];
  }

  async signTransaction(groups: SignerTransaction[][]): Promise<Uint8Array[]> {
    const slots = groups.flat();
    const txns: IARC0001Transaction[] = slots.map((slot) => ({
      txn: toBase64URL(algosdk.encodeUnsignedTransaction(slot.txn)),
      ...(slot.signers !== undefined ? { signers: slot.signers } : {})
    }));

    const messageId = SignalClient.generateRequestId();
    const frame = buildSignTransactionsRequest(messageId, LIQUID_AUTH_PROVIDER_ID, txns);
    const result = await this.client.request(messageId, frame);

    const stxns = (result.stxns as (string | null)[]) ?? [];
    return stxns.filter((s): s is string => typeof s === "string").map((s) => fromBase64Url(s));
  }

  async signArc60Data(payload: PeraWalletArc60SignData): Promise<Uint8Array> {
    const { messageId, frame } = buildSignMessageRequest({
      data: payload.data,
      signer: payload.signer,
      domain: payload.domain,
      authenticatorData: payload.authenticatorData,
      requestId: payload.requestId,
      scope: Number(payload.metadata.scope),
      encoding: payload.metadata.encoding
    });
    const result = await this.client.request(messageId, frame);
    return fromBase64Url(result.signature as string);
  }

  supports(kind: ScenarioKind): boolean {
    return kind === "txn" || kind === "arc60";
  }
}
