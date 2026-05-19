import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { AssetTransactionType, getAssetIndex } from "../asset-indexes";
import { buildAssetTransfer } from "../builders/asset";
import { buildPayment } from "../builders/payment";
import { asAtomicGroup } from "../modifiers";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

export const atomicGroupScenarios: Scenario[] = [
  {
    id: "atomic-sign-1-of-2",
    title: "Sign 1 txn from a 2-txn atomic group",
    description:
      "2-txn atomic group: an asset opt-in by the connected account and an asset transfer from a different sender (signers: []).",
    expected:
      "Wallet shows one popup containing both txns and marks the second slot as external / not-signed-here. User signs the opt-in only; the second slot returns null/unsigned. Group is incomplete until the external party co-signs.",
    category: "atomic-group",
    modifiers: ["partial-sign"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

      const txn1 = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: optInAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 1000000,
        assetIndex: transferAssetIndex,
        note: "example note value",
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2]);

      return {
        transaction: [[{ txn: txn1 }, { txn: txn2, signers: [] }]]
      };
    }
  },
  {
    id: "atomic-sign-2-of-3",
    title: "Sign 2 txns from a 3-txn atomic group",
    description:
      "3-txn atomic group: an asset opt-in by the connected account, an asset transfer from a different sender (signers: []), and a payment from the connected account.",
    expected:
      "Wallet shows one popup containing all 3 txns and marks slot 2 as external. User signs slots 1 and 3; slot 2 returns null/unsigned. Group remains incomplete until the external party co-signs.",
    category: "atomic-group",
    modifiers: ["partial-sign"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

      const txn1 = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: optInAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 1000000,
        assetIndex: transferAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn3 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 500000,
        note: "this is a payment txn",
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2, txn3]);

      return {
        transaction: [
          [
            { txn: txn1 },
            { txn: txn2, signers: [] },
            { txn: txn3, message: "This is a transaction message" }
          ]
        ]
      };
    }
  },
  {
    id: "atomic-pay-optin-transfer",
    title: "Sign atomic group with pay + asset opt-in + asset transfer",
    description:
      "3-txn atomic group composing a common DeFi setup: a payment, an asset opt-in, and an asset transfer. All txns are sent by the connected account.",
    expected:
      "Wallet shows one popup containing all 3 txns with type-specific UI per slot. User signs the group. Algod accepts all 3 atomically.",
    category: "atomic-group",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

      const txn1 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 500000,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: optInAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn3 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: transferAssetIndex,
        note: "example note value",
        suggestedParams
      });

      return { transaction: [asAtomicGroup([txn1, txn2, txn3])] };
    }
  },
  {
    id: "atomic-pay-rekey",
    title: "Sign atomic group with payment + rekey",
    description:
      "2-txn atomic group: a plain payment followed by a payment with `rekeyTo` set.",
    expected:
      "Wallet shows one popup containing both payments and prominently warns that slot 2 will rekey the account (irreversible). User can sign; algod accepts both txns and the auth address is updated.",
    category: "atomic-group",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn1 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 500000,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 500000,
        note: "example note value",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2]);

      return {
        transaction: [
          [
            { txn: txn1 },
            { txn: txn2, message: "This is a transaction message" }
          ]
        ]
      };
    }
  },
  {
    id: "atomic-with-asset-close",
    title: "Sign atomic group containing an asset close",
    description:
      "2-txn atomic group: an asset transfer followed by an asset transfer with `closeRemainderTo` set (asset close-out).",
    expected:
      "Wallet shows one popup containing both txns and prominently warns that slot 2 will close out the sender's asset holding (sender will be opted-out of the asset). User can sign; algod accepts both txns.",
    category: "atomic-group",
    modifiers: ["close"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);

      const txn1 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex: closeAssetIndex,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });

      return { transaction: [asAtomicGroup([txn1, txn2])] };
    }
  },
  {
    id: "atomic-with-rekey",
    title: "Sign atomic group containing a rekey",
    description:
      "2-txn atomic group of asset transfers; the second txn has `rekeyTo` set.",
    expected:
      "Wallet shows one popup containing both asset transfers and prominently warns that slot 2 will rekey the account. User can sign; algod accepts both txns.",
    category: "atomic-group",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

      const txn1 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex,
        note: "example note value",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2]);

      return {
        transaction: [
          [
            { txn: txn1, message: "This is a transaction message" },
            { txn: txn2 }
          ]
        ]
      };
    }
  },
  {
    id: "atomic-with-rekey-and-asset-close",
    title: "Sign atomic group with rekey and asset close",
    description:
      "4-txn atomic group of asset transfers mixing both irreversible actions: slot 2 has `closeRemainderTo`, slot 3 has `rekeyTo`, and slot 4 has both.",
    expected:
      "Wallet shows one popup containing all 4 txns and prominently warns about every irreversible action across the affected slots (asset close on slot 2, rekey on slot 3, both on slot 4). User can sign; algod accepts the group atomically.",
    category: "atomic-group",
    modifiers: ["close", "rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);

      const txn1 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 10,
        assetIndex,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 20,
        assetIndex: closeAssetIndex,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });
      const txn3 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 30,
        assetIndex,
        note: "example note value",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });
      const txn4 = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 40,
        assetIndex,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2, txn3, txn4]);

      return {
        transaction: [
          [
            { txn: txn1, message: "This is a transaction message" },
            { txn: txn2 },
            { txn: txn3 },
            { txn: txn4, message: "This is a transaction message" }
          ]
        ]
      };
    }
  },
  {
    id: "atomic-group-of-7",
    title: "Sign atomic group of 7 mixed txns",
    description:
      "7-txn atomic group covering a wide mix: asset opt-in, asset transfer, asset close, payment, account-close payment, account-rekey payment, and a payment with both close and rekey.",
    expected:
      "Wallet shows one popup containing all 7 txns with type-specific UI per slot and warnings on every close/rekey slot. User can sign; algod accepts all 7 atomically.",
    category: "atomic-group",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const transferAssetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);
      const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);
      const closeAssetIndex = getAssetIndex(chain, AssetTransactionType.Close);

      const optIn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: optInAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const assetXfer = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex: transferAssetIndex,
        note: "example note value",
        suggestedParams
      });
      const assetClose = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50,
        assetIndex: closeAssetIndex,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });
      const payment = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 500000,
        note: "example note value",
        suggestedParams
      });
      const accountClose = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 0,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });
      const accountRekey = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000,
        note: "example note value",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });
      const accountRekeyAndClose = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 50000,
        note: "example note value",
        closeRemainderTo: testAccounts[1].addr,
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });

      return {
        transaction: [
          asAtomicGroup([
            optIn,
            assetXfer,
            assetClose,
            payment,
            accountClose,
            accountRekey,
            accountRekeyAndClose
          ])
        ]
      };
    }
  },
  {
    id: "atomic-full-group-of-16",
    title: "Sign full atomic group (16 txns, max group size)",
    description:
      "16-txn atomic group built as 8 (asset opt-in, asset close-out) pairs — the maximum allowed group size.",
    expected:
      "Wallet shows one popup containing all 16 txns (8 opt-ins, 8 close-outs with close warnings). User can sign; algod accepts the full-capacity group atomically.",
    category: "atomic-group",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = getAssetIndex(chain, AssetTransactionType.Transfer);

      const txns: algosdk.Transaction[] = [];
      for (let i = 0; i < 8; i++) {
        const optIn = buildAssetTransfer({
          sender: address,
          receiver: address,
          amount: 0,
          assetIndex,
          note: "example note value",
          suggestedParams
        });
        const closeOut = buildAssetTransfer({
          sender: address,
          receiver: address,
          amount: 0,
          assetIndex,
          note: "example note value",
          closeRemainderTo: testAccounts[1].addr,
          suggestedParams
        });
        txns.push(optIn, closeOut);
      }

      return { transaction: [asAtomicGroup(txns)] };
    }
  },
  {
    id: "atomic-zero-fee-pooling",
    title: "Sign atomic group with fee pooling (0-fee + double-fee)",
    description:
      "2-txn atomic group where slot 1 has its fee set to 0 and slot 2 absorbs both txns' fees via fee pooling. Slot 1 is sent from a different account (signers: []) so the wallet signs only slot 2.",
    expected:
      "Wallet shows one popup with both txns: slot 1 marked external and 0-fee, slot 2 showing a doubled fee. User signs slot 2 only; algod accepts the group because pooled fees cover both txns.",
    category: "atomic-group",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn1 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 100001,
        note: "txn with 0 fee",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100001,
        note: "txn with double fee",
        suggestedParams
      });

      txn2.fee += txn1.fee;
      txn1.fee = 0n;

      algosdk.assignGroupID([txn1, txn2]);

      return {
        transaction: [[{ txn: txn1, signers: [] }, { txn: txn2 }]]
      };
    }
  },
  {
    id: "atomic-invalid-grouping",
    title: "Sign atomic group with broken grouping (missing member)",
    description:
      "Builds 5 grouped txns, assigns a group ID across all 5, then drops the last one before sending — producing a group whose declared groupID references a txn not present in the request.",
    expected:
      "Wallet either refuses to display the malformed group, or signs and lets algod reject on submit with a group-incomplete / bad-group-id error. No successful submission. // TODO: verify expected behavior in the wallet",
    category: "atomic-group",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn1 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        note: "example note value",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        note: "example note value",
        suggestedParams
      });
      const txn3 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        note: "example note value",
        suggestedParams
      });
      const txn4 = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        note: "example note value",
        suggestedParams
      });
      const txn5 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 1000000,
        note: "example note value",
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2, txn3, txn4, txn5]);

      return {
        transaction: [[{ txn: txn1 }, { txn: txn2 }, { txn: txn3 }, { txn: txn4 }]]
      };
    }
  },
  {
    id: "atomic-no-sign-txn",
    title: "Sign atomic group where no txn needs signing",
    description:
      "3-txn atomic group where every slot has `signers: []` (all txns are sent by another account). The connected wallet has nothing to sign.",
    expected:
      "Wallet either rejects the request up front (nothing-to-sign) or returns three null/unsigned slots. No signatures are produced. // TODO: verify expected behavior in the wallet",
    category: "atomic-group",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn1 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 100001,
        note: "txn 1",
        suggestedParams
      });
      const txn2 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 100002,
        note: "txn 2",
        suggestedParams
      });
      const txn3 = buildPayment({
        sender: testAccounts[0].addr,
        receiver: address,
        amount: 100003,
        note: "txn 3",
        suggestedParams
      });

      algosdk.assignGroupID([txn1, txn2, txn3]);

      return {
        transaction: [
          [
            { txn: txn1, signers: [] },
            { txn: txn2, signers: [] },
            { txn: txn3, signers: [] }
          ]
        ]
      };
    }
  }
];
