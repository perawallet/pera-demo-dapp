import {addressesForChain, parseCaip10Account} from "./caip";

const TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe";
const MAINNET = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k";

describe("CAIP-10 account parsing", () => {
  it("splits namespace:reference:address", () => {
    expect(parseCaip10Account(`${TESTNET}:ADDR`)).toEqual({chainId: TESTNET, address: "ADDR"});
  });

  it("rejects a bare chain id and over-long ids", () => {
    expect(parseCaip10Account(TESTNET)).toBeNull();
    expect(parseCaip10Account(`${TESTNET}:ADDR:extra`)).toBeNull();
  });

  it("rejects empty segments", () => {
    expect(parseCaip10Account("algorand::ADDR")).toBeNull();
    expect(parseCaip10Account(":ref:ADDR")).toBeNull();
    expect(parseCaip10Account(`${TESTNET}:`)).toBeNull();
  });

  it("keeps only addresses on the requested chain, in order, without duplicates", () => {
    const accounts = [
      `${TESTNET}:A1`,
      `${MAINNET}:B1`,
      `eip155:1:0xabc`,
      `${TESTNET}:A2`,
      `${TESTNET}:A1`,
      "garbage"
    ];

    expect(addressesForChain(accounts, TESTNET)).toEqual(["A1", "A2"]);
  });
});
