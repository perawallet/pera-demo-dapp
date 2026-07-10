import algosdk from "algosdk";
import { ChainType, apiGetTxnParams } from "../../core/utils/algod/algod";
import { testAccounts } from "../test-accounts";
import { multiAccountScenarios } from "./multi-account";

// The scenario builder fetches suggested params from algod; stub that out so
// the test stays offline and deterministic. CRA's jest config sets
// `resetMocks: true`, which clears factory-provided implementations before
// each test — so the resolved value is (re)applied in `beforeEach`.
jest.mock("../../core/utils/algod/algod", () => ({
  __esModule: true,
  ChainType: { MainNet: "mainnet", TestNet: "testnet" },
  clientForChain: jest.fn(),
  apiGetTxnParams: jest.fn()
}));

const mockedGetTxnParams = apiGetTxnParams as jest.MockedFunction<
  typeof apiGetTxnParams
>;

describe("multiAccountScenarios", () => {
  const scenario = multiAccountScenarios[0];
  const signerA = testAccounts[0].addr.toString();
  const signerB = testAccounts[1].addr.toString();

  beforeEach(() => {
    mockedGetTxnParams.mockResolvedValue({
      fee: 1000n,
      firstValid: 1n,
      lastValid: 1000n,
      genesisID: "testnet-v1.0",
      genesisHash: new Uint8Array(32),
      flatFee: true,
      minFee: 1000n
    } as unknown as algosdk.SuggestedParams);
  });

  it("requires at least 2 connected accounts", () => {
    expect(scenario.minAccounts).toBe(2);
  });

  it("builds a single atomic group whose two slots are sent by two different connected accounts", async () => {
    const result = await scenario.build(ChainType.TestNet, signerA, [signerA, signerB]);
    if (!("transaction" in result)) throw new Error("expected a transaction result");

    const groups = result.transaction;
    expect(groups).toHaveLength(1);

    const group = groups[0];
    expect(group).toHaveLength(2);

    // Both slots must be signed by the wallet (no `signers: []`) — this is what
    // makes it a real multi-signer request rather than a partial-sign fixture.
    expect(group[0].signers).toBeUndefined();
    expect(group[1].signers).toBeUndefined();

    // Distinct real senders, drawn from the connected accounts.
    expect(group[0].txn.sender.toString()).toBe(signerA);
    expect(group[1].txn.sender.toString()).toBe(signerB);

    // Slots share one atomic group id.
    const groupId0 = group[0].txn.group;
    const groupId1 = group[1].txn.group;
    expect(groupId0).toBeDefined();
    expect(groupId1).toBeDefined();
    expect(algosdk.bytesToBase64(groupId0!)).toBe(algosdk.bytesToBase64(groupId1!));
  });
});
