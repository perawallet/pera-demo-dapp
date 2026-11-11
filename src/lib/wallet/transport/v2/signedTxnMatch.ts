import algosdk from 'algosdk'

import { WcV2Error } from './WcV2Error'

/*
 * The same response check `@perawallet/connect` runs on the v1 path
 * (`util/transaction/signedTransactionMatch.ts`), which it does not export.
 * Without it a wallet that drops, reorders or swaps a transaction gets its
 * answer submitted as if it were the one requested.
 */

/** A wallet may raise the fee, which in turn changes the group id. */
const idIgnoringFeeAndGroup = (txn: algosdk.Transaction): string => {
    const data = txn.toEncodingData()

    data.delete('fee')
    data.delete('grp')

    return algosdk.Transaction.fromEncodingData(data).txID()
}

const groupKey = (txn: algosdk.Transaction): string | undefined =>
    txn.group ? algosdk.bytesToBase64(txn.group) : undefined

/** The group id `requested[index]` should carry once every fee the wallet
 *  returned is applied to its original group. */
const expectedGroupKey = (
    requested: algosdk.Transaction[],
    fees: bigint[],
    index: number,
): string | undefined => {
    const original = groupKey(requested[index])

    if (!original) {
        return undefined
    }

    const members = requested
        .map((txn, i) => ({ txn, fee: fees[i] }))
        .filter(({ txn }) => groupKey(txn) === original)

    if (members.every(({ txn, fee }) => txn.fee === fee)) {
        return original
    }

    return algosdk.bytesToBase64(
        algosdk.computeGroupID(
            members.map(({ txn, fee }) => {
                const copy = algosdk.Transaction.fromEncodingData(
                    txn.toEncodingData(),
                )

                copy.fee = fee
                copy.group = undefined

                return copy
            }),
        ),
    )
}

const differentTransaction = (position: number, cause?: unknown) =>
    new WcV2Error(
        'SIGN_TRANSACTIONS',
        `The wallet returned a different transaction than the one requested at position ${position}`,
        undefined,
        cause === undefined ? undefined : { cause },
    )

/**
 * @param requested Every transaction sent to the wallet, flattened in slot order.
 * @param signableIndexes Indexes into `requested` the wallet was asked to sign.
 * @param signed The wallet's blobs with null slots removed, one per signable index.
 */
export const assertSignedTransactionsMatch = (
    requested: algosdk.Transaction[],
    signableIndexes: number[],
    signed: Uint8Array[],
): void => {
    if (signed.length !== signableIndexes.length) {
        throw new WcV2Error(
            'SIGN_TRANSACTIONS',
            `Expected ${signableIndexes.length} signed transaction(s) from the wallet but received ${signed.length}`,
        )
    }

    const returned = signed.map((blob, position) => {
        const asked = requested[signableIndexes[position]]
        let txn: algosdk.Transaction

        try {
            txn = algosdk.decodeSignedTransaction(blob).txn
        } catch (decodeError) {
            // Tells a malformed msgpack blob apart from a wrongly shaped one.
            throw differentTransaction(position, decodeError)
        }

        if (
            txn.fee < asked.fee ||
            idIgnoringFeeAndGroup(txn) !== idIgnoringFeeAndGroup(asked)
        ) {
            throw differentTransaction(position)
        }

        return txn
    })

    const fees = requested.map(txn => txn.fee)

    signableIndexes.forEach((index, position) => {
        fees[index] = returned[position].fee
    })
    returned.forEach((txn, position) => {
        if (
            groupKey(txn) !==
            expectedGroupKey(requested, fees, signableIndexes[position])
        ) {
            throw differentTransaction(position)
        }
    })
}
