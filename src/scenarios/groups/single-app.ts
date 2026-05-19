import algosdk from "algosdk";
import { apiGetTxnParams, ChainType } from "../../core/utils/algod/algod";
import { buildAppCall, buildAppCreate } from "../builders/application";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

// App IDs copied verbatim from the old signTxnUtils.tsx getAppIndex().
const TESTNET_APP_INDEX = 22314999;
const MAINNET_APP_INDEX = 305162725;

const getAppIndex = (chain: ChainType): number => {
  if (chain === ChainType.MainNet) {
    return MAINNET_APP_INDEX;
  }
  if (chain === ChainType.TestNet) {
    return TESTNET_APP_INDEX;
  }
  throw new Error(`App not defined for chain ${chain}`);
};

// Approval/clear bytecode copied verbatim from the old singleAppCreate scenario.
const APPROVAL_PROGRAM = Uint8Array.from([4, 129, 1, 67]);
const CLEAR_PROGRAM = Uint8Array.from([3, 129, 1, 67]);

// Args copied verbatim from the old scenarios.
const DEFAULT_APP_ARGS: Uint8Array[] = [
  Uint8Array.from([0]),
  Uint8Array.from([0, 1])
];

export const singleAppScenarios: Scenario[] = [
  {
    id: "single-appl-optin",
    title: "Sign single app opt-in txn",
    description:
      "Opt-in to the configured TestNet sample application with two app args. No close, no rekey.",
    expected:
      "Wallet shows an application opt-in txn (app id, app args, on-complete=OptIn). User signs; algod accepts and the sender is now opted-in to the app.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.OptInOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-optin",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-optin-with-rekey",
    title: "Sign single app opt-in txn with rekey",
    description:
      "Opt-in to the TestNet sample app with `rekeyTo` set.",
    expected:
      "Wallet shows the app opt-in txn AND prominently warns that the account will be rekeyed to the rekey target. User can sign; algod accepts both the opt-in and the rekey.",
    category: "single-appl",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.OptInOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-optin-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-optin-with-app-rekey",
    title: "Sign single app opt-in txn from alt sender with rekey",
    description:
      "Opt-in sent by a hardcoded alt account (testAccounts[1]) with `rekeyTo: testAccounts[2]`. Exercises wallet flow when the connected wallet is not the txn sender.",
    expected:
      "Wallet refuses to sign because the connected account is not the txn sender (no matching private key). Unless the user has imported testAccounts[1], the wallet returns a no-such-signer error and no signature is produced.",
    category: "single-appl",
    modifiers: ["rekey", "invalid"],
    networks: ["testnet"],
    async build(chain) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: testAccounts[1].addr,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.OptInOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-optin-with-app-rekey",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-noop",
    title: "Sign single app noop call",
    description:
      "Plain NoOp application call against the TestNet sample app with two app args. No rekey, no close.",
    expected:
      "Wallet shows an application NoOp call (app id, app args, on-complete=NoOp). User signs; algod accepts and the app's approval program runs.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-noop",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-noop-no-args",
    title: "Sign single app noop call with no app args",
    description:
      "NoOp application call against the TestNet sample app with an empty `appArgs` array.",
    expected:
      "Wallet shows an application NoOp call with no app-args section (or an empty list). User signs; algod accepts.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [],
        note: "single-appl-noop-no-args",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-noop-with-rekey",
    title: "Sign single app noop call with rekey",
    description:
      "NoOp application call with `rekeyTo: testAccounts[2]` set.",
    expected:
      "Wallet shows the NoOp app call AND prominently warns that the account will be rekeyed to the rekey target. User can sign; algod accepts both the app call and the rekey.",
    category: "single-appl",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-noop-with-rekey",
        rekeyTo: testAccounts[2].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-noop-with-access-list",
    title: "Sign single app noop call with access list",
    description:
      "NoOp application call carrying an `access` resource reference list (newer algosdk resource access feature).",
    expected:
      "Wallet displays the NoOp app call with the access list (or signs through it if the wallet does not yet render the field). On submit, algod rejects because the configured app does not declare resource access. // TODO: verify expected behavior in the wallet",
    category: "single-appl",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      // The builder doesn't surface `access`, so call the algosdk helper directly.
      const txn = algosdk.makeApplicationCallTxnFromObject({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: DEFAULT_APP_ARGS,
        access: [{ address }],
        note: new Uint8Array(Buffer.from("single-appl-noop-with-access-list")),
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-closeout",
    title: "Sign single app close-out",
    description:
      "CloseOut application call against the TestNet sample app — removes the sender's local state for the app.",
    expected:
      "Wallet shows an app close-out call with the provided transaction message. User signs. On submit, algod accepts only if the sender is currently opted-in; otherwise rejects.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.CloseOutOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-closeout",
        suggestedParams
      });
      return { transaction: [[{ txn, message: "This is a transaction message" }]] };
    }
  },
  {
    id: "single-appl-closeout-with-rekey",
    title: "Sign single app close-out with rekey",
    description:
      "CloseOut application call with `rekeyTo` set.",
    expected:
      "Wallet shows the app close-out call AND prominently warns that the account will be rekeyed. User can sign; algod accepts both the close-out and the rekey if the sender is opted-in.",
    category: "single-appl",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.CloseOutOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-closeout-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-clear-state",
    title: "Sign single app clear-state",
    description:
      "ClearState application call against the TestNet sample app — removes the sender's local state unconditionally (cannot be rejected by the approval program).",
    expected:
      "Wallet shows an app clear-state call (on-complete=ClearState). User signs; algod accepts and the sender's local state for the app is removed.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.ClearStateOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-clear-state",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-create",
    title: "Sign single app create",
    description:
      "Create a new application with tiny verbatim TEAL (approval `04 81 01 43`, clear `03 81 01 43`), 1 global int / 2 global byte slices, 3 local ints / 4 local byte slices.",
    expected:
      "Wallet shows an app-create txn with the program bytes and schema. User signs; algod accepts and the account becomes the new app's creator.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCreate({
        sender: address,
        approvalProgram: APPROVAL_PROGRAM,
        clearProgram: CLEAR_PROGRAM,
        numGlobalInts: 1,
        numGlobalByteSlices: 2,
        numLocalInts: 3,
        numLocalByteSlices: 4,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-create",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-create-extra-page",
    title: "Sign single app create with extra program page",
    description:
      "Create a new application with `extraPages: 1` to rent an additional 2 KiB of program memory.",
    expected:
      "Wallet shows the app-create txn including the extra-pages field. User signs; algod accepts and the account becomes the creator of an app with an extra program page.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCreate({
        sender: address,
        approvalProgram: APPROVAL_PROGRAM,
        clearProgram: CLEAR_PROGRAM,
        numGlobalInts: 1,
        numGlobalByteSlices: 2,
        numLocalInts: 3,
        numLocalByteSlices: 4,
        extraPages: 1,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-create-extra-page",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-update",
    title: "Sign single app update",
    description:
      "Update the TestNet sample app's approval/clear programs to the tiny verbatim TEAL bytecode. Sender must currently be the app's creator.",
    expected:
      "Wallet shows an app-update txn (on-complete=UpdateApplication) with the new program bytes. User signs. On submit, algod accepts only if the sender is the app's creator; otherwise rejects with an authorization error.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = algosdk.makeApplicationUpdateTxnFromObject({
        sender: address,
        appIndex: getAppIndex(chain),
        approvalProgram: APPROVAL_PROGRAM,
        clearProgram: CLEAR_PROGRAM,
        appArgs: DEFAULT_APP_ARGS,
        note: new Uint8Array(Buffer.from("single-appl-update")),
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-delete",
    title: "Sign single app delete",
    description:
      "Delete the TestNet sample app. Sender must currently be the app's creator.",
    expected:
      "Wallet shows an app-delete txn (on-complete=DeleteApplication) and prominently warns that the app will be permanently destroyed. User can sign. On submit, algod accepts only if the sender is the app's creator; otherwise rejects.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex: getAppIndex(chain),
        onComplete: algosdk.OnApplicationComplete.DeleteApplicationOC,
        appArgs: DEFAULT_APP_ARGS,
        note: "single-appl-delete",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-appl-noop-with-boxes",
    title: "Sign single app noop call with box reference",
    description:
      "NoOp application call referencing a single box (`{ appIndex, name: [0] }`) and an empty appArgs array.",
    expected:
      "Wallet shows a NoOp app call including the box reference (app id + name bytes). User signs; algod accepts the box reference and runs the approval program.",
    category: "single-appl",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const appIndex = getAppIndex(chain);
      const txn = buildAppCall({
        sender: address,
        appIndex,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [],
        boxes: [{ appIndex, name: Uint8Array.from([0]) }],
        note: "single-appl-noop-with-boxes",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  }
];
