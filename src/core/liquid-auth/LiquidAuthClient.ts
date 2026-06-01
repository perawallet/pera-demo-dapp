import { SignalClient } from "@algorandfoundation/liquid-client";
import { LIQUID_AUTH_RTC_CONFIG, LIQUID_CONNECT_TIMEOUT_MS, LIQUID_REQUEST_TIMEOUT_MS } from "./constants";
import { Arc0027Error, decodeFrame, type Arc0027ResponseEnvelope } from "./arc0027";

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

/** Transport wrapper around the AF SignalClient. The dApp is the OFFER peer:
 *  `peer(requestId, 'offer')` calls link() internally, joins the request room,
 *  and creates the data channel. The wallet address arrives via 'link-message'. */
export class LiquidAuthClient {
  private client: SignalClient | null = null;
  private channel: RTCDataChannel | null = null;
  private pending = new Map<string, PendingRequest>();
  private onClosed: (() => void) | null = null;

  constructor(
    private readonly url: string,
    private readonly factory: SignalClientFactory = (u) => new SignalClient(u)
  ) {}

  onClose(cb: () => void): void {
    this.onClosed = cb;
  }

  connect(onQr: (info: QrInfo) => void): Promise<string[]> {
    const client = this.factory(this.url);
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
        .then((channel: RTCDataChannel) => {
          this.channel = channel;
          channel.onmessage = (event: MessageEvent) => this.handleFrame(event.data);
          channel.onclose = () => this.handleClose();
          channel.onerror = () => this.handleClose();
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

  private handleClose(): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Liquid Auth: connection closed."));
    }
    this.pending.clear();
    this.channel = null;
    this.onClosed?.();
  }

  close(): void {
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
