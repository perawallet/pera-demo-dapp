import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildPayment } from "../builders/payment";
import { buildAssetTransfer } from "../builders/asset";
import { getAssetIndex, AssetTransactionType } from "../asset-indexes";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

export const nonAtomicMultiScenarios: Scenario[] = [
  {
    id: "non-atomic-pay-x3",
    title: "Sign 3 non-atomic pay txns",
    description:
      "Three independent payment txns submitted as separate non-atomic groups. Regression case for the ARC-1 multi-group signing bug (previously connect-beta flat-batched these into one wallet call and algod rejected the resulting per-group POSTs).",
    expected:
      "Wallet shows three sequential signing popups (one per group). All three txns sign and submit successfully on TestNet. Activity log shows three 'Signed and sent' entries.",
    category: "non-atomic-multi",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const make = (n: number) =>
        buildPayment({
          sender: address,
          receiver: testAccounts[0].addr,
          amount: 100000 + n,
          note: `non-atomic-pay-x3 ${n}`,
          suggestedParams
        });
      return {
        transaction: [
          [{ txn: make(1) }],
          [{ txn: make(2), message: "This is a transaction message" }],
          [{ txn: make(3) }]
        ]
      };
    }
  },
  {
    id: "non-atomic-axfer-x3",
    title: "Sign 3 non-atomic asset transfer txns",
    description:
      "Three independent asset transfers (opt-in, transfer, transfer) submitted as separate non-atomic groups.",
    expected:
      "Wallet shows three sequential popups (one per group): opt-in, transfer, transfer. All three sign and submit successfully on TestNet.",
    category: "non-atomic-multi",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const optIn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: getAssetIndex(chain, AssetTransactionType.OptIn),
        note: "non-atomic-axfer-x3 optin",
        suggestedParams
      });
      const transferA = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 10000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "non-atomic-axfer-x3 transferA",
        suggestedParams
      });
      const transferB = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 30000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "non-atomic-axfer-x3 transferB",
        suggestedParams
      });
      return {
        transaction: [
          [{ txn: optIn }],
          [{ txn: transferA }],
          [{ txn: transferB, message: "This is a transaction message" }]
        ]
      };
    }
  },
  {
    id: "non-atomic-mixed-x3",
    title: "Sign 3 mixed non-atomic txns (pay + asset opt-in + asset transfer)",
    description:
      "Three independent txns of different types (payment, asset opt-in, asset transfer) submitted as separate non-atomic groups.",
    expected:
      "Wallet shows three sequential popups, each rendering the correct type-specific UI (payment, opt-in, transfer). All three sign and submit successfully on TestNet.",
    category: "non-atomic-multi",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const pay = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100001,
        note: "non-atomic-mixed-x3 pay",
        suggestedParams
      });
      const optIn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: getAssetIndex(chain, AssetTransactionType.OptIn),
        note: "non-atomic-mixed-x3 optin",
        suggestedParams
      });
      const transfer = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 10000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "non-atomic-mixed-x3 transfer",
        suggestedParams
      });
      return {
        transaction: [[{ txn: pay }], [{ txn: optIn }], [{ txn: transfer }]]
      };
    }
  }
];
