import algosdk from 'algosdk'

import { testAccounts } from '@scenarios/test-accounts'

import {
    buildCustomTransactions,
    CustomTxnFormError,
    groupTransactions,
    MAX_GROUP_SIZE,
    submissionBatches,
} from '../buildCustomTxn'
import { EMPTY_CUSTOM_TXN_FORM, type CustomTxnForm } from '../types'

const SENDER = testAccounts[0].addr.toString()
const RECEIVER = testAccounts[1].addr.toString()

const suggestedParams: algosdk.SuggestedParams = {
    fee: 1000,
    minFee: 1000,
    firstValid: 100,
    lastValid: 1100,
    genesisID: 'testnet-v1.0',
    genesisHash: new Uint8Array(32),
    flatFee: true,
}

const ctx = { sender: SENDER, suggestedParams }

const form = (overrides: Partial<CustomTxnForm>): CustomTxnForm => ({
    ...EMPTY_CUSTOM_TXN_FORM,
    ...overrides,
})

describe('buildCustomTransactions', () => {
    it('builds a payment from the connected sender', () => {
        const [{ txn }] = buildCustomTransactions(
            'pay',
            form({ receiver: RECEIVER, amount: '2500', note: 'hi' }),
            ctx,
        )

        expect(txn.type).toBe(algosdk.TransactionType.pay)
        expect(txn.sender.toString()).toBe(SENDER)
        expect(txn.payment?.receiver.toString()).toBe(RECEIVER)
        expect(txn.payment?.amount).toBe(2500n)
        expect(new TextDecoder().decode(txn.note)).toBe('hi')
    })

    it('rejects a malformed optional address instead of dropping it', () => {
        expect(() =>
            buildCustomTransactions(
                'pay',
                form({ receiver: RECEIVER, rekeyTo: 'not-an-address' }),
                ctx,
            ),
        ).toThrow(CustomTxnFormError)
    })

    it('requires a receiver', () => {
        expect(() => buildCustomTransactions('pay', form({}), ctx)).toThrow(
            'Receiver is required.',
        )
    })

    it('builds one axfer per bulk asset ID with zero amounts', () => {
        const txns = buildCustomTransactions(
            'axfer',
            form({ receiver: SENDER, count: '3', amount: '5' }),
            { ...ctx, bulkAssetIds: [11, 22, 33, 44] },
        )

        expect(txns.map(({ txn }) => txn.assetTransfer?.assetIndex)).toEqual([
            11n,
            22n,
            33n,
        ])
        expect(txns.every(({ txn }) => txn.assetTransfer?.amount === 0n)).toBe(
            true,
        )
    })

    it('fails when the bulk asset list is too short', () => {
        expect(() =>
            buildCustomTransactions(
                'axfer',
                form({ receiver: SENDER, count: '3' }),
                { ...ctx, bulkAssetIds: [11] },
            ),
        ).toThrow('Only 1 asset IDs were available for 3 transfers.')
    })

    it('uses the vote rounds entered for an online keyreg', () => {
        const key = algosdk.bytesToBase64(new Uint8Array(32).fill(1))
        const stateProofKey = algosdk.bytesToBase64(new Uint8Array(64).fill(2))

        const [{ txn }] = buildCustomTransactions(
            'keyreg',
            form({
                isOnline: true,
                voteKey: key,
                selectionKey: key,
                stateProofKey,
                voteFirst: '200',
                voteLast: '300',
                voteKeyDilution: '10',
            }),
            ctx,
        )

        expect(txn.keyreg?.voteFirst).toBe(200n)
        expect(txn.keyreg?.voteLast).toBe(300n)
        expect(txn.keyreg?.voteKeyDilution).toBe(10n)
    })

    it('builds an asset create with defaults for total and decimals', () => {
        const [{ txn }] = buildCustomTransactions(
            'acfg',
            form({ assetAction: 'create', unitName: 'TST' }),
            ctx,
        )

        expect(txn.assetConfig?.total).toBe(1n)
        expect(txn.assetConfig?.decimals).toBe(0)
        expect(txn.assetConfig?.unitName).toBe('TST')
    })

    it('keeps uint64 values past the safe integer range exact', () => {
        const [{ txn }] = buildCustomTransactions(
            'acfg',
            form({ assetAction: 'create', total: '18446744073709551615' }),
            ctx,
        )

        expect(txn.assetConfig?.total).toBe(2n ** 64n - 1n)
        expect(() =>
            buildCustomTransactions(
                'acfg',
                form({ assetAction: 'create', total: '18446744073709551616' }),
                ctx,
            ),
        ).toThrow(CustomTxnFormError)
    })

    it.each<[string, Partial<CustomTxnForm>]>([
        ['zero asset index', { assetAction: 'destroy', assetIndex: '0' }],
        ['too many decimals', { assetAction: 'create', decimals: '20' }],
        ['a long unit name', { assetAction: 'create', unitName: 'NINECHARS' }],
        [
            'a long asset URL',
            { assetAction: 'create', assetURL: 'u'.repeat(97) },
        ],
    ])('rejects an asset config with %s', (_case, overrides) => {
        expect(() =>
            buildCustomTransactions('acfg', form(overrides), ctx),
        ).toThrow(CustomTxnFormError)
    })

    it('rejects a note over the protocol limit', () => {
        expect(() =>
            buildCustomTransactions(
                'pay',
                form({ receiver: RECEIVER, note: 'n'.repeat(1025) }),
                ctx,
            ),
        ).toThrow('Note must be at most 1024 bytes.')
    })

    it.each<[string, Partial<CustomTxnForm>, string]>([
        [
            'junk vote key',
            { voteKey: 'not base64!' },
            'Vote key must be base64.',
        ],
        [
            'short vote key',
            { voteKey: algosdk.bytesToBase64(new Uint8Array(31)) },
            'Vote key must be 32 bytes.',
        ],
        [
            'vote last before vote first',
            { voteFirst: '300', voteLast: '200' },
            'Vote last must be after vote first.',
        ],
    ])('rejects an online keyreg with a %s', (_case, overrides, message) => {
        const key = algosdk.bytesToBase64(new Uint8Array(32).fill(1))

        expect(() =>
            buildCustomTransactions(
                'keyreg',
                form({
                    isOnline: true,
                    voteKey: key,
                    selectionKey: key,
                    stateProofKey: algosdk.bytesToBase64(new Uint8Array(64)),
                    voteKeyDilution: '10',
                    ...overrides,
                }),
                ctx,
            ),
        ).toThrow(message)
    })

    it('builds a freeze against the target account', () => {
        const [{ txn }] = buildCustomTransactions(
            'afrz',
            form({ assetIndex: '42', freezeTarget: RECEIVER, frozen: true }),
            ctx,
        )

        expect(txn.assetFreeze?.assetIndex).toBe(42n)
        expect(txn.assetFreeze?.freezeAccount.toString()).toBe(RECEIVER)
        expect(txn.assetFreeze?.frozen).toBe(true)
    })
})

describe('groupTransactions', () => {
    const payments = (count: number) =>
        Array.from({ length: count }, (_, i) =>
            buildCustomTransactions(
                'pay',
                form({ receiver: RECEIVER, amount: String(i) }),
                ctx,
            ),
        ).flat()

    it('groups in chunks of the protocol maximum without mutating the input', () => {
        const input = payments(MAX_GROUP_SIZE + 2)

        const grouped = groupTransactions(input)
        const groupOf = (i: number) =>
            algosdk.bytesToBase64(grouped[i].txn.group as Uint8Array)

        expect(grouped).toHaveLength(input.length)
        expect(groupOf(0)).toBe(groupOf(MAX_GROUP_SIZE - 1))
        expect(groupOf(MAX_GROUP_SIZE)).not.toBe(groupOf(0))
        expect(input[0].txn.group).toBeUndefined()
    })

    it('produces a valid group when regrouping already grouped transactions', () => {
        const input = payments(3)

        const regrouped = groupTransactions(groupTransactions(input))
        const fresh = groupTransactions(input)

        expect(regrouped.map(({ txn }) => txn.txID())).toEqual(
            fresh.map(({ txn }) => txn.txID()),
        )
    })

    it('submits each group together and ungrouped transactions alone', () => {
        const grouped = groupTransactions(payments(3))
        const loose = payments(2)
        const all = [...grouped, ...loose]
        const signed = all.map((_, i) => new Uint8Array([i]))

        const batches = submissionBatches(all, signed)

        expect(batches.map(b => b.bytes.length)).toEqual([3, 1, 1])
        expect(batches[0].txId).toBe(grouped[0].txn.txID())
    })
})
