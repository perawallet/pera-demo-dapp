import { ScopeType } from "@perawallet/connect";
import type { Siwa, PeraWalletArc60SignData } from "@perawallet/connect";
import type { Scenario } from "../types";

const buildArc60Payload = async (opts: {
  signerAddress: string;
  domain?: string;
  authenticatorDataDomain?: string;
  includeNonce?: boolean;
}): Promise<PeraWalletArc60SignData> => {
  const domain = opts.domain ?? window.location.host;
  const authDomain = opts.authenticatorDataDomain ?? domain;

  const siwa: Siwa = {
    account_address: opts.signerAddress,
    chain_id: "283",
    domain,
    "issued-at": new Date().toISOString(),
    ...(opts.includeNonce !== false ? { nonce: crypto.randomUUID() } : {}),
    "request-id": crypto.randomUUID(),
    statement: "Sign in to Pera Demo dApp with your Algorand account.",
    type: "ed25519",
    uri: window.location.origin,
    version: "1"
  } as Siwa;

  const canonicalJson = JSON.stringify(siwa, Object.keys(siwa).sort());

  const authenticatorData = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authDomain))
  );

  return {
    data: new Uint8Array(Buffer.from(canonicalJson)),
    signer: opts.signerAddress,
    domain,
    authenticatorData,
    requestId: crypto.randomUUID(),
    metadata: {
      scope: ScopeType.AUTH,
      encoding: "base64"
    }
  };
};

export const arc60Scenarios: Scenario[] = [
  {
    id: "arc60-auth-plain",
    title: "ARC-60 auth (preview)",
    description:
      "Sign-in-with-Algorand via ARC-60. Builds a canonical SIWA payload (domain, nonce, request-id, statement, etc.) with `authenticatorData = sha256(domain)`.",
    expected:
      "Wallet shows the SIWA fields (domain, statement, account, etc.) and the auth scope. User signs. Wallet returns `ed25519(sha256(data) || sha256(authenticatorData))`.",
    category: "arc60",
    modifiers: [],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({ signerAddress: address });
      return { payload };
    }
  },
  {
    id: "arc60-domain-mismatch",
    title: "ARC-60 auth — domain mismatch (expected reject)",
    description:
      "Builds an ARC-60 SIWA payload where `authenticatorData = sha256('evil.example.com')` does not match the SIWA payload's `domain` (the dApp's actual host).",
    expected:
      "Wallet detects the domain / authenticatorData mismatch and rejects the request before signing, surfacing a domain-mismatch error. No signature is produced.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        domain: window.location.host,
        authenticatorDataDomain: "evil.example.com"
      });
      return { payload };
    }
  },
  {
    id: "arc60-missing-nonce",
    title: "ARC-60 auth — missing nonce (expected reject)",
    description:
      "Builds an ARC-60 SIWA payload with the `nonce` field omitted (which the spec requires).",
    expected:
      "Wallet rejects the request per ARC-60 spec (missing required `nonce`) before signing. No signature is produced.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        includeNonce: false
      });
      return { payload };
    }
  }
];
