import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildPayment } from "../builders/payment";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

const INVALID_AUTH_ADDRESS = "INVALIDADDRESS_FORSIGNINGTESTING_DONOTSEND_AAAAAAAAAAAAAAAAAAAA";

export const singlePayScenarios: Scenario[] = [
  {
    id: "single-pay-plain",
    title: "Sign single pay txn",
    description:
      "One plain payment of 100,000 µAlgo to a test account. No group, no close, no rekey.",
    expected:
      "Wallet shows a single payment txn (sender, receiver, amount, fee). User signs. Algod accepts and the txn lands in the next round.",
    category: "single-pay",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "single-pay-plain",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-pay-with-close",
    title: "Sign single pay txn with close-to",
    description:
      "Payment with `closeRemainderTo` set — drains the sender's remaining balance to the close-to receiver after the amount transfer.",
    expected:
      "Wallet displays the payment amount AND prominently warns that the sender's remaining balance will be sent to the close-to address. User can sign; algod accepts the txn.",
    category: "single-pay",
    modifiers: ["close"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "single-pay-with-close",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-pay-with-rekey",
    title: "Sign single pay txn with rekey",
    description:
      "Payment with `rekeyTo` set — changes the account's signing key to the new address after this txn.",
    expected:
      "Wallet displays the payment AND prominently warns that the account will be rekeyed to the rekey target (irreversible). User can sign; algod accepts and the auth address is updated.",
    category: "single-pay",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "single-pay-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-pay-with-rekey-and-close",
    title: "Sign single pay txn with rekey and close",
    description:
      "Payment with both `closeRemainderTo` and `rekeyTo` set on the same txn.",
    expected:
      "Wallet displays the payment AND prominently warns about BOTH irreversible actions: account close (remaining balance to close-to) and rekey (auth key changes). User can sign; algod accepts.",
    category: "single-pay",
    modifiers: ["close", "rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "single-pay-with-rekey-and-close",
        closeRemainderTo: testAccounts[1].addr,
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-pay-invalid-auth-address",
    title: "Sign single pay txn with invalid auth address",
    description:
      "Payment whose SignerTransaction wrapper carries a malformed `authAddr` string (invalid base32). Tests wallet validation of the auth-address slot.",
    expected:
      "Wallet rejects the request before showing signing UI, surfacing a malformed-address / invalid-authAddr error. No signature is produced.",
    category: "single-pay",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "single-pay-invalid-auth-address",
        suggestedParams
      });
      return {
        transaction: [
          [{ txn, authAddr: INVALID_AUTH_ADDRESS }]
        ]
      };
    }
  },
  {
    id: "single-pay-zero-amount",
    title: "Sign single pay txn with zero amount",
    description:
      "Payment of 0 µAlgo (the shape used for rekey-only or close-only setups in some flows).",
    expected:
      "Wallet shows the payment with amount 0 (no warnings beyond the standard fee). User signs; algod accepts and the txn lands.",
    category: "single-pay",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 0,
        note: "single-pay-zero-amount",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-pay-large-note",
    title: "Sign single pay txn with large (1KB) note",
    description:
      "Payment with the note field filled to algod's 1024-byte limit (1024 bytes of 0x61).",
    expected:
      "Wallet displays the payment and either renders the full 1KB note or shows a truncated preview without choking. User signs; algod accepts the max-size note.",
    category: "single-pay",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: new Uint8Array(1024).fill(0x61),
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  }
];
