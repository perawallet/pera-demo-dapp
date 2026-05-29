import {apiGetTxnParams} from "../../core/utils/algod/algod";
import {AssetTransactionType, getAssetIndex} from "../asset-indexes";
import {
  buildAssetCreate,
  buildAssetDestroy,
  buildAssetFreeze,
  buildAssetReconfig,
  buildAssetTransfer
} from "../builders/asset";
import {testAccounts} from "../test-accounts";
import type {Scenario} from "../types";

const INVALID_ASSET_INDEX = 100;

export const singleAssetScenarios: Scenario[] = [
  {
    id: "single-axfer-opt-in",
    title: "Sign single asset opt-in txn",
    description:
      "Opt-in to a TestNet sample asset (0-amount self-transfer of the asset). No close, no rekey.",
    expected:
      "Wallet shows an asset opt-in txn (asset id, sender = receiver, amount 0). User signs; algod accepts and the account is now opted-in to the asset.",
    category: "single-axfer",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: getAssetIndex(chain, AssetTransactionType.OptIn),
        note: "single-axfer-opt-in",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-opt-in-invalid-asset",
    title: "Sign single asset opt-in txn to invalid asset",
    description: "Opt-in attempt against a non-existent asset ID (100).",
    expected:
      "Wallet displays the asset txn and may sign it (asset id is well-formed). On submit, algod rejects with an asset-does-not-exist error.",
    category: "single-axfer",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: INVALID_ASSET_INDEX,
        note: "single-axfer-opt-in-invalid-asset",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-opt-in",
    title: "Sign single asset opt-in txn with rekey",
    description:
      "Opt-in to a TestNet sample asset (0-amount self-transfer of the asset). With a rekey.",
    expected:
      "Wallet shows an asset opt-in txn (asset id, sender = receiver, amount 0). User can sign; algod accepts and the auth address is updated.",
    category: "single-axfer",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: getAssetIndex(chain, AssetTransactionType.OptIn),
        note: "single-axfer-opt-in",
        rekeyTo: testAccounts[0].addr,
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-transfer-plain",
    title: "Sign single asset transfer txn",
    description:
      "Transfer 1,000,000 units of the TestNet sample asset to a test account. No close, no rekey.",
    expected:
      "Wallet shows an asset transfer txn (asset id, sender, receiver, amount, fee). User signs; algod accepts and the txn lands.",
    category: "single-axfer",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "single-axfer-transfer-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-transfer-with-close",
    title: "Sign single asset transfer txn with close-to",
    description:
      "Asset transfer with `closeRemainderTo` set — closes the sender's asset holding to the close-to account after the transfer.",
    expected:
      "Wallet displays the asset transfer AND prominently warns that the sender's full asset holding will be closed to the close-to address (the sender will be opted-out of the asset). User can sign; algod accepts.",
    category: "single-axfer",
    modifiers: ["close"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "single-axfer-transfer-with-close",
        closeRemainderTo: testAccounts[1].addr,
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-transfer-invalid-asset",
    title: "Sign single invalid asset transfer txn",
    description: "Asset transfer against a non-existent asset ID (100).",
    expected:
      "Wallet displays the asset txn and may sign it (asset id is well-formed). On submit, algod rejects with an asset-does-not-exist error.",
    category: "single-axfer",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: INVALID_ASSET_INDEX,
        note: "single-axfer-transfer-invalid-asset",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-axfer-transfer-with-rekey",
    title: "Sign single asset transfer txn with rekey",
    description:
      "Asset transfer with `rekeyTo` set — changes the account's signing key to the new address after this txn.",
    expected:
      "Wallet displays the asset transfer AND prominently warns that the account will be rekeyed to the rekey target (irreversible). User can sign; algod accepts and the auth address is updated.",
    category: "single-axfer",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "single-axfer-transfer-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-create-plain",
    title: "Sign single asset create txn (full metadata)",
    description:
      "Create a new asset with full metadata: name, unit, URL, manager/reserve/freeze/clawback all set. No rekey.",
    expected:
      "Wallet shows an asset-create txn with all metadata fields and the four manager addresses. User signs; algod accepts and the account becomes the new asset's creator and manager.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetCreate({
        sender: address,
        total: 1000000n,
        decimals: 2,
        defaultFrozen: false,
        unitName: "EX",
        assetName: "Example asset",
        assetURL: "https://example.com",
        manager: address,
        reserve: testAccounts[0].addr,
        freeze: testAccounts[2].addr,
        clawback: testAccounts[1].addr,
        note: "single-acfg-create-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-create-minimal",
    title: "Sign single asset create txn (minimal fields)",
    description:
      "Create an asset with only the required fields (total, decimals, defaultFrozen). No name, no URL, no manager addresses.",
    expected:
      "Wallet shows a minimal asset-create txn with empty metadata fields and no manager addresses. User signs; algod accepts and creates a permanently-locked asset (no manager).",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetCreate({
        sender: address,
        total: 1,
        decimals: 0,
        defaultFrozen: false,
        note: "single-acfg-create-minimal",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-create-with-rekey",
    title: "Sign single asset create txn with rekey",
    description: "Create an asset with full metadata and `rekeyTo` set.",
    expected:
      "Wallet shows the asset-create txn AND prominently warns that the account will be rekeyed to the rekey target. User can sign; algod accepts both the create and the rekey.",
    category: "single-acfg",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetCreate({
        sender: address,
        total: 1000000n,
        decimals: 2,
        defaultFrozen: false,
        unitName: "EX",
        assetName: "Example asset",
        assetURL: "https://example.com",
        manager: address,
        reserve: testAccounts[0].addr,
        freeze: testAccounts[2].addr,
        clawback: testAccounts[1].addr,
        note: "single-acfg-create-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-reconfig-plain",
    title: "Sign single asset reconfig txn (change manager)",
    description:
      "Reconfigure the TestNet sample asset's manager/reserve/freeze/clawback addresses, with `strictEmptyAddressChecking: true`. Sender must currently be the asset's manager.",
    expected:
      "Wallet displays an asset-config txn with the new manager/reserve/freeze/clawback addresses. User signs. On submit, algod accepts only if the sender is the current manager; otherwise rejects with an authorization error.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetReconfig({
        sender: address,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        manager: testAccounts[1].addr,
        reserve: testAccounts[2].addr,
        freeze: testAccounts[0].addr,
        clawback: address,
        strictEmptyAddressChecking: true,
        note: "single-acfg-reconfig-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-reconfig-clear-all",
    title: "Sign single asset reconfig txn (clear all addresses)",
    description:
      "Reconfigure the TestNet sample asset, clearing manager/reserve/freeze/clawback (all omitted) with `strictEmptyAddressChecking: false`. Sender must currently be the asset's manager.",
    expected:
      "Wallet displays an asset-config txn with all four manager addresses cleared, and prominently warns that the asset's configuration will be permanently locked. User can sign. On submit, algod accepts only if the sender is the current manager.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetReconfig({
        sender: address,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        strictEmptyAddressChecking: false,
        note: "single-acfg-reconfig-clear-all",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-acfg-destroy-plain",
    title: "Sign single asset destroy txn",
    description:
      "Destroy the TestNet sample asset. Sender must currently be the asset's manager and hold the entire supply.",
    expected:
      "Wallet displays an asset-destroy txn and prominently warns that the asset will be permanently destroyed. User can sign. On submit, algod accepts only if the sender is the manager and holds the full supply; otherwise rejects.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetDestroy({
        sender: address,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        note: "single-acfg-destroy-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-afrz-freeze-plain",
    title: "Sign single asset freeze txn",
    description:
      "Freeze a target account's holding of the TestNet sample asset (`frozen: true`). Sender must currently be the asset's freeze address.",
    expected:
      "Wallet shows an asset-freeze txn naming the target account and the asset. User signs. On submit, algod accepts only if the sender holds the asset's freeze role; otherwise rejects.",
    category: "single-afrz",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetFreeze({
        sender: address,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        freezeTarget: testAccounts[0].addr,
        frozen: true,
        note: "single-afrz-freeze-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  },
  {
    id: "single-afrz-unfreeze-plain",
    title: "Sign single asset unfreeze txn",
    description:
      "Unfreeze a target account's holding of the TestNet sample asset (`frozen: false`). Sender must currently be the asset's freeze address.",
    expected:
      "Wallet shows an asset-unfreeze txn naming the target account and the asset. User signs. On submit, algod accepts only if the sender holds the asset's freeze role; otherwise rejects.",
    category: "single-afrz",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetFreeze({
        sender: address,
        assetIndex: getAssetIndex(chain, AssetTransactionType.Transfer),
        freezeTarget: testAccounts[0].addr,
        frozen: false,
        note: "single-afrz-unfreeze-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  }
];
