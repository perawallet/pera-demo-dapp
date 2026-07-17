import algosdk, { type SuggestedParams } from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { buildPayment } from "../builders/payment";
import { asAtomicGroup } from "../modifiers";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

const GROUP_SIZE = 16;

const buildNTxnsAcrossGroups = async (
  chain: Parameters<Scenario["build"]>[0],
  address: string,
  totalCount: number,
  idPrefix: string
) => {
  const suggestedParams = await apiGetTxnParams(chain);
  const groups: ReturnType<typeof asAtomicGroup>[] = [];
  let built = 0;
  while (built < totalCount) {
    const remaining = totalCount - built;
    const groupSize = Math.min(GROUP_SIZE, remaining);
    const txns = Array.from({ length: groupSize }, (_, j) =>
      buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 0,
        note: `${idPrefix} ${built + j + 1} of ${totalCount}`,
        suggestedParams
      })
    );
    groups.push(asAtomicGroup(txns));
    built += groupSize;
  }
  return groups;
};

export const edgeCaseScenarios: Scenario[] = [
  {
    id: "scale-64-txns",
    title: "Sign 64 txns (4 atomic groups of 16)",
    description:
      "Aggregate-volume test that builds 64 zero-amount payments spread across 4 max-size atomic groups of 16 and submits each group as a separate algo_signTxn request.",
    expected:
      "Wallet shows 4 sequential popups, each containing a 16-tx atomic group. All 64 txns sign and submit successfully on TestNet.",
    category: "edge-case",
    modifiers: ["scale"],
    networks: ["testnet"],
    async build(chain, address) {
      return { transaction: await buildNTxnsAcrossGroups(chain, address, 64, "scale-64") };
    }
  },
  {
    id: "scale-65-txns",
    title: "Sign 65 txns (4 atomic groups of 16 + 1 single)",
    description:
      "Builds 65 zero-amount payments spread across 4 atomic groups of 16 plus a trailing group of 1. Tests behavior at counts that aren't a clean multiple of the group size.",
    expected:
      "Wallet shows 5 sequential popups (4 groups of 16, then 1 single). All 65 txns sign and submit successfully on TestNet.",
    category: "edge-case",
    modifiers: ["scale"],
    networks: ["testnet"],
    async build(chain, address) {
      return { transaction: await buildNTxnsAcrossGroups(chain, address, 65, "scale-65") };
    }
  },
  {
    id: "scale-512-txns",
    title: "Sign 512 txns (32 atomic groups of 16)",
    description:
      "Mid-scale aggregate-volume test. Builds 512 zero-amount payments spread across 32 max-size atomic groups of 16.",
    expected:
      "Wallet shows 32 sequential popups, each containing a 16-tx atomic group. All 512 txns sign and submit successfully on TestNet.",
    category: "edge-case",
    modifiers: ["scale"],
    networks: ["testnet"],
    async build(chain, address) {
      return { transaction: await buildNTxnsAcrossGroups(chain, address, 512, "scale-512") };
    }
  },
  {
    id: "scale-1000-txns",
    title: "Sign 1000 txns (62 atomic groups of 16 + 1 group of 8) - at wallet max",
    description:
      "Builds 1000 zero-amount payments at the wallet's stated aggregate maximum, spread across 62 atomic groups of 16 plus a trailing group of 8. Takes ~1-2 seconds to build.",
    expected:
      "Wallet shows 63 sequential popups (62 groups of 16, then 1 group of 8). All 1000 txns sign and submit successfully on TestNet.",
    category: "edge-case",
    modifiers: ["scale"],
    networks: ["testnet"],
    async build(chain, address) {
      return { transaction: await buildNTxnsAcrossGroups(chain, address, 1000, "scale-1000") };
    }
  },
  {
    id: "scale-1001-txns",
    title: "Sign 1001 txns (over wallet max) - expected reject",
    description:
      "Builds 1001 zero-amount payments across 62 atomic groups of 16 plus one group of 9 (one over the wallet's stated aggregate maximum), then submits each group as a separate algo_signTxn request.",
    expected:
      "Wallet rejects with a max-count / too-many-txns error and refuses to display the request. dApp surfaces the rejection in the activity log; no txns submitted.",
    category: "edge-case",
    modifiers: ["scale", "invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      return { transaction: await buildNTxnsAcrossGroups(chain, address, 1001, "scale-1001") };
    }
  },
  {
    id: "future-transaction",
    title: "Sign future-dated transaction",
    description:
      "Prompts for a minutes offset and constructs a single payment whose firstValid/lastValid window is shifted that many minutes into the future. The dApp defers submission by the same duration.",
    expected:
      "Wallet shows a payment with the future firstValid/lastValid window. User signs. The dApp waits the requested duration and then submits; algod accepts the txn inside its validity window.",
    category: "edge-case",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const minutes = prompt("Please enter minutes for future transaction: ");
      const exactDate = new Date().getTime();
      const futureTrxDate = exactDate + Number(minutes) * 60000;

      const differenceInSeconds = Math.round((futureTrxDate - exactDate) / 1000);
      const blockRound = Math.abs(Math.round(differenceInSeconds / 4));

      const firstRoundFuture = Number(suggestedParams.firstValid) + blockRound;
      const lastRoundFuture = firstRoundFuture + 1000;

      const newSuggestedParams: SuggestedParams = {
        fee: suggestedParams.fee,
        firstValid: firstRoundFuture,
        lastValid: lastRoundFuture,
        genesisHash: suggestedParams.genesisHash,
        genesisID: suggestedParams.genesisID,
        minFee: suggestedParams.minFee
      };

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: new Uint8Array(Buffer.from("Example future transaction")),
        suggestedParams: newSuggestedParams
      });

      return {
        transaction: [[{ txn, message: "This is a transaction message" }]],
        transactionTimeout: differenceInSeconds * 1000
      };
    }
  },
  {
    id: "edge-invalid-auth-address",
    title: "Sign pay txn with invalid authAddr",
    description:
      "Payment whose SignerTransaction wrapper carries a literal `INVALID_ADDRESS` string in the `authAddr` slot.",
    expected:
      "Wallet rejects the request before showing signing UI, surfacing a malformed-address / invalid-authAddr error. No signature is produced.",
    category: "edge-case",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-invalid-auth-address",
        suggestedParams
      });
      return {
        transaction: [
          [{ txn, message: "This is a transaction message", authAddr: "INVALID_ADDRESS" }]
        ]
      };
    }
  },
  {
    id: "edge-valid-auth-address",
    title: "Sign pay txn with valid authAddr",
    description:
      "Payment whose SignerTransaction wrapper carries a well-formed `authAddr` pointing at another test account (testAccounts[1]). Models a rekeyed-sender flow where the signing key differs from the sender.",
    expected:
      "Wallet shows the payment and indicates the txn must be signed by the auth address (rekeyed-sender flow). Signing succeeds only if the wallet holds the auth-address key; otherwise the wallet returns a no-such-signer error.",
    category: "edge-case",
    modifiers: ["rekeyed-sender"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-valid-auth-address",
        suggestedParams
      });
      return {
        transaction: [
          [
            {
              txn,
              message: "This is a transaction message",
              authAddr: testAccounts[1].addr.toString()
            }
          ]
        ]
      };
    }
  },
  {
    id: "edge-invalid-signer-address",
    title: "Sign pay txn with invalid signer address",
    description:
      "Payment whose SignerTransaction wrapper carries a literal `INVALID_ADDRESS` string in the `signers` array.",
    expected:
      "Wallet rejects the request before showing signing UI, surfacing a malformed-address / invalid-signer error. No signature is produced.",
    category: "edge-case",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-invalid-signer-address",
        suggestedParams
      });
      return {
        transaction: [
          [{ txn, message: "This is a transaction message", signers: ["INVALID_ADDRESS"] }]
        ]
      };
    }
  },
  {
    id: "edge-valid-signer-address",
    title: "Sign pay txn with explicit signer (connected address)",
    description:
      "Payment whose SignerTransaction wrapper sets `signers` explicitly to the connected address — partial-sign metadata that matches the sender.",
    expected:
      "Wallet shows the payment (no functional difference from omitting `signers`, since the explicit signer matches the sender). User signs; algod accepts and the txn lands.",
    category: "edge-case",
    modifiers: ["partial-sign"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-valid-signer-address",
        suggestedParams
      });
      return {
        transaction: [
          [
            {
              txn,
              message: "This is a transaction message",
              signers: [address]
            }
          ]
        ]
      };
    }
  },
  {
    id: "edge-lease",
    title: "Sign pay txn with a lease",
    description:
      "Payment with a 32-byte `lease` set. While this txn's validity window is open, any other txn with the same (sender, lease) pair is rejected by algod.",
    expected:
      "Wallet shows the payment including the lease field (base64/hex). User signs; algod accepts the first submission. Re-running this scenario inside the same validity window gets an algod lease-conflict rejection.",
    category: "edge-case",
    modifiers: [],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-lease",
        lease: new Uint8Array(32).fill(1),
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "edge-expired-window",
    title: "Sign expired transaction (validity window in the past)",
    description:
      "Payment whose firstValid/lastValid window ended ~1000 rounds ago. Well-formed, so the wallet may sign it; algod must reject it as dead.",
    expected:
      "Wallet shows the payment (ideally flagging the expired validity window). If signed, algod rejects with a 'txn dead' error naming the round window, surfaced in the activity log.",
    category: "edge-case",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const current = Number(suggestedParams.firstValid);
      const firstValid = Math.max(1, current - 2000);
      const expiredParams: SuggestedParams = {
        fee: suggestedParams.fee,
        firstValid,
        lastValid: Math.max(2, current - 1000),
        genesisHash: suggestedParams.genesisHash,
        genesisID: suggestedParams.genesisID,
        minFee: suggestedParams.minFee
      };
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-expired-window",
        suggestedParams: expiredParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "edge-network-mismatch",
    title: "Sign txn built for MainNet while connected to TestNet",
    description:
      "Payment whose genesisHash/genesisID are MainNet's, requested over a TestNet session. Per ARC-1 the wallet must refuse to sign txns for a different network than the session's.",
    expected:
      "Wallet detects the network mismatch and rejects the request before signing, surfacing a wrong-network error. No signature is produced. (If it were signed, TestNet algod would also reject the genesis mismatch.)",
    category: "edge-case",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const mainnetParams: SuggestedParams = {
        fee: suggestedParams.fee,
        firstValid: suggestedParams.firstValid,
        lastValid: suggestedParams.lastValid,
        genesisHash: algosdk.base64ToBytes("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="),
        genesisID: "mainnet-v1.0",
        minFee: suggestedParams.minFee
      };
      const txn = buildPayment({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-network-mismatch",
        suggestedParams: mainnetParams
      });
      return { transaction: [[{ txn }]] };
    }
  },
  {
    id: "edge-unconnected-sender",
    title: "Sign txn from an unconnected sender (no signers marker)",
    description:
      "Single payment whose sender is testAccounts[2] — a valid address the wallet does not hold — WITHOUT the `signers: []` marker that would declare it externally-signed. Complements atomic-no-sign-txn, where slots are marked correctly.",
    expected:
      "Wallet rejects the request with a no-such-signer / unknown-sender error since it's asked to sign for an account it doesn't have. No signature is produced.",
    category: "edge-case",
    modifiers: ["invalid"],
    networks: ["testnet"],
    async build(chain, _address) {
      const suggestedParams = await apiGetTxnParams(chain);
      const txn = buildPayment({
        sender: testAccounts[2].addr,
        receiver: testAccounts[0].addr,
        amount: 100000,
        note: "edge-unconnected-sender",
        suggestedParams
      });
      return { transaction: [[{ txn }]] };
    }
  }
];
