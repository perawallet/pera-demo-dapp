import algosdk from 'algosdk'

import { testAccounts } from '@scenarios/test-accounts'

import { signAndSubmit } from '../signAndSubmit'

describe('signAndSubmit', () => {
    it('sends every group in ONE wallet call (ARC-0001 format 2)', async () => {
        const signCalls: unknown[][][] = []
        const sendCalls: Uint8Array[][] = []
        const peraWallet = {
            // Format-2-aware wallet stub: returns one byte array per signable slot
            // across all groups, in flat slot order (`signers: []` slots skipped).
            signTransaction: async (groups: unknown[][]) => {
                signCalls.push(groups)
                const flat: Uint8Array[] = []
                for (const g of groups) {
                    for (const s of g as Array<{ signers?: unknown[] }>) {
                        if (
                            s.signers !== undefined &&
                            (s.signers as unknown[]).length === 0
                        )
                            continue
                        flat.push(new Uint8Array([flat.length + 1]))
                    }
                }
                return flat
            },
        } as never
        const algod = {
            sendRawTransaction: (bytes: Uint8Array[]) => ({
                do: async () => {
                    sendCalls.push(bytes)
                    return { txId: 'fake' }
                },
            }),
        } as never

        const txnsToSign = [
            [{ txn: {} as never }, { txn: {} as never }],
            [{ txn: {} as never }, { txn: {} as never }, { txn: {} as never }],
            [{ txn: {} as never }],
        ]

        const result = await signAndSubmit({
            wallet: peraWallet,
            algod,
            txnsToSign,
        })

        expect(signCalls).toHaveLength(1)
        expect(signCalls[0]).toHaveLength(3) // 3 groups in one wallet call
        expect(sendCalls).toHaveLength(3) // one algod POST per group
        expect(sendCalls[0]).toHaveLength(2)
        expect(sendCalls[1]).toHaveLength(3)
        expect(sendCalls[2]).toHaveLength(1)
        expect(result.submittedGroups).toBe(3)
        expect(result.partialSignGroups).toBe(0)
    })

    it('fills `signers: []` slots locally when the sender is a known test account', async () => {
        const suggestedParams = {
            fee: 1000n,
            firstValid: 1n,
            lastValid: 1000n,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32),
            flatFee: true,
            minFee: 1000n,
        } as unknown as algosdk.SuggestedParams

        const userTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: testAccounts[1].addr,
            receiver: testAccounts[0].addr,
            amount: 1,
            suggestedParams,
        })
        const externalTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(
            {
                sender: testAccounts[0].addr,
                receiver: testAccounts[1].addr,
                amount: 2,
                suggestedParams,
            },
        )
        algosdk.assignGroupID([userTxn, externalTxn])

        const sendCalls: Uint8Array[][] = []
        const peraWallet = {
            signTransaction: async (_groups: unknown[][]) => [
                new Uint8Array([0xaa, 0xbb]),
            ],
        } as never
        const algod = {
            sendRawTransaction: (bytes: Uint8Array[]) => ({
                do: async () => {
                    sendCalls.push(bytes)
                    return { txId: 'fake' }
                },
            }),
        } as never

        const result = await signAndSubmit({
            wallet: peraWallet,
            algod,
            txnsToSign: [[{ txn: userTxn }, { txn: externalTxn, signers: [] }]],
        })

        expect(sendCalls).toHaveLength(1)
        expect(sendCalls[0]).toHaveLength(2)
        expect(sendCalls[0][0]).toEqual(new Uint8Array([0xaa, 0xbb]))
        expect(sendCalls[0][1].byteLength).toBeGreaterThan(0)
        expect(result.submittedGroups).toBe(1)
        expect(result.partialSignGroups).toBe(0)
    })

    it("skips submission when an unsigned slot's sender isn't a known test account", async () => {
        const sendCalls: Uint8Array[][] = []
        const peraWallet = {
            signTransaction: async (_groups: unknown[][]) => [
                new Uint8Array([1]),
            ],
        } as never
        const algod = {
            sendRawTransaction: (bytes: Uint8Array[]) => ({
                do: async () => {
                    sendCalls.push(bytes)
                    return { txId: 'fake' }
                },
            }),
        } as never

        const result = await signAndSubmit({
            wallet: peraWallet,
            algod,
            txnsToSign: [
                [
                    { txn: {} as never },
                    {
                        txn: {
                            sender: { toString: () => 'FOREIGN_SENDER' },
                        } as never,
                        signers: [],
                    },
                ],
            ],
        })

        expect(sendCalls).toHaveLength(0)
        expect(result.partialSignGroups).toBe(1)
        expect(result.submittedGroups).toBe(0)
    })

    it('captures the created asset index when captureAssetIndex is set', async () => {
        const suggestedParams = {
            fee: 1000n,
            firstValid: 1n,
            lastValid: 1000n,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32),
            flatFee: true,
            minFee: 1000n,
        } as unknown as algosdk.SuggestedParams
        const createTxn =
            algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                sender: testAccounts[0].addr,
                total: 1,
                decimals: 0,
                defaultFrozen: false,
                suggestedParams,
            })

        const peraWallet = {
            signTransaction: async (_groups: unknown[][]) => [
                new Uint8Array([1]),
            ],
        } as never
        const algod = {
            sendRawTransaction: (_bytes: Uint8Array[]) => ({
                do: async () => ({ txid: createTxn.txID() }),
            }),
            pendingTransactionInformation: (txid: string) => ({
                do: async () => {
                    expect(txid).toBe(createTxn.txID())
                    return { confirmedRound: 5n, assetIndex: 777n }
                },
            }),
        } as never

        const result = await signAndSubmit({
            wallet: peraWallet,
            algod,
            txnsToSign: [[{ txn: createTxn }]],
            captureAssetIndex: true,
        })

        expect(result.submittedGroups).toBe(1)
        expect(result.createdAssetIndex).toBe(777)
    })

    it('tolerates transient pending-info errors when polling for asset index', async () => {
        const suggestedParams = {
            fee: 1000n,
            firstValid: 1n,
            lastValid: 1000n,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32),
            flatFee: true,
            minFee: 1000n,
        } as unknown as algosdk.SuggestedParams
        const createTxn =
            algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
                sender: testAccounts[0].addr,
                total: 1,
                decimals: 0,
                defaultFrozen: false,
                suggestedParams,
            })

        let callCount = 0
        const peraWallet = {
            signTransaction: async (_groups: unknown[][]) => [
                new Uint8Array([1]),
            ],
        } as never
        const algod = {
            sendRawTransaction: (_bytes: Uint8Array[]) => ({
                do: async () => ({ txid: createTxn.txID() }),
            }),
            pendingTransactionInformation: (txid: string) => ({
                do: async () => {
                    expect(txid).toBe(createTxn.txID())
                    callCount += 1
                    if (callCount === 1) {
                        throw new Error('404 Not Found')
                    }
                    return { confirmedRound: 5n, assetIndex: 777n }
                },
            }),
        } as never

        const result = await signAndSubmit({
            wallet: peraWallet,
            algod,
            txnsToSign: [[{ txn: createTxn }]],
            captureAssetIndex: true,
        })

        expect(result.submittedGroups).toBe(1)
        expect(result.createdAssetIndex).toBe(777)
    })

    describe('with a submission delay (future transactions)', () => {
        const signEverything = {
            signTransaction: async (groups: unknown[][]) =>
                groups.flat().map((_, i) => new Uint8Array([i])),
        } as never

        afterEach(() => vi.useRealTimers())

        it('waits, then submits every group in one request', async () => {
            vi.useFakeTimers()
            const sendRawTransaction = vi.fn((_bytes: Uint8Array[]) => ({
                do: async () => ({}),
            }))

            const pending = signAndSubmit({
                wallet: signEverything,
                algod: { sendRawTransaction } as never,
                txnsToSign: [
                    [{ txn: {} as never }],
                    [{ txn: {} as never }, { txn: {} as never }],
                ],
                transactionTimeout: 5000,
            })

            await vi.advanceTimersByTimeAsync(4999)
            expect(sendRawTransaction).not.toHaveBeenCalled()

            await vi.advanceTimersByTimeAsync(1)
            await expect(pending).resolves.toEqual({
                submittedGroups: 2,
                partialSignGroups: 0,
                createdAssetIndex: undefined,
            })
            expect(sendRawTransaction).toHaveBeenCalledTimes(1)
            expect(sendRawTransaction.mock.calls[0][0]).toHaveLength(3)
        })

        it('propagates a rejected submission', async () => {
            vi.useFakeTimers()
            const algod = {
                sendRawTransaction: () => ({
                    do: async () => {
                        throw new Error('round not reached')
                    },
                }),
            } as never

            const pending = signAndSubmit({
                wallet: signEverything,
                algod,
                txnsToSign: [[{ txn: {} as never }]],
                transactionTimeout: 1000,
            })
            const assertion =
                expect(pending).rejects.toThrow('round not reached')

            await vi.advanceTimersByTimeAsync(1000)
            await assertion
        })

        it('submits nothing when no group is complete', async () => {
            vi.useFakeTimers()
            const sendRawTransaction = vi.fn()
            const externalSender = algosdk.generateAccount().addr

            const pending = signAndSubmit({
                wallet: signEverything,
                algod: { sendRawTransaction } as never,
                txnsToSign: [
                    [
                        {
                            txn: { sender: externalSender } as never,
                            signers: [],
                        },
                    ],
                ],
                transactionTimeout: 1000,
            })

            await vi.advanceTimersByTimeAsync(1000)
            await expect(pending).resolves.toMatchObject({
                submittedGroups: 0,
                partialSignGroups: 1,
            })
            expect(sendRawTransaction).not.toHaveBeenCalled()
        })
    })
})
