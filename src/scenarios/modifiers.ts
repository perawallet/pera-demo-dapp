import algosdk from 'algosdk'

import type { SignerTransaction } from '@perawallet/connect'

/**
 * Assign group IDs to a list of txns and return them as a single SignerTransaction group.
 */
export const asAtomicGroup = (
    txns: algosdk.Transaction[],
    message?: string,
): SignerTransaction[] => {
    algosdk.assignGroupID(txns)
    return txns.map(txn => (message ? { txn, message } : { txn }))
}
