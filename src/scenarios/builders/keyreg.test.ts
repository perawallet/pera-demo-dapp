import algosdk from "algosdk";
import { buildOfflineKeyreg } from "./keyreg";
import { testAccounts } from "../test-accounts";

const suggestedParams = {
  fee: 1000n,
  firstValid: 1n,
  lastValid: 1000n,
  genesisID: "testnet-v1.0",
  genesisHash: new Uint8Array(32),
  flatFee: true,
  minFee: 1000n
} as unknown as algosdk.SuggestedParams;

describe("buildOfflineKeyreg", () => {
  it("plain offline: no keys, nonParticipation not set", () => {
    const txn = buildOfflineKeyreg({
      sender: testAccounts[0].addr,
      suggestedParams
    });
    expect(txn.type).toBe(algosdk.TransactionType.keyreg);
    expect(txn.keyreg?.voteKey).toBeUndefined();
    expect(txn.keyreg?.nonParticipation).toBeFalsy();
  });

  it("nonParticipation: true is carried through", () => {
    const txn = buildOfflineKeyreg({
      sender: testAccounts[0].addr,
      nonParticipation: true,
      suggestedParams
    });
    expect(txn.keyreg?.nonParticipation).toBe(true);
  });

  it("supports rekeyTo", () => {
    const txn = buildOfflineKeyreg({
      sender: testAccounts[0].addr,
      rekeyTo: testAccounts[1].addr,
      suggestedParams
    });
    expect(txn.rekeyTo?.toString()).toBe(testAccounts[1].addr.toString());
  });
});
