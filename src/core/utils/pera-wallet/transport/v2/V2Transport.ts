import algosdk from "algosdk";
import type {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignerTransaction,
  SignMetadata
} from "@perawallet/connect";

import type {ChainType} from "../../../algod/algod";
import {ALGORAND_CAIP2_NAMESPACE, caip2ChainId, getNetworkConfig} from "../../../algod/networks";
import type {PairingUi, WalletTransport} from "../WalletTransport";
import {addressesForChain} from "./caip";
import {isArc60OriginMismatch} from "./originBinding";
import {RELAY_URL} from "./signClientFactory";
import {verifyArc60Signature, verifyLegacySignature} from "./verify";
import type {WcClient, WcMetadata, WcSession} from "./wcClient";
import {WcV2Error} from "./WcV2Error";
import {
  base64ToBytes,
  buildArc60SignDataResponse,
  buildArc60WireParams,
  buildLegacySignDataParams,
  buildSignTxnParams,
  decodeSignedResults,
  WC_METHOD_SIGN_DATA,
  WC_METHOD_SIGN_TXN
} from "./wire";

export {RELAY_URL};

export const PERA_WC_DEEPLINK_SCHEME = "perawallet-wc://";
const WC_V2_METHODS = [WC_METHOD_SIGN_TXN, WC_METHOD_SIGN_DATA];
/** WalletConnect SDK error code for USER_DISCONNECTED. Declared here so the
 *  transport does not depend on `@walletconnect/utils`. */
const USER_DISCONNECTED = {code: 6000, message: "User disconnected"};
const TOPIC_PREVIEW_LENGTH = 8;
/** Session `expiry` is in unix seconds; the injectable clock is in ms. */
const MILLISECONDS_PER_SECOND = 1000;

export const pairingDeepLink = (uri: string): string =>
  `${PERA_WC_DEEPLINK_SCHEME}wc?uri=${encodeURIComponent(uri)}`;

const defaultIsTouchDevice = (): boolean =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;

const defaultMetadata = (): WcMetadata => ({
  name: "Pera Demo dApp",
  description: "Pera Wallet demo dApp for testing WalletConnect v2",
  url: typeof window !== "undefined" ? window.location.origin : "https://perawallet.github.io",
  icons: [
    typeof window !== "undefined"
      ? `${window.location.origin}${process.env.PUBLIC_URL ?? ""}/logo192.png`
      : ""
  ].filter(Boolean)
});

/** `@walletconnect/sign-client` rejects with a raw JSON-RPC `{code, message}`
 *  object rather than an `Error`, and the UI toasts `${error}` — which renders
 *  "[object Object]". Wrap those so they read like the v1 SDK's errors. */
const toRequestError = (error: unknown): unknown => {
  if (error instanceof Error) {
    return error;
  }

  const {code, message} = (error ?? {}) as {code?: unknown; message?: unknown};

  return new WcV2Error(
    "REQUEST_FAILED",
    typeof message === "string" ? message : JSON.stringify(error),
    typeof code === "number" ? code : undefined
  );
};

export interface V2TransportDeps {
  getProjectId: () => string | undefined;
  initialChain: ChainType;
  createClient: (opts: {projectId: string; metadata: WcMetadata}) => Promise<WcClient>;
  ui: PairingUi;
  isTouchDevice?: () => boolean;
  /** Milliseconds. Injectable for the reconnect expiry test. */
  now?: () => number;
  /** Rekeyed accounts sign with their auth address; v1 resolves it from algod
   *  before verifying, so legacy `signData` verification here does too. */
  resolveAuthAddr?: (signer: string, chain: ChainType) => Promise<string | null>;
}

/** WalletConnect v2 straight to the relay. Mirrors what the mobile app's
 *  WalletKit handler accepts: one `algorand` namespace, one CAIP-2 chain,
 *  `algo_signTxn` and `algo_signData`, v1 wire payloads. */
export class V2Transport implements WalletTransport {
  readonly version = "v2" as const;
  private deps: V2TransportDeps;
  private chain: ChainType;
  private clientPromise: Promise<WcClient> | null = null;
  private session: {topic: string; chainId: string} | null = null;
  private connectedAccounts: string[] = [];
  private disconnectHandlers = new Set<() => void>();
  private sessionEndedHandler: ((args: {topic: string}) => void) | null = null;

  constructor(deps: V2TransportDeps) {
    this.deps = deps;
    this.chain = deps.initialChain;
  }

  get isConnected(): boolean {
    return this.session !== null;
  }

  get accounts(): string[] {
    return this.connectedAccounts;
  }

  async connect(): Promise<string[]> {
    const chainId = this.requireChainId();
    const client = await this.getClient();
    const {uri, approval} = await client.connect({
      requiredNamespaces: {
        [ALGORAND_CAIP2_NAMESPACE]: {chains: [chainId], methods: WC_V2_METHODS, events: []}
      }
    });

    if (!uri) {
      throw new WcV2Error("NO_PAIRING_URI", "The relay returned no pairing URI.");
    }

    const session = await new Promise<WcSession>((resolve, reject) => {
      this.deps.ui.openPairing(uri, () =>
        reject(new WcV2Error("MODAL_CLOSED", "Pairing dialog closed before approval."))
      );
      approval().then(resolve, reject);
    }).finally(() => this.deps.ui.closePairing());

    return this.adoptSession(client, session, chainId);
  }

  async reconnectSession(): Promise<string[]> {
    const chainId = caip2ChainId(this.chain);

    if (!chainId || !this.deps.getProjectId()) {
      return [];
    }

    const client = await this.getClient();
    const nowSeconds = Math.floor((this.deps.now ?? Date.now)() / MILLISECONDS_PER_SECOND);
    const candidate = client.session
      .getAll()
      .filter((session) => session.expiry > nowSeconds)
      .filter((session) => this.sessionAddresses(session, chainId).length > 0)
      .sort((a, b) => b.expiry - a.expiry)[0];

    return candidate ? this.adoptSession(client, candidate, chainId) : [];
  }

  async disconnect(): Promise<void> {
    const active = this.session;

    if (!active) {
      return;
    }

    const client = await this.getClient();
    this.clearSession(client);
    await client.disconnect({topic: active.topic, reason: USER_DISCONNECTED}).catch((error) => {
      // The relay may already have dropped the session; local state is what matters.
      console.warn("WC v2 disconnect failed", error);
    });
    this.disconnectHandlers.forEach((handler) => handler());
  }

  async signTransaction(
    groups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    const result = await this.request(WC_METHOD_SIGN_TXN, buildSignTxnParams(groups, signerAddress));

    return decodeSignedResults(result);
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    verifySignature?: boolean
  ): Promise<Uint8Array[]> {
    const {chainId} = getNetworkConfig(this.chain);
    const result = await this.request(
      WC_METHOD_SIGN_DATA,
      buildLegacySignDataParams(data, signer, chainId)
    );
    const signatures = decodeSignedResults(result);

    if (verifySignature) {
      const effectiveSigner = await this.effectiveSigner(signer);

      signatures.forEach((signature, index) => {
        if (!verifyLegacySignature(data[index].data, signature, effectiveSigner)) {
          throw new WcV2Error(
            "SIGN_DATA_VERIFICATION_FAILED",
            `Signature verification failed for data item at index ${index}`
          );
        }
      });
    }

    return signatures;
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse> {
    const origin = typeof window === "undefined" ? undefined : window.location.origin;

    if (isArc60OriginMismatch(payload.domain, origin)) {
      throw new WcV2Error(
        "SIGN_DATA_DOMAIN_MISMATCH",
        `ARC-60 domain "${payload.domain}" does not match the page origin "${origin}"`
      );
    }

    const result = await this.request(WC_METHOD_SIGN_DATA, buildArc60WireParams(payload, metadata));
    const [signature] = decodeSignedResults(result);

    if (!signature) {
      throw new WcV2Error("NO_SIGNATURE", "No signature returned from wallet.");
    }

    if (verifySignature) {
      const signer = algosdk.encodeAddress(payload.signer);
      const data = Buffer.isEncoding(metadata.encoding)
        ? new Uint8Array(Buffer.from(payload.data, metadata.encoding))
        : base64ToBytes(payload.data);

      if (!verifyArc60Signature(data, payload.authenticatorData, signature, signer)) {
        throw new WcV2Error("SIGN_DATA_VERIFICATION_FAILED", "ARC-60 signature verification failed");
      }
    }

    return buildArc60SignDataResponse(payload, signature);
  }

  onDisconnect(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  describe(): string | null {
    return this.session
      ? `${RELAY_URL} (topic ${this.session.topic.slice(0, TOPIC_PREVIEW_LENGTH)}…)`
      : null;
  }

  setChain(chain: ChainType): void {
    if (chain === this.chain) {
      return;
    }

    this.chain = chain;

    if (this.session) {
      // A v2 session is approved for exactly one chain; a new network needs a new session.
      void this.disconnect().catch((error) =>
        console.warn("WC v2 disconnect after network change failed", error)
      );
    }
  }

  private requireChainId(): string {
    if (!this.deps.getProjectId()) {
      throw new WcV2Error(
        "MISSING_PROJECT_ID",
        "Set REACT_APP_REOWN_PROJECT_ID to use WalletConnect v2."
      );
    }

    const chainId = caip2ChainId(this.chain);

    if (!chainId) {
      throw new WcV2Error(
        "UNSUPPORTED_NETWORK",
        "WalletConnect v2 needs MainNet, TestNet or BetaNet: those networks have a CAIP-2 chain ID, LocalNet and Custom do not."
      );
    }

    return chainId;
  }

  private getClient(): Promise<WcClient> {
    if (!this.clientPromise) {
      const projectId = this.deps.getProjectId();

      if (!projectId) {
        throw new WcV2Error(
          "MISSING_PROJECT_ID",
          "Set REACT_APP_REOWN_PROJECT_ID to use WalletConnect v2."
        );
      }

      this.clientPromise = this.deps
        .createClient({projectId, metadata: defaultMetadata()})
        .catch((error) => {
          this.clientPromise = null;
          throw error;
        });
    }

    return this.clientPromise;
  }

  private sessionAddresses(session: WcSession, chainId: string): string[] {
    const namespace = session.namespaces[ALGORAND_CAIP2_NAMESPACE];

    return namespace ? addressesForChain(namespace.accounts, chainId) : [];
  }

  private adoptSession(client: WcClient, session: WcSession, chainId: string): string[] {
    this.clearSession(client);
    this.session = {topic: session.topic, chainId};
    this.connectedAccounts = this.sessionAddresses(session, chainId);
    this.sessionEndedHandler = ({topic}) => {
      if (topic === session.topic) {
        this.clearSession(client);
        this.disconnectHandlers.forEach((handler) => handler());
      }
    };
    client.on("session_delete", this.sessionEndedHandler);
    client.on("session_expire", this.sessionEndedHandler);

    return this.connectedAccounts;
  }

  private clearSession(client: WcClient): void {
    if (this.sessionEndedHandler) {
      client.off("session_delete", this.sessionEndedHandler);
      client.off("session_expire", this.sessionEndedHandler);
      this.sessionEndedHandler = null;
    }
    this.session = null;
    this.connectedAccounts = [];
  }

  /** The address whose key actually signs for `signer`: its auth address when
   *  the account is rekeyed, the account itself otherwise. A resolver failure
   *  (unreachable node) must not turn into a verification failure. */
  private async effectiveSigner(signer: string): Promise<string> {
    try {
      return (await this.deps.resolveAuthAddr?.(signer, this.chain)) ?? signer;
    } catch (error) {
      console.warn("WC v2 auth address lookup failed; verifying against the signer", error);

      return signer;
    }
  }

  private async request(method: string, params: unknown): Promise<unknown> {
    const active = this.session;

    if (!active) {
      throw new WcV2Error("NOT_CONNECTED", "Connect a wallet over WalletConnect v2 first.");
    }

    const client = await this.getClient();
    const isTouch = (this.deps.isTouchDevice ?? defaultIsTouchDevice)();
    const dismissPrompt = isTouch ? this.deps.ui.showSignPrompt() : null;

    try {
      return await client.request({
        topic: active.topic,
        chainId: active.chainId,
        request: {method, params}
      });
    } catch (error) {
      throw toRequestError(error);
    } finally {
      dismissPrompt?.();
    }
  }
}
