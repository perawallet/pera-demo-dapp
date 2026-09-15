import {
  validateTxnForm,
  optionalAddress,
  emptyTxnForm,
  visibleErrors
} from "./txnFormValidation";
import type {TxnForm} from "./txnFormValidation";
import {testAccounts} from "../../../../scenarios/test-accounts";

const SENDER = testAccounts[0].addr.toString();
const OTHER = testAccounts[1].addr.toString();
const base64Of = (byteLength: number) =>
  Buffer.from(new Uint8Array(byteLength).fill(1)).toString("base64");

const form = (overrides: Partial<TxnForm> = {}): TxnForm => ({
  ...emptyTxnForm(SENDER),
  ...overrides
});

describe("sender", () => {
  it("rejects a blank sender", () => {
    expect(validateTxnForm(form({address: ""}), "pay").address).toBe(
      "Connect a wallet to set the sender address"
    );
  });

  it("rejects a malformed sender", () => {
    expect(validateTxnForm(form({address: "NOPE"}), "pay").address).toBe(
      "Not a valid Algorand address"
    );
  });

  it("accepts a valid sender", () => {
    expect(validateTxnForm(form({toAddress: OTHER, amount: "1"}), "pay").address)
      .toBeUndefined();
  });
});

describe("pay", () => {
  it("requires a receiver", () => {
    expect(validateTxnForm(form({amount: "1"}), "pay").toAddress).toBe("Required");
  });

  it("rejects a malformed receiver", () => {
    expect(validateTxnForm(form({toAddress: "NOPE", amount: "1"}), "pay").toAddress)
      .toBe("Not a valid Algorand address");
  });

  it("rejects a non-numeric amount", () => {
    expect(validateTxnForm(form({toAddress: OTHER, amount: "abc"}), "pay").amount)
      .toBe("Must be a whole number");
  });

  it("rejects a negative amount", () => {
    expect(validateTxnForm(form({toAddress: OTHER, amount: "-1"}), "pay").amount)
      .toBe("Must be a whole number");
  });

  it("accepts a zero amount", () => {
    expect(validateTxnForm(form({toAddress: OTHER, amount: "0"}), "pay").amount)
      .toBeUndefined();
  });

  it("accepts an amount beyond Number.MAX_SAFE_INTEGER", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "18446744073709551615"}), "pay")
        .amount
    ).toBeUndefined();
  });

  it("rejects an amount beyond uint64", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "18446744073709551616"}), "pay")
        .amount
    ).toBe("Must be at most 18446744073709551615");
  });

  it("treats a blank rekeyTo as absent", () => {
    expect(validateTxnForm(form({toAddress: OTHER, amount: "1"}), "pay").rekeyTo)
      .toBeUndefined();
  });

  it("rejects a malformed rekeyTo instead of silently dropping it", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", rekeyTo: "NOPE"}), "pay")
        .rekeyTo
    ).toBe("Not a valid Algorand address");
  });

  it("rejects a malformed closeTo instead of silently dropping it", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", closeTo: "NOPE"}), "pay")
        .closeTo
    ).toBe("Not a valid Algorand address");
  });
});

describe("acfg create", () => {
  const create = (overrides: Partial<TxnForm> = {}) =>
    validateTxnForm(
      form({assetTxnType: "create", total: "1", decimals: 0, ...overrides}),
      "acfg"
    );

  it("treats blank role addresses as absent", () => {
    const errors = create({manager: "", reserve: "", freeze: "", clawback: ""});

    expect(errors.manager).toBeUndefined();
    expect(errors.reserve).toBeUndefined();
    expect(errors.freeze).toBeUndefined();
    expect(errors.clawback).toBeUndefined();
  });

  it("treats a whitespace-only role address as absent", () => {
    expect(create({manager: "   "}).manager).toBeUndefined();
  });

  it("rejects a malformed manager", () => {
    expect(create({manager: "NOPE"}).manager).toBe("Not a valid Algorand address");
  });

  it("requires a total", () => {
    expect(create({total: ""}).total).toBe("Required");
  });

  it("rejects a total of zero", () => {
    expect(create({total: "0"}).total).toBe("Must be at least 1");
  });

  it("accepts the maximum uint64 total", () => {
    expect(create({total: "18446744073709551615"}).total).toBeUndefined();
  });

  it("rejects a total beyond uint64", () => {
    expect(create({total: "18446744073709551616"}).total).toBe(
      "Must be at most 18446744073709551615"
    );
  });

  it("accepts decimals at the upper bound", () => {
    expect(create({decimals: 19}).decimals).toBeUndefined();
  });

  it("rejects decimals above the upper bound", () => {
    expect(create({decimals: 20}).decimals).toBe("Must be between 0 and 19");
  });

  it("rejects a unit name longer than 8 bytes", () => {
    expect(create({unitName: "ABCDEFGHI"}).unitName).toBe("Must be at most 8 bytes");
  });

  it("measures the unit name in bytes rather than characters", () => {
    expect(create({unitName: "ééééé"}).unitName).toBe("Must be at most 8 bytes");
  });

  it("rejects an asset name longer than 32 bytes", () => {
    expect(create({assetName: "x".repeat(33)}).assetName).toBe(
      "Must be at most 32 bytes"
    );
  });

  it("rejects a URL longer than 96 bytes", () => {
    expect(create({assetURL: "u".repeat(97)}).assetURL).toBe(
      "Must be at most 96 bytes"
    );
  });

  it("accepts a fully blank optional set", () => {
    expect(create()).toEqual({});
  });
});

describe("acfg modify", () => {
  const modify = (overrides: Partial<TxnForm> = {}) =>
    validateTxnForm(form({assetTxnType: "modify", ...overrides}), "acfg");

  it("requires an asset index", () => {
    expect(modify({assetIndex: ""}).assetIndex).toBe("Required");
  });

  it("rejects an asset index of zero", () => {
    expect(modify({assetIndex: "0"}).assetIndex).toBe("Must be at least 1");
  });

  it("treats blank role addresses as absent", () => {
    expect(modify({assetIndex: "5", manager: "", clawback: ""})).toEqual({});
  });
});

describe("acfg destroy", () => {
  it("requires an asset index", () => {
    expect(
      validateTxnForm(form({assetTxnType: "destroy", assetIndex: ""}), "acfg")
        .assetIndex
    ).toBe("Required");
  });
});

describe("afrz", () => {
  it("requires a freeze target", () => {
    expect(
      validateTxnForm(form({assetIndex: "5", freezeTarget: ""}), "afrz").freezeTarget
    ).toBe("Required");
  });

  it("rejects a malformed freeze target", () => {
    expect(
      validateTxnForm(form({assetIndex: "5", freezeTarget: "NOPE"}), "afrz")
        .freezeTarget
    ).toBe("Not a valid Algorand address");
  });

  it("requires an asset index", () => {
    expect(
      validateTxnForm(form({assetIndex: "", freezeTarget: OTHER}), "afrz").assetIndex
    ).toBe("Required");
  });
});

describe("axfer", () => {
  it("requires an asset index for a single transfer", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", assetIndex: ""}), "axfer")
        .assetIndex
    ).toBe("Required");
  });

  it("skips the asset index for a bulk transfer", () => {
    expect(
      validateTxnForm(
        form({toAddress: OTHER, amount: "1", assetIndex: "", transactionAmount: 5}),
        "axfer"
      ).assetIndex
    ).toBeUndefined();
  });

  it("rejects a transaction count below 1", () => {
    expect(
      validateTxnForm(
        form({toAddress: OTHER, amount: "1", assetIndex: "5", transactionAmount: 0}),
        "axfer"
      ).transactionAmount
    ).toBe("Must be at least 1");
  });
});

describe("keyreg", () => {
  const online = (overrides: Partial<TxnForm> = {}) =>
    validateTxnForm(
      form({
        isOnlineKeyregTxn: true,
        voteKey: base64Of(32),
        selectionKey: base64Of(32),
        stateProofKey: base64Of(64),
        voteFirst: 1,
        voteLast: 100,
        voteKeyDilution: 10,
        ...overrides
      }),
      "keyreg"
    );

  it("accepts a well-formed online registration", () => {
    expect(online()).toEqual({});
  });

  it("requires a vote key", () => {
    expect(online({voteKey: ""}).voteKey).toBe("Required");
  });

  it("rejects a vote key that is not 32 bytes", () => {
    expect(online({voteKey: base64Of(16)}).voteKey).toBe(
      "Must decode to 32 bytes of base64"
    );
  });

  it("rejects a selection key that is not 32 bytes", () => {
    expect(online({selectionKey: base64Of(64)}).selectionKey).toBe(
      "Must decode to 32 bytes of base64"
    );
  });

  it("rejects a state proof key that is not 64 bytes", () => {
    expect(online({stateProofKey: base64Of(32)}).stateProofKey).toBe(
      "Must decode to 64 bytes of base64"
    );
  });

  it("rejects a vote last that is not after vote first", () => {
    expect(online({voteFirst: 100, voteLast: 100}).voteLast).toBe(
      "Must be greater than vote first"
    );
  });

  it("requires a vote key dilution of at least 1", () => {
    expect(online({voteKeyDilution: 0}).voteKeyDilution).toBe("Must be at least 1");
  });

  it("needs no participation keys when offline", () => {
    expect(validateTxnForm(form({isOnlineKeyregTxn: false}), "keyreg")).toEqual({});
  });
});

describe("note", () => {
  it("accepts a note at the 1024 byte limit", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", note: "x".repeat(1024)}), "pay")
        .note
    ).toBeUndefined();
  });

  it("rejects a note longer than 1024 bytes", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", note: "x".repeat(1025)}), "pay")
        .note
    ).toBe("Must be at most 1024 bytes");
  });

  it("measures the note in bytes rather than characters", () => {
    expect(
      validateTxnForm(form({toAddress: OTHER, amount: "1", note: "é".repeat(513)}), "pay")
        .note
    ).toBe("Must be at most 1024 bytes");
  });
});

describe("visibleErrors", () => {
  const errors = {toAddress: "Required", amount: "Required"} as const;
  const untouched = new Set<keyof TxnForm>();

  it("hides every error on an untouched form that has not been submitted", () => {
    expect(visibleErrors(errors, untouched, false)).toEqual({});
  });

  it("shows only the errors for fields the user has visited", () => {
    expect(visibleErrors(errors, new Set<keyof TxnForm>(["amount"]), false)).toEqual({
      amount: "Required"
    });
  });

  it("shows every error once a submit has been attempted", () => {
    expect(visibleErrors(errors, untouched, true)).toEqual(errors);
  });

  it("shows nothing when the form has no errors", () => {
    expect(visibleErrors({}, new Set<keyof TxnForm>(["amount"]), true)).toEqual({});
  });
});

describe("optionalAddress", () => {
  it("returns undefined for an empty string", () => {
    expect(optionalAddress("")).toBeUndefined();
  });

  it("returns undefined for whitespace", () => {
    expect(optionalAddress("   ")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(optionalAddress(undefined)).toBeUndefined();
  });

  it("returns the trimmed address when present", () => {
    expect(optionalAddress(` ${OTHER} `)).toBe(OTHER);
  });
});
