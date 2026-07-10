import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildPayment } from "../builders/payment";
import type { Scenario } from "../types";

export const multiAccountScenarios: Scenario[] = [
  {
    id: "multi-account-atomic-2-signers",
    title: "Sign atomic group with 2 connected accounts (multi-signer)",
    description:
      "2-txn atomic group whose slots are sent by TWO different session-approved accounts: slot 1 from the first connected account, slot 2 from the second. Neither slot is marked `signers: []`, so the wallet must resolve and sign for both approved accounts in a single request. Requires connecting with at least 2 accounts.",
    expected:
      "Wallet shows one popup containing both payments, each attributed to its own sender. The user signs once; the wallet returns two signatures (one per account). Algod accepts the group atomically. Activity log shows 'Signed and sent'.",
    category: "multi-account",
    modifiers: [],
    networks: ["testnet"],
    minAccounts: 2,
    async build(chain, _address, accounts) {
      const [signerA, signerB] = accounts;
      const suggestedParams = await apiGetTxnParams(chain);

      const txn1 = buildPayment({
        sender: signerA,
        receiver: signerB,
        amount: 100000,
        note: "multi-account-atomic-2-signers A->B",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: signerB,
        receiver: signerA,
        amount: 100000,
        note: "multi-account-atomic-2-signers B->A",
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2]);

      return {
        transaction: [
          [
            { txn: txn1, message: "Signed by account 1" },
            { txn: txn2, message: "Signed by account 2" }
          ]
        ]
      };
    }
  }
];
