import type {ChainType} from "../algod/algod";
import {getNetworkConfig, MAINNET_CHAIN_ID, TESTNET_CHAIN_ID} from "../algod/networks";

/** The part of the SDK's `PeraWalletArc60SignerResolution` this dApp uses.
 *  Declared structurally rather than imported so this module and its tests
 *  never have to resolve `@perawallet/connect`'s ESM exports map under Jest. */
export interface Arc60SignerResolution {
  /** The auth address when the account is rekeyed, the account itself otherwise. */
  signerAddress: string;
  /** `signerAddress` as a public key, ready for `PeraWalletArc60SignData.signer`. */
  signer: Uint8Array;
  isRekeyed: boolean;
}

/** `PeraWalletConnect.resolveArc60Signer(accountAddress)`, with the network
 *  left to the session's pinned chain ID. */
export type Arc60SignerLookup = (
  accountAddress: string
) => Promise<Arc60SignerResolution>;

export type Arc60SignerOutcome =
  | {status: "resolved"; resolution: Arc60SignerResolution}
  | {status: "unavailable"; reason: string};

/**
 * Resolves who has to sign an ARC-60 request. An ARC-60 signature verifies
 * against the `signer` key and Pera never substitutes another one, so a
 * rekeyed account has to name its on-chain auth address as `signer` while the
 * SIWA payload keeps the account as `account_address`. ARC-60 itself carries
 * no network, so this has to be resolved dApp-side before the wallet request.
 *
 * Only attempted on MainNet and TestNet. A rekey is per network and the wallet
 * checks it on whichever network it is connected to, which connect cannot
 * observe; a session pinned to MainNet's or TestNet's chain ID is only served
 * while the wallet is on that network, so the lookup agrees with the wallet and
 * the network needs no argument. An all-networks session (LocalNet and Custom,
 * chain ID 4160) or BetaNet gives connect nothing reliable to read, so
 * resolution is reported unavailable rather than guessed — matching the SDK,
 * which throws instead of assuming "not rekeyed".
 *
 * A failed lookup is left to propagate: silently falling back to the account's
 * own key is what makes rekeyed accounts fail confusingly at the wallet.
 */
export const resolveArc60SignerForChain = async (
  chain: ChainType,
  accountAddress: string,
  lookup: Arc60SignerLookup
): Promise<Arc60SignerOutcome> => {
  const {chainId, label} = getNetworkConfig(chain);

  if (chainId !== MAINNET_CHAIN_ID && chainId !== TESTNET_CHAIN_ID) {
    return {
      status: "unavailable",
      reason: `${label} signs under chain ID ${chainId}, which Pera Connect cannot read accounts on, so the ARC-60 signer was left as the connected account. A rekeyed account will be rejected by the wallet here.`
    };
  }

  return {status: "resolved", resolution: await lookup(accountAddress)};
};
