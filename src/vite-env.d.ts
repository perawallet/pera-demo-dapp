/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown (WalletConnect Cloud) project ID. Without it the v2 transport refuses to connect. */
  readonly VITE_REOWN_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
