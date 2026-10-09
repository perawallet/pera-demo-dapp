import type { Scenario } from "../types";

export const emptySignatureScenarios: Scenario[] = [
  {
    id: "empty-signatures",
    title: "Get empty signatures",
    description:
      "Asks the wallet for each connected account's empty signature (use-wallet's `algo_getEmptySignatures`, or `window.pera.getEmptySignatures()` on the extension): a `SignedTransaction` without `txn`, which tells the account type and lets a dApp simulate fees.",
    expected:
      "No prompt in the wallet. The log lists each connected account's type (ed25519, multisig, logic sig or post-quantum) and its auth address when rekeyed. Pera versions without the method time out after 30 seconds; over WalletConnect v2 this demo reports it as not supported.",
    category: "empty-signatures",
    modifiers: [],
    networks: ["testnet", "mainnet"],
    kind: "empty-signatures",
    // The request carries no payload; SignTxn calls the wallet directly.
    async build() {
      return { notice: "Empty signatures need no transactions." };
    }
  }
];
