import algosdk from "algosdk";
import { buildPayment } from "./payment";
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

describe("buildPayment", () => {
  it("sets the lease when provided", () => {
    const lease = new Uint8Array(32).fill(1);
    const txn = buildPayment({
      sender: testAccounts[0].addr,
      receiver: testAccounts[1].addr,
      amount: 1,
      lease,
      suggestedParams
    });
    expect(txn.lease).toEqual(lease);
  });

  it("omits the lease by default", () => {
    const txn = buildPayment({
      sender: testAccounts[0].addr,
      receiver: testAccounts[1].addr,
      amount: 1,
      suggestedParams
    });
    expect(txn.lease).toBeUndefined();
  });
});
