import type { PeraWalletConnect, SignerTransaction } from "@perawallet/connect";
import algosdk, { type Algodv2 } from "algosdk";
import { testAccounts } from "../../../scenarios/test-accounts";

export interface SignAndSubmitArgs {
  peraWallet: PeraWalletConnect;
  algod: Algodv2;
  accountAddress: string;
  txnsToSign: SignerTransaction[][];
  /** Optional delay before submitting (used by the future-transaction scenario). */
  transactionTimeout?: number;
  /** After submitting, poll submitted groups' first txn until one yields a
   *  created asset index and return it (setup scenario only). */
  captureAssetIndex?: boolean;
}

export interface SignAndSubmitResult {
  /** Number of groups whose slots all came back signed (wallet + local) and were submitted. */
  submittedGroups: number;
  /** Number of groups where the wallet didn't sign every slot AND no local test
   *  account was available to fill the gap. These can't be submitted; algod
   *  would reject with "incomplete group". */
  partialSignGroups: number;
  /** Asset ID created by the confirmed txn, when captureAssetIndex was set. */
  createdAssetIndex?: number;
}

/**
 * Slots with `signers: []` are explicitly not signed by the wallet. If the
 * slot's sender matches one of the test accounts (the dApp ships with 3),
 * sign it locally and pass the resulting bytes through. Returns null when
 * no test account holds the key for the slot's sender.
 */
const signSlotLocally = (slot: SignerTransaction): Uint8Array | null => {
  const senderAddr = slot.txn.sender.toString();
  const account = testAccounts.find((a) => a.addr.toString() === senderAddr);
  if (!account) return null;
  return algosdk.signTransaction(slot.txn, account.sk).blob;
};

const isExternallySignedSlot = (slot: SignerTransaction): boolean => {
  return slot.signers !== undefined && slot.signers.length === 0;
};

const pollForCreatedAssetIndex = async (
  algod: Algodv2,
  txid: string
): Promise<number | undefined> => {
  const MAX_POLLS = 10;
  const POLL_DELAY_MS = 1500;
  for (let i = 0; i < MAX_POLLS; i++) {
    try {
      const info = await algod.pendingTransactionInformation(txid).do();
      if (info.confirmedRound && Number(info.confirmedRound) > 0) {
        return info.assetIndex ? Number(info.assetIndex) : undefined;
      }
    } catch {
      // Pending-info errors can be transient behind load balancers; ignore them
      // and retry (mirrors algosdk.waitForConfirmation behavior).
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
  }
  return undefined;
};

/**
 * Sign and submit txns from a scenario.
 *
 * One `peraWallet.signTransaction` call carries every group (atomic groups
 * have their grp pre-assigned by the scenario's `build` function via
 * `algosdk.assignGroupID`; non-grouped txns have no grp). The wallet
 * partitions the flat batch by each txn's grp field and shows one popup
 * containing all groups (ARC-0001 format 2). Pre-format-2 wallet builds
 * will compute a single canonical grp over the whole batch and break —
 * that's a wallet bug to fix, not something the dApp should accommodate.
 *
 * Wallet response: signed bytes in original slot order with `signers: []`
 * slots filtered out. We slice that flat response back into per-group
 * arrays for algod submission (algod accepts one atomic group or one
 * standalone txn per POST, not concatenated multi-group bodies).
 *
 * Partial-sign scenarios (slots with `signers: []`): if the slot's sender
 * matches one of the dApp's bundled test accounts we sign locally with
 * `algosdk.signTransaction`; otherwise we skip submission for that group
 * (algod would reject "incomplete group").
 */
export const signAndSubmit = async ({
  peraWallet,
  algod,
  accountAddress: _accountAddress,
  txnsToSign,
  transactionTimeout,
  captureAssetIndex
}: SignAndSubmitArgs): Promise<SignAndSubmitResult> => {
  const allSigned = await peraWallet.signTransaction(txnsToSign);

  // Slice the flat response back into per-group arrays in slot order,
  // accounting for `signers: []` slots that the wallet skipped.
  const signedByGroup: Uint8Array[][] = [];
  let walletIdx = 0;
  for (const group of txnsToSign) {
    const expectedFromWallet = group.filter((s) => !isExternallySignedSlot(s)).length;
    signedByGroup.push(allSigned.slice(walletIdx, walletIdx + expectedFromWallet));
    walletIdx += expectedFromWallet;
  }

  /**
   * Merge wallet-signed bytes with locally-signed bytes (where available).
   * Returns the full per-slot byte array if every slot was signed by
   * wallet-or-local, or null if any slot remained unsigned.
   */
  const assembleGroupBytes = (groupIdx: number): Uint8Array[] | null => {
    const group = txnsToSign[groupIdx];
    const walletSigned = signedByGroup[groupIdx];
    const result: (Uint8Array | null)[] = new Array(group.length).fill(null);

    let walletSlotIdx = 0;
    for (let slotIdx = 0; slotIdx < group.length; slotIdx++) {
      if (isExternallySignedSlot(group[slotIdx])) continue;
      if (walletSlotIdx >= walletSigned.length) return null;
      result[slotIdx] = walletSigned[walletSlotIdx];
      walletSlotIdx += 1;
    }

    for (let slotIdx = 0; slotIdx < group.length; slotIdx++) {
      if (result[slotIdx]) continue;
      const localBytes = signSlotLocally(group[slotIdx]);
      if (!localBytes) return null;
      result[slotIdx] = localBytes;
    }

    return result as Uint8Array[];
  };

  let submittedGroups = 0;
  let partialSignGroups = 0;
  let createdAssetIndex: number | undefined;

  if (transactionTimeout) {
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const submittable: Uint8Array[] = [];
        for (let i = 0; i < signedByGroup.length; i++) {
          const assembled = assembleGroupBytes(i);
          if (assembled === null) {
            partialSignGroups += 1;
            continue;
          }
          submittable.push(...assembled);
          submittedGroups += 1;
        }
        if (submittable.length === 0) {
          resolve();
          return;
        }
        algod
          .sendRawTransaction(submittable)
          .do()
          .then(() => resolve())
          .catch(reject);
      }, transactionTimeout);
    });
    return { submittedGroups, partialSignGroups, createdAssetIndex };
  }

  for (let i = 0; i < signedByGroup.length; i++) {
    if (signedByGroup[i].length === 0 && txnsToSign[i].length === 0) continue;
    const assembled = assembleGroupBytes(i);
    if (assembled === null) {
      partialSignGroups += 1;
      continue;
    }
    await algod.sendRawTransaction(assembled).do();
    submittedGroups += 1;
    if (captureAssetIndex && createdAssetIndex === undefined) {
      createdAssetIndex = await pollForCreatedAssetIndex(algod, txnsToSign[i][0].txn.txID());
    }
  }

  return { submittedGroups, partialSignGroups, createdAssetIndex };
};
