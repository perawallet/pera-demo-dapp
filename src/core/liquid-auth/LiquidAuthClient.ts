import { SignalClient } from "@algorandfoundation/liquid-client";
import {
  LIQUID_AUTH_RTC_CONFIG,
  LIQUID_CONNECT_TIMEOUT_MS,
  LIQUID_NEGOTIATE_TIMEOUT_MS,
  LIQUID_REQUEST_TIMEOUT_MS
} from "./constants";
import { Arc0027Error, decodeFrame, type Arc0027ResponseEnvelope } from "./arc0027";
import {
  buildNegotiateOffer,
  NegotiationError,
  parseSelectFrame,
  type NegotiationConfig
} from "./negotiate";

export interface QrInfo {
  requestId: string;
  deepLink: string;
}

type SignalClientFactory = (url: string) => SignalClient;

interface PendingRequest {
  resolve: (result: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingNegotiation {
  id: string;
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Transport wrapper around the AF SignalClient. The dApp is the OFFER peer:
 *  `peer(requestId, 'offer')` calls link() internally, joins the request room,
 *  and creates the data channel. The wallet address arrives via 'link-message'. */
export class LiquidAuthClient {
  private client: SignalClient | null = null;
  private channel: RTCDataChannel | null = null;
  private pending = new Map<string, PendingRequest>();
  private pendingNegotiation: PendingNegotiation | null = null;
  /** The protocol the wallet selected during the handshake, if any. */
  private negotiatedProtocol: string | null = null;
  private onClosed: (() => void) | null = null;

  constructor(
    private readonly url: string | (() => string),
    private readonly factory: SignalClientFactory = (u) => new SignalClient(u)
  ) {}

  onClose(cb: () => void): void {
    this.onClosed = cb;
  }

  /** The protocol agreed during the handshake (e.g. "arc0027"), or null if no
   *  negotiation was performed. */
  get protocol(): string | null {
    return this.negotiatedProtocol;
  }

  connect(
    onQr: (info: QrInfo) => void,
    negotiation?: NegotiationConfig
  ): Promise<string[]> {
    // Resolve the URL lazily so edits to the configured server (written to
    // storage on field blur) take effect on the next connect without needing
    // the connector to be rebuilt.
    const url = typeof this.url === "function" ? this.url() : this.url;
    const client = this.factory(url);
    this.client = client;
    const requestId = SignalClient.generateRequestId();

    return new Promise<string[]>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.close();
        reject(new Error("Liquid Auth: the wallet did not connect in time."));
      }, LIQUID_CONNECT_TIMEOUT_MS);

      let walletAddress: string | null = null;
      client.on("link-message", (message: { wallet: string }) => {
        walletAddress = message.wallet;
      });

      onQr({ requestId, deepLink: client.deepLink(requestId) });

      client
        .peer(requestId, "offer", LIQUID_AUTH_RTC_CONFIG)
        .then(async (channel: RTCDataChannel) => {
          this.channel = channel;
          channel.onmessage = (event: MessageEvent) => this.handleFrame(event.data);
          channel.onclose = () => this.handleClose();
          channel.onerror = () => this.handleClose();
          // Run the negotiation handshake before reporting success, so a sign
          // request is never sent before the wallet has agreed on a protocol.
          if (negotiation) {
            await this.negotiate(negotiation);
          }
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(walletAddress ? [walletAddress] : []);
        })
        .catch((error: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.close();
          reject(error);
        });
    });
  }

  /** Sends the negotiation offer and resolves once the wallet selects a
   *  protocol this dApp can speak. Rejects on a wallet error select, a timeout,
   *  or a selection of an unimplemented protocol. */
  private negotiate(config: NegotiationConfig): Promise<void> {
    const {id, frame} = buildNegotiateOffer(config);
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingNegotiation = null;
        reject(new Error("Liquid Auth: protocol negotiation timed out."));
      }, LIQUID_NEGOTIATE_TIMEOUT_MS);
      this.pendingNegotiation = {id, resolve, reject, timer};
      this.channel!.send(frame);
    });
  }

  request(messageId: string, frame: string): Promise<Record<string, unknown>> {
    if (!this.channel) return Promise.reject(new Error("Liquid Auth: not connected."));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error("Liquid Auth: the wallet timed out."));
      }, LIQUID_REQUEST_TIMEOUT_MS);
      this.pending.set(messageId, { resolve, reject, timer });
      this.channel!.send(frame);
    });
  }

  private handleFrame(raw: string): void {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (trimmed === "") return; // heartbeat
    // Negotiation frames are JSON objects (start with `{`); ARC-0027 frames are
    // base64(CBOR) and never start with `{`. Route accordingly.
    if (trimmed.startsWith("{")) {
      this.handleNegotiationFrame(trimmed);
      return;
    }

    const decoded = decodeFrame(raw);
    if (!decoded || typeof decoded !== "object") return;
    const env = decoded as Arc0027ResponseEnvelope;
    if (typeof env.requestId !== "string") return;
    const entry = this.pending.get(env.requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(env.requestId);
    if (env.error) {
      entry.reject(new Arc0027Error(env.error));
    } else {
      entry.resolve(env.result ?? {});
    }
  }

  /** Resolve/reject the in-flight negotiation from a `negotiate:select` frame. */
  private handleNegotiationFrame(raw: string): void {
    const select = parseSelectFrame(raw);
    if (!select) return;
    const pending = this.pendingNegotiation;
    if (!pending || pending.id !== select.requestId) return;
    clearTimeout(pending.timer);
    this.pendingNegotiation = null;
    if (select.error) {
      pending.reject(new NegotiationError(select.error));
      return;
    }
    const protocolId = select.protocol?.id;
    if (protocolId !== "arc0027") {
      pending.reject(
        new Error(
          `Liquid Auth: the wallet selected "${protocolId ?? "unknown"}", which this demo dApp does not implement.`
        )
      );
      return;
    }
    this.negotiatedProtocol = protocolId;
    pending.resolve();
  }

  private handleClose(): void {
    if (this.pendingNegotiation) {
      clearTimeout(this.pendingNegotiation.timer);
      this.pendingNegotiation.reject(new Error("Liquid Auth: connection closed."));
      this.pendingNegotiation = null;
    }
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Liquid Auth: connection closed."));
    }
    this.pending.clear();
    this.channel = null;
    this.onClosed?.();
  }

  close(): void {
    this.negotiatedProtocol = null;
    try {
      this.channel?.close();
    } catch {
      /* noop */
    }
    this.channel = null;
    try {
      this.client?.close(true);
    } catch {
      /* noop */
    }
    this.client = null;
  }
}
