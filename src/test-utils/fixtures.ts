import type algosdk from 'algosdk'

import { testAccounts } from '@scenarios/test-accounts'

/** Real, checksummed addresses (the bundled test accounts). */
export const TEST_ADDRESSES = testAccounts.map(account =>
    account.addr.toString(),
)

export const TEST_SUGGESTED_PARAMS: algosdk.SuggestedParams = {
    fee: 1000,
    minFee: 1000,
    firstValid: 1000,
    lastValid: 2000,
    genesisID: 'testnet-v1.0',
    genesisHash: new Uint8Array(32),
    flatFee: true,
}
