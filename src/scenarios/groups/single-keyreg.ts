import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildOnlineKeyreg, buildOfflineKeyreg } from "../builders/keyreg";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

export const singleKeyregScenarios: Scenario[] = [
  {
    id: "single-keyreg-online-plain",
    title: "Sign single online keyreg txn",
    description:
      "Online keyreg with sample participation keys (vote, selection, state-proof) and a 1000-round voting window. The keys are dummy bytes — the account will not actually participate even if accepted.",
    expected:
      "Wallet shows a keyreg txn marked online with the vote/selection/state-proof keys and the voting window. User signs; algod accepts the keyreg but the account cannot actually vote because the keys are dummies.",
    category: "single-keyreg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const voteFirst = Number(suggestedParams.firstValid);
      const txn = buildOnlineKeyreg({
        sender: address,
        voteKey: "G/lqTV6MKspW6J8wH2d8ZliZ5XZVZsruqSBJMwLwlmo=",
        selectionKey: "LrpLhvzr+QpN/bivh6IPpOaKGbGzTTB5lJtVfixmmgg=",
        stateProofKey: "RpUpNWfZMjZ1zOOjv3MF2tjO714jsBt0GKnNsw0ihJ4HSZwci+d9eqAhF3qvbZyo+B5OB4yX2KzpKuyMTRpRwQ==",
        voteFirst,
        voteLast: voteFirst + 1000,
        voteKeyDilution: 100,
        note: "single-keyreg-online-plain",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-online-with-rekey",
    title: "Sign single online keyreg txn with rekey",
    description:
      "Online keyreg with sample participation keys and `rekeyTo: testAccounts[1]` set.",
    expected:
      "Wallet shows the online keyreg AND prominently warns that the account will be rekeyed to testAccounts[1]. User can sign; algod accepts both the keyreg and the rekey.",
    category: "single-keyreg",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const voteFirst = Number(suggestedParams.firstValid);
      const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: address,
        voteKey: "G/lqTV6MKspW6J8wH2d8ZliZ5XZVZsruqSBJMwLwlmo=",
        selectionKey: "LrpLhvzr+QpN/bivh6IPpOaKGbGzTTB5lJtVfixmmgg=",
        stateProofKey: "RpUpNWfZMjZ1zOOjv3MF2tjO714jsBt0GKnNsw0ihJ4HSZwci+d9eqAhF3qvbZyo+B5OB4yX2KzpKuyMTRpRwQ==",
        voteFirst,
        voteLast: voteFirst + 1000,
        voteKeyDilution: 100,
        note: new Uint8Array(Buffer.from("single-keyreg-online-with-rekey")),
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-offline-plain",
    title: "Sign single offline keyreg txn",
    description:
      "Offline keyreg with `nonParticipation: true` — marks the account as offline / non-participating.",
    expected:
      "Wallet shows a keyreg txn flagged offline / non-participating, with no vote keys. User signs; algod accepts and the account is taken offline.",
    category: "single-keyreg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildOfflineKeyreg({
        sender: address,
        nonParticipation: true,
        note: "single-keyreg-offline-plain",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-offline-with-rekey",
    title: "Sign single offline keyreg txn with rekey",
    description:
      "Offline keyreg (`nonParticipation: true`) with `rekeyTo: testAccounts[1]` set.",
    expected:
      "Wallet shows the offline keyreg AND prominently warns that the account will be rekeyed to testAccounts[1]. User can sign; algod accepts the offline keyreg and the rekey atomically.",
    category: "single-keyreg",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: address,
        nonParticipation: true,
        note: new Uint8Array(Buffer.from("single-keyreg-offline-with-rekey")),
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  }
];
