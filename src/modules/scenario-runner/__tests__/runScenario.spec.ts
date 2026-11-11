import algosdk from 'algosdk'

import { ChainType } from '@lib/algod/networks'
import type { WalletSigner } from '@lib/wallet/transport/WalletTransport'
import { getOwnedAsset } from '@scenarios/owned-asset'
import type { NumberedScenario } from '@scenarios/registry'
import { testAccounts } from '@scenarios/test-accounts'

import {
    describeSubmission,
    runScenario,
    scenarioBlockReason,
    type ScenarioRunContext,
} from '../runScenario'

const ADDRESS = testAccounts[0].addr.toString()

const suggestedParams: algosdk.SuggestedParams = {
    fee: 1000,
    minFee: 1000,
    firstValid: 1,
    lastValid: 1001,
    genesisID: 'testnet-v1.0',
    genesisHash: new Uint8Array(32),
    flatFee: true,
}

const scenario = (overrides: Partial<NumberedScenario>): NumberedScenario => ({
    id: 'test',
    number: 1,
    title: 'Test scenario',
    description: '',
    expected: '',
    category: 'single-pay',
    modifiers: [],
    networks: ['testnet'],
    build: async () => ({ notice: 'unused' }),
    ...overrides,
})

const makeContext = (overrides: Partial<ScenarioRunContext> = {}) => {
    const wallet = {
        signTransaction: vi.fn(async () => [new Uint8Array([1])]),
        signData: vi.fn(async () => [new Uint8Array([2])]),
        signArc60Data: vi.fn(async () => ({}) as never),
        getEmptySignatures: vi.fn(async () => ({})),
    } satisfies WalletSigner
    const algod = {
        sendRawTransaction: vi.fn(() => ({ do: async () => ({}) })),
        pendingTransactionInformation: vi.fn(() => ({
            do: async () => ({ confirmedRound: 5n, assetIndex: 777n }),
        })),
    }
    const log = vi.fn()
    const ctx: ScenarioRunContext = {
        wallet,
        algod: algod as unknown as algosdk.Algodv2,
        chain: ChainType.TestNet,
        accountAddress: ADDRESS,
        connectedAccounts: [ADDRESS],
        resolveArc60Signer: vi.fn(),
        log,
        ...overrides,
    }

    return { ctx, wallet, algod, log }
}

const payment = () =>
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: ADDRESS,
        receiver: ADDRESS,
        amount: 0,
        suggestedParams,
    })

describe('runScenario', () => {
    beforeEach(() => localStorage.clear())

    it('logs a notice without calling the wallet', async () => {
        const { ctx, wallet, log } = makeContext()

        await runScenario(
            scenario({ build: async () => ({ notice: 'Stored asset 5' }) }),
            ctx,
        )

        expect(log).toHaveBeenCalledWith('Stored asset 5')
        expect(wallet.signTransaction).not.toHaveBeenCalled()
    })

    it('signs and submits a transaction scenario', async () => {
        const { ctx, wallet, algod, log } = makeContext()

        await runScenario(
            scenario({
                build: async () => ({ transaction: [[{ txn: payment() }]] }),
            }),
            ctx,
        )

        expect(wallet.signTransaction).toHaveBeenCalledTimes(1)
        expect(algod.sendRawTransaction).toHaveBeenCalledTimes(1)
        expect(log).toHaveBeenLastCalledWith('Signed and sent: Test scenario')
    })

    it('stores the created asset for the setup scenario', async () => {
        const { ctx } = makeContext()

        await runScenario(
            scenario({
                captureCreatedAsset: true,
                build: async () => ({ transaction: [[{ txn: payment() }]] }),
            }),
            ctx,
        )

        expect(getOwnedAsset(ChainType.TestNet, ADDRESS)).toBe(777)
    })

    it('signs arbitrary data with verification on', async () => {
        const { ctx, wallet } = makeContext()
        const data = [{ data: new Uint8Array([1]), message: 'hi' }]

        await runScenario(
            scenario({ kind: 'arbitrary-data', build: async () => ({ data }) }),
            ctx,
        )

        expect(wallet.signData).toHaveBeenCalledWith(data, ADDRESS, true)
    })

    it.each([
        ['no signatures', []],
        ['one signature for two payloads', [new Uint8Array([2])]],
    ])(
        'fails arbitrary data when the wallet returns %s',
        async (_label, signatures) => {
            const { ctx, wallet, log } = makeContext()
            wallet.signData.mockResolvedValueOnce(signatures)
            const data = [
                { data: new Uint8Array([1]), message: 'one' },
                { data: new Uint8Array([2]), message: 'two' },
            ]

            await expect(
                runScenario(
                    scenario({
                        kind: 'arbitrary-data',
                        build: async () => ({ data }),
                    }),
                    ctx,
                ),
            ).rejects.toThrow(
                `Wallet returned ${signatures.length} signatures for 2 payloads`,
            )
            expect(log).not.toHaveBeenCalled()
        },
    )

    it('logs arbitrary data as signed when every payload has a signature', async () => {
        const { ctx, log } = makeContext()

        await runScenario(
            scenario({
                kind: 'arbitrary-data',
                build: async () => ({
                    data: [{ data: new Uint8Array([1]), message: 'hi' }],
                }),
            }),
            ctx,
        )

        expect(log).toHaveBeenCalledWith('Arbitrary data signed: Test scenario')
    })

    it('signs a sign-only scenario without submitting it', async () => {
        const { ctx, wallet, algod, log } = makeContext()
        const transaction = [[{ txn: payment() }], [{ txn: payment() }]]
        wallet.signTransaction.mockResolvedValueOnce([
            new Uint8Array([1]),
            new Uint8Array([2]),
        ])

        await runScenario(
            scenario({ signOnly: true, build: async () => ({ transaction }) }),
            ctx,
        )

        expect(wallet.signTransaction).toHaveBeenCalledTimes(1)
        expect(wallet.signTransaction).toHaveBeenCalledWith(transaction)
        expect(algod.sendRawTransaction).not.toHaveBeenCalled()
        expect(log).toHaveBeenLastCalledWith(
            'Signed (not submitted: protocol flow replayed non-atomically): Test scenario — wallet returned 2 signed transaction(s).',
        )
    })

    it.each([
        { captureCreatedAsset: true },
        { clearsOwnedAssetOnSuccess: true },
    ])('refuses a sign-only scenario that also sets %o', async flags => {
        const { ctx, wallet } = makeContext()

        await expect(
            runScenario(
                scenario({
                    signOnly: true,
                    ...flags,
                    build: async () => ({
                        transaction: [[{ txn: payment() }]],
                    }),
                }),
                ctx,
            ),
        ).rejects.toThrow('sign-only')
        expect(wallet.signTransaction).not.toHaveBeenCalled()
    })

    it('refuses a sign-only scenario whose build asks for a submission delay', async () => {
        const { ctx, wallet } = makeContext()

        await expect(
            runScenario(
                scenario({
                    signOnly: true,
                    build: async () => ({
                        transaction: [[{ txn: payment() }]],
                        transactionTimeout: 1000,
                    }),
                }),
                ctx,
            ),
        ).rejects.toThrow('sign-only')
        expect(wallet.signTransaction).not.toHaveBeenCalled()
    })

    it('says so when the wallet signed nothing and the dApp signed every slot', async () => {
        const { ctx, wallet, algod, log } = makeContext()
        const txns = [1, 2, 3].map(amount =>
            algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                sender: testAccounts[0].addr,
                receiver: ADDRESS,
                amount,
                suggestedParams,
            }),
        )
        algosdk.assignGroupID(txns)
        wallet.signTransaction.mockResolvedValueOnce([])

        await runScenario(
            scenario({
                build: async () => ({
                    transaction: [txns.map(txn => ({ txn, signers: [] }))],
                }),
            }),
            ctx,
        )

        expect(algod.sendRawTransaction).toHaveBeenCalledTimes(1)
        expect(log).toHaveBeenLastCalledWith(
            expect.stringContaining(
                'wallet signed none of the submitted slots',
            ),
        )
        expect(log).toHaveBeenLastCalledWith(
            expect.not.stringContaining('Signed and sent'),
        )
    })

    it('rejects a build result of the wrong kind', async () => {
        const { ctx } = makeContext()

        await expect(
            runScenario(
                scenario({
                    kind: 'arbitrary-data',
                    build: async () => ({ notice: 'nope' }),
                }),
                ctx,
            ),
        ).rejects.toThrow('kind mismatch: expected data')
    })

    it('reads empty signatures for the selected network', async () => {
        const { ctx, wallet } = makeContext()

        await runScenario(scenario({ kind: 'empty-signatures' }), ctx)

        expect(wallet.getEmptySignatures).toHaveBeenCalledWith(
            ChainType.TestNet,
        )
    })
})

describe('scenarioBlockReason', () => {
    it('blocks multi-signer scenarios until enough accounts are connected', () => {
        expect(scenarioBlockReason({ minAccounts: 2 }, 1)).toMatch(
            'needs at least 2 connected accounts',
        )
        expect(scenarioBlockReason({ minAccounts: 2 }, 2)).toBeNull()
        expect(scenarioBlockReason({}, 0)).toBeNull()
    })
})

describe('describeSubmission', () => {
    it.each([
        [{ submittedGroups: 1, partialSignGroups: 0 }, 'Signed and sent: T'],
        [{ submittedGroups: 1, partialSignGroups: 1 }, '1 group(s) skipped'],
        [{ submittedGroups: 0, partialSignGroups: 1 }, 'not submitted'],
        [{ submittedGroups: 0, partialSignGroups: 0 }, 'nothing to submit'],
    ])('%o -> %s', (result, expected) => {
        expect(describeSubmission('T', result)).toContain(expected)
    })

    it('keeps the plain success line when the dApp co-signed nothing', () => {
        expect(
            describeSubmission('T', {
                submittedGroups: 1,
                partialSignGroups: 0,
                walletSignedSlots: 2,
                locallySignedSlots: 0,
            }),
        ).toBe('Signed and sent: T')
    })

    it('names the slots the dApp co-signed with a bundled test key', () => {
        expect(
            describeSubmission('T', {
                submittedGroups: 1,
                partialSignGroups: 0,
                walletSignedSlots: 1,
                locallySignedSlots: 1,
            }),
        ).toBe(
            'Signed and sent: T (1 slot(s) co-signed by the dApp with a bundled test key)',
        )
        expect(
            describeSubmission('T', {
                submittedGroups: 1,
                partialSignGroups: 1,
                walletSignedSlots: 1,
                locallySignedSlots: 2,
            }),
        ).toContain('2 slot(s) co-signed by the dApp with a bundled test key')
    })

    it('does not credit the wallet for a submission it signed none of', () => {
        expect(
            describeSubmission('T', {
                submittedGroups: 1,
                partialSignGroups: 0,
                walletSignedSlots: 0,
                locallySignedSlots: 3,
            }),
        ).toBe(
            'Sent without a wallet signature: T — wallet signed none of the submitted slots; the dApp co-signed 3 slot(s) with a bundled test key.',
        )
    })

    // The wallet may have signed slots of a group that was then skipped.
    it('limits the no-wallet-signature claim to the submitted groups', () => {
        expect(
            describeSubmission('T', {
                submittedGroups: 1,
                partialSignGroups: 1,
                walletSignedSlots: 0,
                locallySignedSlots: 2,
            }),
        ).toBe(
            "Sent without a wallet signature: T — wallet signed none of the submitted slots; the dApp co-signed 2 slot(s) with a bundled test key. 1 group(s) skipped (unsigned slot whose sender isn't a known test account).",
        )
    })
})
