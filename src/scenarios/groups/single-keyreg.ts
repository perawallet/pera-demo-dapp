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
      const txn = buildOnlineKeyreg({
        sender: address,
        voteKey: "G/lqTV6MKspW6J8wH2d8ZliZ5XZVZsruqSBJMwLwlmo=",
        selectionKey: "LrpLhvzr+QpN/bivh6IPpOaKGbGzTTB5lJtVfixmmgg=",
        stateProofKey: "RpUpNWfZMjZ1zOOjv3MF2tjO714jsBt0GKnNsw0ihJ4HSZwci+d9eqAhF3qvbZyo+B5OB4yX2KzpKuyMTRpRwQ==",
        voteFirst,
        voteLast: voteFirst + 1000,
        voteKeyDilution: 100,
        note: "single-keyreg-online-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-goes-offline",
    title: "Sign single offline keyreg txn (reversible)",
    description:
      "Plain offline keyreg: no participation keys and NO nonParticipation flag. Takes the account offline reversibly — it can register online again later.",
    expected:
      "Wallet shows a keyreg txn marked offline with no vote keys and no permanent-nonparticipation warning. User signs; algod accepts and the account is offline (reversible).",
    category: "single-keyreg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildOfflineKeyreg({
        sender: address,
        note: "single-keyreg-goes-offline",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-goes-offline-with-rekey",
    title: "Sign single offline keyreg txn (reversible) with rekey",
    description:
      "Plain offline keyreg (no keys, no nonParticipation flag) with `rekeyTo: testAccounts[1]` set.",
    expected:
      "Wallet shows the offline keyreg AND prominently warns about the rekey to testAccounts[1]. User can sign; algod accepts both atomically.",
    category: "single-keyreg",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildOfflineKeyreg({
        sender: address,
        note: "single-keyreg-goes-offline-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-nonpart",
    title: "Sign single nonparticipation keyreg txn (PERMANENT)",
    description:
      "Keyreg with `nonParticipation: true` — PERMANENTLY marks the account non-participating. Unlike plain offline, this can never be undone; the account can never register online again.",
    expected:
      "Wallet shows the keyreg flagged as permanent nonparticipation and displays a severe, irreversible-action warning (distinct from plain offline). User signs; algod accepts and the account is permanently non-participating.",
    category: "single-keyreg",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildOfflineKeyreg({
        sender: address,
        nonParticipation: true,
        note: "single-keyreg-nonpart",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "single-keyreg-nonpart-with-rekey",
    title: "Sign single nonparticipation keyreg txn (PERMANENT) with rekey",
    description:
      "Permanent nonparticipation keyreg (`nonParticipation: true`) with `rekeyTo: testAccounts[1]` set — two irreversible/high-risk actions in one txn.",
    expected:
      "Wallet warns about BOTH the permanent nonparticipation and the rekey. User can sign; algod accepts both atomically.",
    category: "single-keyreg",
    modifiers: ["rekey"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildOfflineKeyreg({
        sender: address,
        nonParticipation: true,
        note: "single-keyreg-nonpart-with-rekey",
        rekeyTo: testAccounts[1].addr,
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  }
];
