import {apiGetTxnParams, ChainType, clientForChain} from "../../core/utils/algod/algod";
import {AssetTransactionType, getAssetIndex} from "../asset-indexes";
import {
  buildAssetCreate,
  buildAssetDestroy,
  buildAssetFreeze,
  buildAssetReconfig,
  buildAssetTransfer
} from "../builders/asset";
import {getOwnedAsset, networkForChain, setOwnedAsset} from "../owned-asset";
import {testAccounts} from "../test-accounts";
import type {Scenario} from "../types";

const INVALID_ASSET_INDEX = 100;

const requireOwnedAsset = (chain: ChainType, address: string): number => {
  const assetId = getOwnedAsset(networkForChain(chain), address);
  if (assetId === null) {
    throw new Error("Run 'Create test asset (setup)' first.");
  }
  return assetId;
};

export const singleAssetScenarios: Scenario[] = [
  {
    id: "single-acfg-create-owned",
    title: "Create test asset (setup)",
    description:
      "Creates an asset owned entirely by the connected account (manager/reserve/freeze/clawback all set to it) and remembers its ID locally, unlocking the asset reconfig/freeze/destroy/clawback scenarios. Prompts for an existing asset ID first — enter one you created earlier to reuse it (avoids piling up min-balance from repeated creates), or leave blank to create a new one.",
    expected:
      "Reuse path: no wallet interaction; the dApp validates the asset's manager/freeze/clawback are the connected account and stores the ID. Create path: wallet shows an asset-create txn with all four role addresses set to the connected account. User signs; algod accepts; the dApp stores the new asset ID.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    captureCreatedAsset: true,
    async build(chain, address) {
      const network = networkForChain(chain);
      const existing = prompt(
        "Asset ID to reuse as the test asset (leave blank to create a new one):"
      );
      if (existing && existing.trim() !== "") {
        const assetId = Number(existing.trim());
        if (!Number.isInteger(assetId) || assetId <= 0) {
          throw new Error(`"${existing}" is not a valid asset ID.`);
        }
        const assetInfo = await clientForChain(chain).getAssetByID(assetId).do();
        const roles = {
          manager: String(assetInfo.params.manager ?? ""),
          freeze: String(assetInfo.params.freeze ?? ""),
          clawback: String(assetInfo.params.clawback ?? "")
        };
        const wrongRoles = Object.entries(roles)
          .filter(([, holder]) => holder !== address)
          .map(([role]) => role);
        if (wrongRoles.length > 0) {
          throw new Error(
            `Asset ${assetId} can't be used: its ${wrongRoles.join(", ")} ` +
              `role(s) aren't held by the connected account.`
          );
        }
        setOwnedAsset(network, address, assetId);
        return { notice: `Reusing asset ${assetId} as the owned test asset.` };
      }

      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetCreate({
        sender: address,
        total: 1000000n,
        decimals: 2,
        defaultFrozen: false,
        unitName: "PDT",
        assetName: "Pera Demo Test Asset",
        manager: address,
        reserve: address,
        freeze: address,
        clawback: address,
        note: "single-acfg-create-owned",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
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
    id: "single-axfer-opt-in-with-rekey",
    title: "Sign single asset opt-in txn with rekey",
    description:
      "Opt-in to a TestNet sample asset (0-amount self-transfer of the asset). With a rekey.",
    expected:
      "Wallet shows an asset opt-in txn (asset id, sender = receiver, amount 0). User can sign; algod accepts and the auth address is updated.",
    category: "single-axfer",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: getAssetIndex(chain, AssetTransactionType.OptIn),
        note: "single-axfer-opt-in-with-rekey",
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
    id: "single-axfer-clawback",
    title: "Sign single asset clawback transfer txn",
    description:
      "Clawback transfer of the owned test asset: the connected account (the asset's clawback address) revokes 1 unit from its own holding back to itself (`assetSender` set). Self-to-self keeps it submittable without extra opt-ins.",
    expected:
      "Wallet displays the txn distinctly as a CLAWBACK (revoking from the target account), not a normal transfer. User signs; algod accepts because the sender holds the asset's clawback role.",
    category: "single-axfer",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    async build(chain, address) {
      const assetIndex = requireOwnedAsset(chain, address);
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetTransfer({
        sender: address,
        receiver: address,
        assetSender: address,
        amount: 1,
        assetIndex,
        note: "single-axfer-clawback",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
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
    id: "single-acfg-create-metadata-hash",
    title: "Sign single asset create txn (metadata hash + unicode name)",
    description:
      "Create an asset with a 32-byte `assetMetadataHash` and a long unicode asset name ('Tëst 🚀 Ässet — ünïcödé nàmé'), exercising metadata display formatting.",
    expected:
      "Wallet shows the asset-create txn, renders the unicode name correctly, and displays the metadata hash (base64 or hex). User signs; algod accepts.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAssetCreate({
        sender: address,
        total: 1000n,
        decimals: 0,
        defaultFrozen: false,
        unitName: "TÜST",
        assetName: "Tëst 🚀 Ässet — ünïcödé nàmé",
        assetMetadataHash: new Uint8Array(32).fill(7),
        manager: address,
        note: "single-acfg-create-metadata-hash",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-acfg-reconfig-plain",
    title: "Sign single asset reconfig txn (rotate reserve)",
    description:
      "Reconfigure the owned test asset's reserve address, with `strictEmptyAddressChecking: true`. The connected account is the asset's manager (created via setup), so manager/freeze/clawback stay pointed at it and only the reserve rotates to a test account.",
    expected:
      "Wallet displays an asset-config txn with reserve set to a test account and manager/freeze/clawback unchanged (the connected account). User signs; algod ACCEPTS because the sender is the current manager. The freeze/clawback/destroy scenarios keep working afterward since those roles are untouched.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = requireOwnedAsset(chain, address);
      const txn = buildAssetReconfig({
        sender: address,
        assetIndex,
        manager: address,
        reserve: testAccounts[0].addr,
        freeze: address,
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
      "Reconfigure the owned test asset, clearing manager/reserve/freeze/clawback (all omitted) with `strictEmptyAddressChecking: false`. The connected account is currently the asset's manager (created via setup).",
    expected:
      "Wallet displays an asset-config txn with all four manager addresses cleared, and prominently warns that the asset's configuration will be permanently locked. User can sign; algod ACCEPTS because the sender is the current manager. Clearing all roles permanently locks the owned asset, so the other role scenarios will fail until a new test asset is created via setup.",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = requireOwnedAsset(chain, address);
      const txn = buildAssetReconfig({
        sender: address,
        assetIndex,
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
      "Destroy the owned test asset. The connected account is currently the asset's manager and holds the entire supply (created via setup).",
    expected:
      "Wallet displays an asset-destroy txn and prominently warns that the asset will be permanently destroyed. User can sign; algod ACCEPTS because the sender is the manager and holds the full supply. On success, the dApp forgets the stored asset ID (run setup again to re-unlock the role scenarios).",
    category: "single-acfg",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    clearsOwnedAssetOnSuccess: true,
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = requireOwnedAsset(chain, address);
      const txn = buildAssetDestroy({
        sender: address,
        assetIndex,
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
      "Freeze the connected account's own holding of the owned test asset (`frozen: true`). The connected account is currently the asset's freeze address (created via setup) and is opted in (it holds the full supply), so it can be the freeze target.",
    expected:
      "Wallet shows an asset-freeze txn naming the connected account as the target and the owned asset. User signs; algod ACCEPTS because the sender holds the asset's freeze role.",
    category: "single-afrz",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = requireOwnedAsset(chain, address);
      const txn = buildAssetFreeze({
        sender: address,
        assetIndex,
        freezeTarget: address,
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
      "Unfreeze the connected account's own holding of the owned test asset (`frozen: false`). The connected account is currently the asset's freeze address (created via setup) and is opted in (it holds the full supply), so it can be the freeze target.",
    expected:
      "Wallet shows an asset-unfreeze txn naming the connected account as the target and the owned asset. User signs; algod ACCEPTS because the sender holds the asset's freeze role.",
    category: "single-afrz",
    modifiers: [],
    networks: ["testnet"],
    requiresOwnedAsset: true,
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const assetIndex = requireOwnedAsset(chain, address);
      const txn = buildAssetFreeze({
        sender: address,
        assetIndex,
        freezeTarget: address,
        frozen: false,
        note: "single-afrz-unfreeze-plain",
        suggestedParams
      });
      return {transaction: [[{txn}]]};
    }
  }
];
