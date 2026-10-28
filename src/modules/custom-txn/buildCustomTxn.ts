import algosdk, { type SuggestedParams, type Transaction } from 'algosdk'

import type { SignerTransaction } from '@perawallet/connect'

import { noteBytes, utf8ToBytes } from '@lib/bytes'

import type { CustomTxnForm, CustomTxnType } from './types'

/** Protocol limit on transactions per atomic group. */
export const MAX_GROUP_SIZE = 16

const UINT64_MAX = 2n ** 64n - 1n

// Protocol limits algosdk does not enforce; the node rejects the signed txn.
const NOTE_MAX_BYTES = 1024
const UNIT_NAME_MAX_BYTES = 8
const ASSET_NAME_MAX_BYTES = 32
const ASSET_URL_MAX_BYTES = 96
const MAX_DECIMALS = 19
const VOTE_KEY_BYTES = 32
const SELECTION_KEY_BYTES = 32
const STATE_PROOF_KEY_BYTES = 64

// Strict, unlike `algosdk.base64ToBytes`, which decodes junk without complaint.
const BASE64 =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export class CustomTxnFormError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CustomTxnFormError'
    }
}

export interface BuildCustomTxnContext {
    sender: string
    suggestedParams: SuggestedParams
    /** axfer with `count` > 1: the asset IDs to transfer, one per transaction. */
    bulkAssetIds?: number[]
}

const optionalAddress = (value: string, field: string): string | undefined => {
    const trimmed = value.trim()

    if (!trimmed) {
        return undefined
    }
    if (!algosdk.isValidAddress(trimmed)) {
        throw new CustomTxnFormError(`${field} is not a valid address.`)
    }

    return trimmed
}

const requiredAddress = (value: string, field: string): string => {
    const address = optionalAddress(value, field)

    if (!address) {
        throw new CustomTxnFormError(`${field} is required.`)
    }

    return address
}

const optionalInteger = (value: string, field: string): number | undefined => {
    const trimmed = value.trim()

    if (!trimmed) {
        return undefined
    }

    const parsed = Number(trimmed)

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
        throw new CustomTxnFormError(`${field} must be a whole number.`)
    }

    return parsed
}

/** Amounts, totals and asset IDs are uint64; parsed as bigint so values past
 *  `Number.MAX_SAFE_INTEGER` are accepted rather than rounded or rejected. */
const optionalUint64 = (
    value: string,
    field: string,
    minimum = 0n,
): bigint | undefined => {
    const trimmed = value.trim()

    if (!trimmed) {
        return undefined
    }
    if (!/^\d+$/.test(trimmed)) {
        throw new CustomTxnFormError(`${field} must be a whole number.`)
    }

    const parsed = BigInt(trimmed)

    if (parsed < minimum || parsed > UINT64_MAX) {
        throw new CustomTxnFormError(
            `${field} must be between ${minimum} and ${UINT64_MAX}.`,
        )
    }

    return parsed
}

const requiredUint64 = (value: string, field: string, minimum = 0n): bigint => {
    const parsed = optionalUint64(value, field, minimum)

    if (parsed === undefined) {
        throw new CustomTxnFormError(`${field} is required.`)
    }

    return parsed
}

const requiredKey = (
    value: string,
    field: string,
    byteLength: number,
): Uint8Array => {
    const trimmed = value.trim()

    if (!trimmed) {
        throw new CustomTxnFormError(`${field} is required.`)
    }
    if (!BASE64.test(trimmed)) {
        throw new CustomTxnFormError(`${field} must be base64.`)
    }

    const bytes = algosdk.base64ToBytes(trimmed)

    if (bytes.length !== byteLength) {
        throw new CustomTxnFormError(`${field} must be ${byteLength} bytes.`)
    }

    return bytes
}

const limitedText = (
    value: string,
    field: string,
    maxBytes: number,
): string | undefined => {
    if (utf8ToBytes(value).length > maxBytes) {
        throw new CustomTxnFormError(
            `${field} must be at most ${maxBytes} bytes.`,
        )
    }

    return value || undefined
}

const note = (value: string) =>
    noteBytes(limitedText(value, 'Note', NOTE_MAX_BYTES))

/** How many axfer transactions the form asks for; at least 1. */
export const transferCount = (form: CustomTxnForm): number =>
    Math.max(1, optionalInteger(form.count, 'Transaction count') ?? 1)

const buildPayment = (form: CustomTxnForm, ctx: BuildCustomTxnContext) =>
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: ctx.sender,
        receiver: requiredAddress(form.receiver, 'Receiver'),
        amount: optionalUint64(form.amount, 'Amount') ?? 0,
        note: note(form.note),
        rekeyTo: optionalAddress(form.rekeyTo, 'Rekey to'),
        closeRemainderTo: optionalAddress(form.closeTo, 'Close to'),
        suggestedParams: ctx.suggestedParams,
    })

const buildAssetTransfers = (
    form: CustomTxnForm,
    ctx: BuildCustomTxnContext,
): Transaction[] => {
    const count = transferCount(form)
    const assetIds: (number | bigint)[] =
        count === 1
            ? [requiredUint64(form.assetIndex, 'Asset index', 1n)]
            : (ctx.bulkAssetIds ?? []).slice(0, count)

    if (assetIds.length < count) {
        throw new CustomTxnFormError(
            `Only ${assetIds.length} asset IDs were available for ${count} transfers.`,
        )
    }

    const receiver = requiredAddress(form.receiver, 'Receiver')
    const rekeyTo = optionalAddress(form.rekeyTo, 'Rekey to')
    const closeRemainderTo = optionalAddress(form.closeTo, 'Close to')
    // Bulk mode exercises many opt-ins, so only a single transfer moves funds.
    const amount =
        count === 1 ? (optionalUint64(form.amount, 'Amount') ?? 0) : 0

    return assetIds.map((assetIndex, i) =>
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: ctx.sender,
            receiver,
            amount,
            assetIndex,
            note: note(count === 1 ? form.note : `Transaction no: ${i + 1}`),
            rekeyTo,
            closeRemainderTo,
            suggestedParams: ctx.suggestedParams,
        }),
    )
}

const buildKeyreg = (form: CustomTxnForm, ctx: BuildCustomTxnContext) => {
    const rekeyTo = optionalAddress(form.rekeyTo, 'Rekey to')

    if (!form.isOnline) {
        return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
            sender: ctx.sender,
            rekeyTo,
            suggestedParams: ctx.suggestedParams,
        })
    }

    const voteFirst =
        optionalUint64(form.voteFirst, 'Vote first', 1n) ??
        BigInt(ctx.suggestedParams.firstValid)
    const voteLast =
        optionalUint64(form.voteLast, 'Vote last', 1n) ??
        BigInt(ctx.suggestedParams.lastValid)

    if (voteLast <= voteFirst) {
        throw new CustomTxnFormError('Vote last must be after vote first.')
    }

    // algosdk v3 takes participation keys as raw bytes; the form takes base64.
    return algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: ctx.sender,
        voteKey: requiredKey(form.voteKey, 'Vote key', VOTE_KEY_BYTES),
        selectionKey: requiredKey(
            form.selectionKey,
            'Selection key',
            SELECTION_KEY_BYTES,
        ),
        stateProofKey: requiredKey(
            form.stateProofKey,
            'State proof key',
            STATE_PROOF_KEY_BYTES,
        ),
        voteFirst,
        voteLast,
        voteKeyDilution: requiredUint64(
            form.voteKeyDilution,
            'Vote key dilution',
            1n,
        ),
        rekeyTo,
        suggestedParams: ctx.suggestedParams,
    })
}

const buildAssetConfig = (form: CustomTxnForm, ctx: BuildCustomTxnContext) => {
    const roles = {
        manager: optionalAddress(form.manager, 'Manager'),
        reserve: optionalAddress(form.reserve, 'Reserve'),
        freeze: optionalAddress(form.freeze, 'Freeze'),
        clawback: optionalAddress(form.clawback, 'Clawback'),
    }

    switch (form.assetAction) {
        case 'create': {
            const decimals = optionalInteger(form.decimals, 'Decimals') ?? 0

            if (decimals > MAX_DECIMALS) {
                throw new CustomTxnFormError(
                    `Decimals must be at most ${MAX_DECIMALS}.`,
                )
            }

            return algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                sender: ctx.sender,
                unitName: limitedText(
                    form.unitName,
                    'Unit name',
                    UNIT_NAME_MAX_BYTES,
                ),
                assetName: limitedText(
                    form.assetName,
                    'Asset name',
                    ASSET_NAME_MAX_BYTES,
                ),
                assetURL: limitedText(
                    form.assetURL,
                    'Asset URL',
                    ASSET_URL_MAX_BYTES,
                ),
                total: optionalUint64(form.total, 'Total', 1n) ?? 1,
                decimals,
                defaultFrozen: form.defaultFrozen,
                ...roles,
                suggestedParams: ctx.suggestedParams,
            })
        }
        case 'modify': {
            return algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
                sender: ctx.sender,
                assetIndex: requiredUint64(form.assetIndex, 'Asset index', 1n),
                ...roles,
                // Blank roles are cleared on purpose; that is what modify tests.
                strictEmptyAddressChecking: false,
                suggestedParams: ctx.suggestedParams,
            })
        }
        case 'destroy': {
            return algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
                sender: ctx.sender,
                assetIndex: requiredUint64(form.assetIndex, 'Asset index', 1n),
                suggestedParams: ctx.suggestedParams,
            })
        }
    }
}

const buildAssetFreeze = (form: CustomTxnForm, ctx: BuildCustomTxnContext) =>
    algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
        sender: ctx.sender,
        assetIndex: requiredUint64(form.assetIndex, 'Asset index', 1n),
        freezeTarget: requiredAddress(form.freezeTarget, 'Freeze target'),
        frozen: form.frozen,
        note: note(form.note),
        rekeyTo: optionalAddress(form.rekeyTo, 'Rekey to'),
        suggestedParams: ctx.suggestedParams,
    })

/** Builds the transactions the form describes. Throws `CustomTxnFormError`
 *  with a user-facing message when an input is missing or malformed. */
export const buildCustomTransactions = (
    type: CustomTxnType,
    form: CustomTxnForm,
    ctx: BuildCustomTxnContext,
): SignerTransaction[] => {
    const transactions = (() => {
        switch (type) {
            case 'pay': {
                return [buildPayment(form, ctx)]
            }
            case 'axfer': {
                return buildAssetTransfers(form, ctx)
            }
            case 'keyreg': {
                return [buildKeyreg(form, ctx)]
            }
            case 'acfg': {
                return [buildAssetConfig(form, ctx)]
            }
            case 'afrz': {
                return [buildAssetFreeze(form, ctx)]
            }
        }
    })()

    return transactions.map(txn => ({ txn }))
}

/** Assigns group IDs in chunks of `MAX_GROUP_SIZE`. Returns new entries so
 *  callers holding the previous array (e.g. React state) are not mutated. */
export const groupTransactions = (
    transactions: SignerTransaction[],
): SignerTransaction[] => {
    const grouped: SignerTransaction[] = []

    for (let i = 0; i < transactions.length; i += MAX_GROUP_SIZE) {
        const chunk = transactions
            .slice(i, i + MAX_GROUP_SIZE)
            .map(({ txn }) => {
                const clone = algosdk.decodeUnsignedTransaction(
                    algosdk.encodeUnsignedTransaction(txn),
                )

                // The group ID hashes each txn ID, which includes any previous
                // group, so regrouping must start from ungrouped transactions.
                clone.group = undefined

                return clone
            })

        algosdk.assignGroupID(chunk)
        grouped.push(...chunk.map(txn => ({ txn })))
    }

    return grouped
}

const groupKey = (txn: Transaction): string | null =>
    txn.group && txn.group.some(byte => byte !== 0)
        ? algosdk.bytesToBase64(txn.group)
        : null

/**
 * Splits signed bytes into what algod accepts per submission: one atomic group
 * (consecutive transactions sharing a group ID) or one standalone transaction.
 * `signed` must be in the same order as `transactions`.
 */
export const submissionBatches = (
    transactions: SignerTransaction[],
    signed: Uint8Array[],
): { txId: string; bytes: Uint8Array[] }[] => {
    const batches: { txId: string; bytes: Uint8Array[]; key: string | null }[] =
        []

    transactions.forEach(({ txn }, i) => {
        const key = groupKey(txn)
        const last = batches.at(-1)

        if (key !== null && last?.key === key) {
            last.bytes.push(signed[i])
        } else {
            batches.push({ txId: txn.txID(), bytes: [signed[i]], key })
        }
    })

    return batches.map(({ txId, bytes }) => ({ txId, bytes }))
}
