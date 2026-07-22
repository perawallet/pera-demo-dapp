import type { Siwa, PeraWalletArc60SignData } from "@perawallet/connect";
import type { Scenario } from "../types";
import { testAccounts } from "../test-accounts";
import algosdk from "algosdk";

export const buildArc60Payload = async (opts: {
  signerAddress: string;
  domain?: string;
  authenticatorDataDomain?: string;
  includeNonce?: boolean;
  chainId?: string;
  /** Sets the SIWA payload's account_address independently of the top-level
   *  signer, to model rekeyed/mismatched-signer requests. */
  accountAddressOverride?: string;
  version?: string;
  issuedAt?: string;
  expiredTime?: string;
  notBefore?: string;
  /** SIWA fields to delete before canonicalization (schema-violation cases). */
  omitFields?: string[];
}): Promise<PeraWalletArc60SignData> => {
  const domain = opts.domain ?? window.location.host;
  const authDomain = opts.authenticatorDataDomain ?? domain;

  const siwa: Siwa = {
    account_address: opts.accountAddressOverride ?? opts.signerAddress,
    chain_id: opts.chainId ?? "283",
    domain,
    "issued-at": opts.issuedAt ?? new Date().toISOString(),
    ...(opts.includeNonce !== false ? { nonce: crypto.randomUUID() } : {}),
    "request-id": crypto.randomUUID(),
    statement: "Sign in to Pera Demo dApp with your Algorand account.",
    type: "ed25519",
    uri: window.location.origin,
    version: opts.version ?? "1",
    "expiration-time": opts.expiredTime,
    "not-before": opts.notBefore,
  } as Siwa;

  for (const field of opts.omitFields ?? []) {
    delete (siwa as unknown as Record<string, unknown>)[field];
  }

  const canonicalJson = JSON.stringify(siwa, Object.keys(siwa).sort());

  const authenticatorData = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authDomain))
  );

  return {
    data: Buffer.from(canonicalJson).toString("base64"),
    signer: algosdk.decodeAddress(opts.signerAddress).publicKey,
    domain,
    authenticatorData,
    requestId: crypto.randomUUID()
  };
};

export const arc60Scenarios: Scenario[] = [
  {
    id: "arc60-auth-plain",
    title: "ARC-60 auth",
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
    title: "ARC-60 auth — missing nonce (expected pass)",
    description:
      "Builds an ARC-60 SIWA payload with the `nonce` field omitted (which is allowed by the spec).",
    expected:
      "Wallet signs the request per ARC-60 spec.",
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
  },
  {
    id: "arc60-alternate-chain-id",
    title: "ARC-60 auth — different chain id",
    description:
      "SIWA payload with `chain_id: 'algorand:mainnet'`.",
    expected:
      "Wallet signs the request per ARC-60.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({ signerAddress: address, chainId: "999" });
      return { payload };
    }
  },
  {
    id: "arc60-signer-mismatch",
    title: "ARC-60 auth — account_address differs from signer (expected reject)",
    description:
      "SIWA payload whose `account_address` is testAccounts[0] while the top-level `signer` is the connected account — models a rekeyed / mismatched-signer request.",
    expected:
      "Wallet detects that the payload's account_address doesn't match the requested signer and rejects before signing (unless it explicitly supports rekeyed signing with the auth key it holds). No signature for the mismatched account is produced.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        accountAddressOverride: testAccounts[0].addr.toString()
      });
      return { payload };
    }
  },
  {
    id: "arc60-invalid-schema",
    title: "ARC-60 auth — invalid SIWA schema (expected reject)",
    description:
      "SIWA payload with required fields `domain` and `type` removed, violating the ARC-60 schema.",
    expected:
      "Wallet fails schema validation and rejects the request before signing, naming the missing field(s). No signature is produced.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        omitFields: ["domain", "type"]
      });
      return { payload };
    }
  },
  {
    id: "arc60-future-issued-at",
    title: "ARC-60 auth — issued-at in the future (expected reject)",
    description:
      "SIWA payload whose `issued-at` timestamp is one hour in the future.",
    expected:
      "Wallet rejects the request (or at minimum warns) because the sign-in claims to have been issued in the future. No signature is produced on strict validation.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        issuedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      return { payload };
    }
  },
  {
    id: "arc60-future-not-before",
    title: "ARC-60 auth — not-before in the future (expected reject)",
    description:
      "SIWA payload whose `not-before` timestamp is one hour in the future.",
    expected:
      "Wallet rejects the request (or at minimum warns) because the sign-in claims to not be usable before a time in the future. No signature is produced on strict validation.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        notBefore: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      return { payload };
    }
  },
  {
    id: "arc60-past-expired-time",
    title: "ARC-60 auth — expiration-time in the past (expected reject)",
    description:
      "SIWA payload whose `expiration-time` timestamp is one hour in the past.",
    expected:
      "Wallet rejects the request (or at minimum warns) because the sign-in has expired. No signature is produced on strict validation.",
    category: "arc60",
    modifiers: ["invalid"],
    networks: ["testnet", "mainnet"],
    kind: "arc60",
    async build(_chain, address) {
      const payload = await buildArc60Payload({
        signerAddress: address,
        expiredTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });
      return { payload };
    }
  }
];
