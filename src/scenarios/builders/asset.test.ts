import algosdk from "algosdk";
import { buildAssetTransfer, buildAssetCreate } from "./asset";
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

describe("asset builders", () => {
  it("sets assetSender for clawback transfers", () => {
    const txn = buildAssetTransfer({
      sender: testAccounts[0].addr,
      receiver: testAccounts[1].addr,
      amount: 1,
      assetIndex: 42,
      assetSender: testAccounts[2].addr,
      suggestedParams
    });
    expect(txn.assetTransfer?.assetSender?.toString()).toBe(
      testAccounts[2].addr.toString()
    );
  });

  it("omits assetSender for plain transfers", () => {
    const txn = buildAssetTransfer({
      sender: testAccounts[0].addr,
      receiver: testAccounts[1].addr,
      amount: 1,
      assetIndex: 42,
      suggestedParams
    });
    expect(txn.assetTransfer?.assetSender).toBeUndefined();
  });

  it("sets assetMetadataHash on creates", () => {
    const hash = new Uint8Array(32).fill(7);
    const txn = buildAssetCreate({
      sender: testAccounts[0].addr,
      total: 1,
      decimals: 0,
      defaultFrozen: false,
      assetMetadataHash: hash,
      suggestedParams
    });
    expect(txn.assetConfig?.assetMetadataHash).toEqual(hash);
  });
});
