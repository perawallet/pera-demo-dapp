export interface Caip10Account {
  chainId: string;
  /** The bare address, with the `namespace:reference:` prefix removed. */
  address: string;
}

/** namespace, reference, address */
const CAIP10_SEGMENT_COUNT = 3;

/** Splits a CAIP-10 account id (`namespace:reference:address`). Exactly three
 *  non-empty segments, mirroring the mobile app's parser. */
export const parseCaip10Account = (account: string): Caip10Account | null => {
  const segments = account.split(":");

  if (segments.length !== CAIP10_SEGMENT_COUNT) {
    return null;
  }

  const [namespace, reference, address] = segments;

  if (!namespace || !reference || !address) {
    return null;
  }

  return {chainId: `${namespace}:${reference}`, address};
};

/** Bare addresses from an approved namespace's `accounts`, restricted to the
 *  chain the dApp proposed, preserving wallet order and dropping repeats. */
export const addressesForChain = (accounts: string[], chainId: string): string[] => {
  const seen = new Set<string>();
  const addresses: string[] = [];

  for (const account of accounts) {
    const parsed = parseCaip10Account(account);

    if (parsed && parsed.chainId === chainId && !seen.has(parsed.address)) {
      seen.add(parsed.address);
      addresses.push(parsed.address);
    }
  }

  return addresses;
};
