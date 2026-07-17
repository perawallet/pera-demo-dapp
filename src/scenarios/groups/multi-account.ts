import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildPayment } from "../builders/payment";
import { testAccounts } from "../test-accounts";
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
  },
  {
    id: "multi-account-two-groups-two-signers",
    title: "Sign 2 atomic groups, each from a different connected account",
    description:
      "Two 2-txn atomic groups in one request: group 1's txns are sent by the first connected account, group 2's by the second. The wallet must sign with different keys per group.",
    expected:
      "Wallet shows one popup with both groups, attributing each group to its own sender account. User signs once; both groups are submitted and accepted by algod.",
    category: "multi-account",
    modifiers: [],
    networks: ["testnet"],
    minAccounts: 2,
    async build(chain, _address, accounts) {
      const [signerA, signerB] = accounts;
      const suggestedParams = await apiGetTxnParams(chain);

      const g1t1 = buildPayment({
        sender: signerA,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "multi-account-two-groups g1 t1",
        suggestedParams
      });
      const g1t2 = buildPayment({
        sender: signerA,
        receiver: testAccounts[1].addr,
        amount: 100000,
        note: "multi-account-two-groups g1 t2",
        suggestedParams
      });
      algosdk.assignGroupID([g1t1, g1t2]);

      const g2t1 = buildPayment({
        sender: signerB,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "multi-account-two-groups g2 t1",
        suggestedParams
      });
      const g2t2 = buildPayment({
        sender: signerB,
        receiver: testAccounts[1].addr,
        amount: 100000,
        note: "multi-account-two-groups g2 t2",
        suggestedParams
      });
      algosdk.assignGroupID([g2t1, g2t2]);

      return {
        transaction: [
          [{ txn: g1t1 }, { txn: g1t2 }],
          [{ txn: g2t1 }, { txn: g2t2 }]
        ]
      };
    }
  },
  {
    id: "multi-account-non-atomic-two-signers",
    title: "Sign 2 non-atomic txns from different connected accounts",
    description:
      "Two standalone (ungrouped) payments in one request, the first sent by the first connected account and the second by the second.",
    expected:
      "Wallet shows one popup with two independent txns, each attributed to its own sender. User signs once; both are submitted separately and accepted by algod.",
    category: "multi-account",
    modifiers: [],
    networks: ["testnet"],
    minAccounts: 2,
    async build(chain, _address, accounts) {
      const [signerA, signerB] = accounts;
      const suggestedParams = await apiGetTxnParams(chain);
      const txn1 = buildPayment({
        sender: signerA,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "multi-account-non-atomic A",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: signerB,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "multi-account-non-atomic B",
        suggestedParams
      });
      return { transaction: [[{ txn: txn1 }], [{ txn: txn2 }]] };
    }
  },
  {
    id: "multi-account-atomic-with-external-slot",
    title: "Sign atomic group: 2 connected accounts + 1 external slot",
    description:
      "3-txn atomic group: slot 1 from the first connected account, slot 2 from the second, slot 3 from testAccounts[0] marked `signers: []` (signed locally by the dApp).",
    expected:
      "Wallet shows all three txns, marks slot 3 as not-to-be-signed, and returns two signatures (one per connected account). The dApp fills slot 3 with a local test-account signature and algod accepts the group.",
    category: "multi-account",
    modifiers: ["partial-sign"],
    networks: ["testnet"],
    minAccounts: 2,
    async build(chain, _address, accounts) {
      const [signerA, signerB] = accounts;
      const suggestedParams = await apiGetTxnParams(chain);
      const txn1 = buildPayment({
        sender: signerA,
        receiver: signerB,
        amount: 100000,
        note: "multi-account-external slot 1",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: signerB,
        receiver: signerA,
        amount: 100000,
        note: "multi-account-external slot 2",
        suggestedParams
      });
      const txn3 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: signerA,
        amount: 100000,
        note: "multi-account-external slot 3",
        suggestedParams
      });
      algosdk.assignGroupID([txn1, txn2, txn3]);
      return {
        transaction: [
          [{ txn: txn1 }, { txn: txn2 }, { txn: txn3, signers: [] }]
        ]
      };
    }
  }
];
