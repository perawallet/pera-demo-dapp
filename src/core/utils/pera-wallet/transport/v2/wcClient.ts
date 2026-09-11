/*
 * The slice of `@walletconnect/sign-client` the transport uses, declared
 * structurally so tests can hand in a fake and never load the ESM package.
 */

export interface WcMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface WcNamespaceProposal {
  chains: string[];
  methods: string[];
  events: string[];
}

export interface WcSessionNamespace {
  accounts: string[];
  methods: string[];
  events: string[];
  chains?: string[];
}

export interface WcSession {
  topic: string;
  /** Unix seconds. */
  expiry: number;
  namespaces: Record<string, WcSessionNamespace>;
  peer: {metadata: WcMetadata};
}

export interface WcConnectResult {
  uri?: string;
  approval: () => Promise<WcSession>;
}

export type WcSessionEvent = "session_delete" | "session_expire";

export interface WcClient {
  connect(params: {
    requiredNamespaces: Record<string, WcNamespaceProposal>;
  }): Promise<WcConnectResult>;
  request<T = unknown>(params: {
    topic: string;
    chainId: string;
    request: {method: string; params: unknown};
  }): Promise<T>;
  disconnect(params: {topic: string; reason: {code: number; message: string}}): Promise<void>;
  session: {getAll(): WcSession[]};
  on(event: WcSessionEvent, handler: (args: {topic: string}) => void): unknown;
  off(event: WcSessionEvent, handler: (args: {topic: string}) => void): unknown;
}
