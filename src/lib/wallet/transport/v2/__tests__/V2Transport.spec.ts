import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import algosdk from 'algosdk'
import type { Mock } from 'vitest'

import { ChainType } from '@lib/algod/algod'
import { utf8ToBytes } from '@lib/bytes'

import type { PairingUi } from '../../WalletTransport'
import {
    pairingDeepLink,
    V2Transport,
    type V2TransportDeps,
} from '../V2Transport'
import type { WcClient, WcSession } from '../wcClient'
import { isWcV2Error } from '../WcV2Error'

const TESTNET = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
const MAINNET = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k'
const A = algosdk.generateAccount()
const B = algosdk.generateAccount()
const ADDR_A = A.addr.toString()
const ADDR_B = B.addr.toString()
// jsdom serves the tests from http://localhost; ARC-60 payloads must name that
// host or the transport's SIWA origin binding rejects them.
const PAGE_DOMAIN = window.location.host

const makeSession = (
    over: Partial<WcSession> = {},
    chainId = TESTNET,
): WcSession => ({
    topic: 'topic-1',
    expiry: Math.floor(Date.now() / 1000) + 3600,
    namespaces: {
        algorand: {
            accounts: [`${chainId}:${ADDR_A}`, `${chainId}:${ADDR_B}`],
            methods: ['algo_signTxn', 'algo_signData'],
            events: [],
        },
    },
    peer: {
        metadata: {
            name: 'Pera',
            description: '',
            url: 'https://perawallet.app',
            icons: [],
        },
    },
    ...over,
})

type Handler = (args: { topic: string }) => void

const makeClient = (sessions: WcSession[] = []) => {
    const handlers: Record<string, Handler[]> = {
        session_delete: [],
        session_expire: [],
    }
    let approvalResolver: ((s: WcSession) => void) | null = null
    const client: WcClient & {
        emit: (
            event: 'session_delete' | 'session_expire',
            topic: string,
        ) => void
        approve: (s: WcSession) => void
    } = {
        connect: vi.fn(async () => ({
            uri: 'wc:abc@2?relay-protocol=irn&symKey=123',
            approval: () =>
                new Promise<WcSession>(resolve => (approvalResolver = resolve)),
        })),
        // The mock resolves a concrete value; `request` is generic in `T`, so the
        // cast is what lets a fixed return type stand in for it.
        request: vi.fn(async () => ['AQID', null]) as WcClient['request'],
        disconnect: vi.fn(async () => undefined),
        session: { getAll: () => sessions },
        on: (event, handler) => handlers[event].push(handler),
        off: (event, handler) => {
            handlers[event] = handlers[event].filter(h => h !== handler)
        },
        emit: (event, topic) => handlers[event].forEach(h => h({ topic })),
        approve: s => approvalResolver?.(s),
    }
    return client
}

const makeUi = () => {
    const ui = {
        openPairing: vi.fn<(uri: string, onClosed: () => void) => void>(),
        closePairing: vi.fn(),
        showSignPrompt: vi.fn(() => vi.fn()),
    }
    return ui as PairingUi & typeof ui
}

const makeTransport = (
    over: Partial<V2TransportDeps> = {},
    sessions: WcSession[] = [],
) => {
    const client = makeClient(sessions)
    const ui = makeUi()
    const createClient = vi.fn(async () => client)
    const transport = new V2Transport({
        getProjectId: () => 'pid',
        initialChain: ChainType.TestNet,
        createClient,
        ui,
        isTouchDevice: () => false,
        ...over,
    })
    return { transport, client, ui, createClient }
}

const flush = () => new Promise(r => setTimeout(r, 0))

describe('V2Transport connect', () => {
    it('throws MISSING_PROJECT_ID without creating a client', async () => {
        const { transport, createClient } = makeTransport({
            getProjectId: () => undefined,
        })

        await expect(transport.connect()).rejects.toSatisfy(e =>
            isWcV2Error(e, 'MISSING_PROJECT_ID'),
        )
        expect(createClient).not.toHaveBeenCalled()
    })

    it('throws UNSUPPORTED_NETWORK on LocalNet and Custom without creating a client', async () => {
        for (const chain of [ChainType.LocalNet, ChainType.Custom]) {
            const { transport, createClient } = makeTransport({
                initialChain: chain,
            })

            await expect(transport.connect()).rejects.toSatisfy(e =>
                isWcV2Error(e, 'UNSUPPORTED_NETWORK'),
            )
            expect(createClient).not.toHaveBeenCalled()
        }
    })

    it('proposes exactly one algorand namespace for the current chain', async () => {
        const { transport, client } = makeTransport()
        const pending = transport.connect()
        await flush()

        expect(client.connect).toHaveBeenCalledWith({
            requiredNamespaces: {
                algorand: {
                    chains: [TESTNET],
                    methods: ['algo_signTxn', 'algo_signData'],
                    events: [],
                },
            },
        })
        client.approve(makeSession())
        await pending
    })

    it('shows the pairing URI, then resolves with bare addresses on the proposed chain', async () => {
        const { transport, client, ui } = makeTransport()
        const pending = transport.connect()
        await flush()

        expect(ui.openPairing).toHaveBeenCalledWith(
            'wc:abc@2?relay-protocol=irn&symKey=123',
            expect.any(Function),
        )
        client.approve(
            makeSession({
                namespaces: {
                    algorand: {
                        accounts: [
                            `${TESTNET}:${ADDR_A}`,
                            `${MAINNET}:${ADDR_B}`,
                            `${TESTNET}:${ADDR_B}`,
                        ],
                        methods: ['algo_signTxn'],
                        events: [],
                    },
                },
            }),
        )

        await expect(pending).resolves.toEqual([ADDR_A, ADDR_B])
        expect(ui.closePairing).toHaveBeenCalled()
        expect(transport.isConnected).toBe(true)
        expect(transport.accounts).toEqual([ADDR_A, ADDR_B])
        expect(transport.describe()).toBe(
            'wss://relay.walletconnect.com (topic topic-1…)',
        )
    })

    it('rejects with MODAL_CLOSED when the user dismisses the dialog first', async () => {
        const { transport, ui } = makeTransport()
        const pending = transport.connect()
        await flush()
        const onClosed = ui.openPairing.mock.calls[0][1]

        onClosed()

        await expect(pending).rejects.toSatisfy(e =>
            isWcV2Error(e, 'MODAL_CLOSED'),
        )
        expect(transport.isConnected).toBe(false)
    })

    it('reuses one client across connects', async () => {
        const { transport, client, createClient } = makeTransport()
        const first = transport.connect()
        await flush()
        client.approve(makeSession())
        await first
        await transport.disconnect()
        const second = transport.connect()
        await flush()
        client.approve(makeSession({ topic: 'topic-2' }))
        await second

        expect(createClient).toHaveBeenCalledTimes(1)
    })
})

describe('V2Transport session lifecycle', () => {
    it('fires onDisconnect and clears state on session_delete for the active topic only', async () => {
        const { transport, client } = makeTransport()
        const handler = vi.fn()
        transport.onDisconnect(handler)
        const pending = transport.connect()
        await flush()
        client.approve(makeSession())
        await pending

        client.emit('session_delete', 'other-topic')
        expect(handler).not.toHaveBeenCalled()

        client.emit('session_delete', 'topic-1')
        expect(handler).toHaveBeenCalledTimes(1)
        expect(transport.isConnected).toBe(false)
        expect(transport.accounts).toEqual([])
    })

    it('disconnect sends USER_DISCONNECTED and fires handlers', async () => {
        const { transport, client } = makeTransport()
        const handler = vi.fn()
        transport.onDisconnect(handler)
        const pending = transport.connect()
        await flush()
        client.approve(makeSession())
        await pending

        await transport.disconnect()

        expect(client.disconnect).toHaveBeenCalledWith({
            topic: 'topic-1',
            reason: { code: 6000, message: 'User disconnected' },
        })
        expect(handler).toHaveBeenCalledTimes(1)
        expect(transport.isConnected).toBe(false)
    })

    it('disconnect when not connected is a no-op', async () => {
        const { transport, client } = makeTransport()

        await expect(transport.disconnect()).resolves.toBeUndefined()
        expect(client.disconnect).not.toHaveBeenCalled()
    })

    it('setChain to a different network disconnects a live session and later proposes the new chain', async () => {
        const { transport, client } = makeTransport()
        const pending = transport.connect()
        await flush()
        client.approve(makeSession())
        await pending

        transport.setChain(ChainType.MainNet)
        await flush()

        expect(client.disconnect).toHaveBeenCalled()
        expect(transport.isConnected).toBe(false)

        const again = transport.connect()
        await flush()
        expect(client.connect).toHaveBeenLastCalledWith({
            requiredNamespaces: {
                algorand: {
                    chains: [MAINNET],
                    methods: ['algo_signTxn', 'algo_signData'],
                    events: [],
                },
            },
        })
        client.approve(makeSession({}, MAINNET))
        await again
    })

    it('setChain to the same network keeps the session', async () => {
        const { transport, client } = makeTransport()
        const pending = transport.connect()
        await flush()
        client.approve(makeSession())
        await pending

        transport.setChain(ChainType.TestNet)

        expect(client.disconnect).not.toHaveBeenCalled()
        expect(transport.isConnected).toBe(true)
    })
})

describe('V2Transport reconnect', () => {
    it('adopts the newest unexpired algorand session for the current chain', async () => {
        const now = 1_700_000_000
        const sessions = [
            makeSession({ topic: 'old', expiry: now + 100 }),
            makeSession({ topic: 'expired', expiry: now - 1 }),
            makeSession({ topic: 'newest', expiry: now + 500 }),
            {
                ...makeSession({ topic: 'eth', expiry: now + 900 }),
                namespaces: {
                    eip155: {
                        accounts: ['eip155:1:0x1'],
                        methods: [],
                        events: [],
                    },
                },
            },
        ]
        const { transport } = makeTransport({ now: () => now * 1000 }, sessions)

        await expect(transport.reconnectSession()).resolves.toEqual([
            ADDR_A,
            ADDR_B,
        ])
        expect(transport.describe()).toContain('newest')
        expect(transport.isConnected).toBe(true)
    })

    it('ignores sessions approved for another chain', async () => {
        const { transport } = makeTransport({}, [makeSession({}, MAINNET)])

        await expect(transport.reconnectSession()).resolves.toEqual([])
        expect(transport.isConnected).toBe(false)
    })

    it('resolves empty when there is no project id (never throws on page load)', async () => {
        const { transport, createClient } = makeTransport({
            getProjectId: () => undefined,
        })

        await expect(transport.reconnectSession()).resolves.toEqual([])
        expect(createClient).not.toHaveBeenCalled()
    })

    it('resolves empty on LocalNet without creating a client', async () => {
        const { transport, createClient } = makeTransport({
            initialChain: ChainType.LocalNet,
        })

        await expect(transport.reconnectSession()).resolves.toEqual([])
        expect(createClient).not.toHaveBeenCalled()
    })
})

describe('V2Transport signing', () => {
    const params: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        flatFee: true,
        firstValid: 1,
        lastValid: 1000,
        genesisID: 'testnet-v1.0',
        genesisHash: algosdk.base64ToBytes(
            'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        ),
    }
    const pay = (amount = 1) =>
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: A.addr,
            receiver: B.addr,
            amount,
            suggestedParams: params,
        })
    const signedBy = (
        account: algosdk.Account,
        txn: algosdk.Transaction,
    ): Uint8Array => algosdk.signTransaction(txn, account.sk).blob
    const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
    /** What a wallet that raises one txn's fee sends back: copies of the
     *  group with that fee and a group id recomputed over the new fees. */
    const regroupWithFee = (
        txns: algosdk.Transaction[],
        index: number,
        fee: bigint,
    ): algosdk.Transaction[] => {
        const copies = txns.map(txn =>
            algosdk.Transaction.fromEncodingData(txn.toEncodingData()),
        )
        copies[index].fee = fee
        copies.forEach(txn => (txn.group = undefined))
        algosdk.assignGroupID(copies)
        return copies
    }

    const connected = async (over: Partial<V2TransportDeps> = {}) => {
        const made = makeTransport(over)
        const pending = made.transport.connect()
        await flush()
        made.client.approve(makeSession())
        await pending
        return made
    }

    it('throws NOT_CONNECTED before a session exists', async () => {
        const { transport } = makeTransport()

        await expect(
            transport.signTransaction([[{ txn: pay() }]]),
        ).rejects.toSatisfy(e => isWcV2Error(e, 'NOT_CONNECTED'))
    })

    it('sends algo_signTxn with [WalletTransaction[]] on the session chain and decodes results', async () => {
        const { transport, client } = await connected()
        const txn = pay()
        const signed = signedBy(A, txn)
        ;(client.request as Mock).mockResolvedValueOnce([b64(signed), null])

        const result = await transport.signTransaction([
            [{ txn }, { txn: pay(), signers: [] }],
        ])

        expect(client.request).toHaveBeenCalledWith({
            topic: 'topic-1',
            chainId: TESTNET,
            request: {
                method: 'algo_signTxn',
                params: [
                    [
                        {
                            txn: Buffer.from(
                                algosdk.encodeUnsignedTransaction(txn),
                            ).toString('base64'),
                        },
                        expect.objectContaining({ signers: [] }),
                    ],
                ],
            },
        })
        expect(result).toEqual([signed])
    })

    describe('checks the signed transactions against the request', () => {
        const signTxnError = (error: unknown) =>
            isWcV2Error(error, 'SIGN_TRANSACTIONS')

        it.each([
            ['fewer results', (one: string) => [one], 2, 1],
            ['more results', (one: string) => [one, one, one], 2, 3],
            ['a null in a signable slot', (one: string) => [one, null], 2, 1],
        ])('rejects %s', async (_label, answer, expected, received) => {
            const { transport, client } = await connected()
            const txns = [pay(), pay(2)]
            algosdk.assignGroupID(txns)
            ;(client.request as Mock).mockResolvedValueOnce(
                answer(b64(signedBy(A, txns[0]))),
            )

            const error = await transport
                .signTransaction([txns.map(txn => ({ txn }))])
                .catch(e => e)

            expect(signTxnError(error)).toBe(true)
            expect(error.message).toBe(
                `Expected ${expected} signed transaction(s) from the wallet but received ${received}`,
            )
        })

        it('rejects a transaction the dApp did not ask for', async () => {
            const { transport, client } = await connected()
            ;(client.request as Mock).mockResolvedValueOnce([
                b64(signedBy(A, pay(999))),
            ])

            const error = await transport
                .signTransaction([[{ txn: pay() }]])
                .catch(e => e)

            expect(signTxnError(error)).toBe(true)
            expect(error.message).toBe(
                'The wallet returned a different transaction than the one requested at position 0',
            )
        })

        it('rejects a blob that is not a signed transaction', async () => {
            const { transport, client } = await connected()
            ;(client.request as Mock).mockResolvedValueOnce(['AQID'])

            await expect(
                transport.signTransaction([[{ txn: pay() }]]),
            ).rejects.toSatisfy(signTxnError)
        })

        it('keeps the decode failure as the cause of an undecodable blob', async () => {
            const { transport, client } = await connected()
            ;(client.request as Mock).mockResolvedValueOnce(['AQID'])

            const error = await transport
                .signTransaction([[{ txn: pay() }]])
                .catch(e => e)

            expect(signTxnError(error)).toBe(true)
            expect(error.message).toBe(
                'The wallet returned a different transaction than the one requested at position 0',
            )
            expect(error.cause).toBeInstanceOf(Error)
            expect(error.cause).not.toBe(error)
        })

        it('accepts a raised fee when the group id is recomputed for it', async () => {
            const { transport, client } = await connected()
            const txns = [pay(), pay(2)]
            algosdk.assignGroupID(txns)
            const [raised, other] = regroupWithFee(txns, 0, 2000n)
            ;(client.request as Mock).mockResolvedValueOnce([
                b64(signedBy(A, raised)),
                b64(signedBy(A, other)),
            ])

            await expect(
                transport.signTransaction([txns.map(txn => ({ txn }))]),
            ).resolves.toHaveLength(2)
        })

        it('rejects a raised fee that keeps the stale group id', async () => {
            const { transport, client } = await connected()
            const txns = [pay(), pay(2)]
            algosdk.assignGroupID(txns)
            const raised = algosdk.Transaction.fromEncodingData(
                txns[0].toEncodingData(),
            )
            raised.fee = 2000n
            ;(client.request as Mock).mockResolvedValueOnce([
                b64(signedBy(A, raised)),
                b64(signedBy(A, txns[1])),
            ])

            await expect(
                transport.signTransaction([txns.map(txn => ({ txn }))]),
            ).rejects.toSatisfy(signTxnError)
        })

        it('rejects a changed group id when no fee changed', async () => {
            const { transport, client } = await connected()
            const txns = [pay(), pay(2)]
            algosdk.assignGroupID(txns)
            const regrouped = algosdk.Transaction.fromEncodingData(
                txns[0].toEncodingData(),
            )
            regrouped.group = new Uint8Array(32).fill(7)
            ;(client.request as Mock).mockResolvedValueOnce([
                b64(signedBy(A, regrouped)),
                b64(signedBy(A, txns[1])),
            ])

            await expect(
                transport.signTransaction([txns.map(txn => ({ txn }))]),
            ).rejects.toSatisfy(signTxnError)
        })

        it.each([
            ['with nulls', (one: string) => [null, one, null]],
            ['filtered', (one: string) => [one]],
        ])(
            'accepts nulls only on `signers: []` slots (%s)',
            async (_label, answer) => {
                const { transport, client } = await connected()
                const txns = [pay(1), pay(2), pay(3)]
                algosdk.assignGroupID(txns)
                const signed = signedBy(A, txns[1])
                ;(client.request as Mock).mockResolvedValueOnce(
                    answer(b64(signed)),
                )

                await expect(
                    transport.signTransaction([
                        [
                            { txn: txns[0], signers: [] },
                            { txn: txns[1] },
                            { txn: txns[2], signers: [] },
                        ],
                    ]),
                ).resolves.toEqual([signed])
            },
        )

        it('counts only listed slots as signable in signerAddress mode', async () => {
            const { transport, client } = await connected()
            const txns = [pay(1), pay(2)]
            algosdk.assignGroupID(txns)
            const signed = signedBy(A, txns[0])
            ;(client.request as Mock).mockResolvedValueOnce([b64(signed), null])

            await expect(
                transport.signTransaction(
                    [[{ txn: txns[0], signers: [ADDR_A] }, { txn: txns[1] }]],
                    ADDR_A,
                ),
            ).resolves.toEqual([signed])
        })

        it('matches positions across several groups', async () => {
            const { transport, client } = await connected()
            const first = [pay(1), pay(2)]
            algosdk.assignGroupID(first)
            const standalone = pay(3)
            ;(client.request as Mock).mockResolvedValueOnce([
                b64(signedBy(A, first[1])),
                b64(signedBy(A, standalone)),
            ])

            await expect(
                transport.signTransaction([
                    [{ txn: first[0], signers: [] }, { txn: first[1] }],
                    [{ txn: standalone }],
                ]),
            ).resolves.toHaveLength(2)
        })
    })

    it('sends legacy algo_signData as an array with the numeric chain id', async () => {
        const { transport, client } = await connected()
        ;(client.request as Mock).mockResolvedValueOnce(['AQ=='])

        await transport.signData(
            [{ data: new Uint8Array([1]), message: 'm' }],
            ADDR_A,
            false,
        )

        expect(client.request).toHaveBeenCalledWith({
            topic: 'topic-1',
            chainId: TESTNET,
            request: {
                method: 'algo_signData',
                params: [
                    {
                        data: 'AQ==',
                        message: 'm',
                        signer: ADDR_A,
                        chainId: 416_002,
                    },
                ],
            },
        })
    })

    it.each([
        ['no signatures', []],
        ['only nulls', [null, null]],
        ['one signature for two payloads', ['AQ==']],
        ['three signatures for two payloads', ['AQ==', 'AQ==', 'AQ==']],
    ])(
        'rejects signData answers with %s, whether or not it verifies',
        async (_label, answer) => {
            const received = answer.filter(item => item !== null).length
            for (const verify of [false, true]) {
                const { transport, client } = await connected()
                ;(client.request as Mock).mockResolvedValueOnce(answer)

                const error = await transport
                    .signData(
                        [
                            { data: new Uint8Array([1]), message: 'one' },
                            { data: new Uint8Array([2]), message: 'two' },
                        ],
                        ADDR_A,
                        verify,
                    )
                    .catch(e => e)

                expect(isWcV2Error(error, 'SIGN_DATA_COUNT_MISMATCH')).toBe(
                    true,
                )
                expect(error.message).toBe(
                    `Wallet returned ${received} signatures for 2 payloads`,
                )
            }
        },
    )

    it('wraps a raw JSON-RPC rejection in a readable WcV2Error', async () => {
        const { transport, client } = await connected()
        ;(client.request as Mock).mockRejectedValueOnce({
            code: -32_000,
            message: 'User rejected',
        })

        const error = await transport
            .signTransaction([[{ txn: pay() }]])
            .catch(e => e)

        expect(isWcV2Error(error, 'REQUEST_FAILED')).toBe(true)
        expect(error.message).toBe('User rejected')
        expect(error.code).toBe(-32_000)
        expect(String(error)).toBe('WcV2Error: User rejected')
    })

    it('re-throws a real Error from the client unchanged', async () => {
        const { transport, client } = await connected()
        const original = new Error('relay down')
        ;(client.request as Mock).mockRejectedValueOnce(original)

        await expect(
            transport.signTransaction([[{ txn: pay() }]]),
        ).rejects.toBe(original)
    })

    it('verifies legacy signatures when asked and rejects bad ones', async () => {
        const { transport, client } = await connected()
        const data = new Uint8Array([5, 6])
        const good = algosdk.signBytes(data, A.sk)
        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(good).toString('base64'),
        ])

        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).resolves.toEqual([good])

        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(new Uint8Array(64)).toString('base64'),
        ])
        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).rejects.toSatisfy(e =>
            isWcV2Error(e, 'SIGN_DATA_VERIFICATION_FAILED'),
        )
    })

    it("verifies a rekeyed account's signature against its auth address", async () => {
        const resolveAuthAddr = vi.fn(async () => ADDR_B)
        const { transport, client } = await connected({ resolveAuthAddr })
        const data = new Uint8Array([5, 6])
        const signedByAuthAddr = algosdk.signBytes(data, B.sk)
        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(signedByAuthAddr).toString('base64'),
        ])

        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).resolves.toEqual([signedByAuthAddr])
        expect(resolveAuthAddr).toHaveBeenCalledWith(ADDR_A, ChainType.TestNet)
    })

    it('verifies against the signer when the account is not rekeyed', async () => {
        const { transport, client } = await connected({
            resolveAuthAddr: async () => null,
        })
        const data = new Uint8Array([5, 6])
        const good = algosdk.signBytes(data, A.sk)
        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(good).toString('base64'),
        ])

        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).resolves.toEqual([good])

        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(new Uint8Array(64)).toString('base64'),
        ])
        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).rejects.toSatisfy(e =>
            isWcV2Error(e, 'SIGN_DATA_VERIFICATION_FAILED'),
        )
    })

    it('falls back to the signer when the auth address lookup fails', async () => {
        const warn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined)
        const { transport, client } = await connected({
            resolveAuthAddr: async () => {
                throw new Error('algod unreachable')
            },
        })
        const data = new Uint8Array([5, 6])
        const good = algosdk.signBytes(data, A.sk)
        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(good).toString('base64'),
        ])

        await expect(
            transport.signData([{ data, message: 'm' }], ADDR_A, true),
        ).resolves.toEqual([good])
        expect(warn).toHaveBeenCalled()

        warn.mockRestore()
    })

    it('sends ARC-60 algo_signData as a single object and returns the response shape', async () => {
        const { transport, client } = await connected()
        ;(client.request as Mock).mockResolvedValueOnce(['CQk='])
        const payload = {
            data: Buffer.from('{}').toString('base64'),
            signer: algosdk.decodeAddress(ADDR_A).publicKey,
            domain: PAGE_DOMAIN,
            authenticatorData: new Uint8Array([1]),
        }

        const response = await transport.signArc60Data(
            payload,
            { scope: 1, encoding: 'base64' },
            false,
        )

        const sent = (client.request as Mock).mock.calls.at(-1)![0]
        expect(sent.request.method).toBe('algo_signData')
        expect(Array.isArray(sent.request.params)).toBe(false)
        expect(sent.request.params).toMatchObject({
            signer: ADDR_A,
            domain: PAGE_DOMAIN,
            metadata: { scope: 1, encoding: 'base64' },
        })
        expect(response.signature).toEqual(new Uint8Array([9, 9]))
        expect(response.domain).toBe(PAGE_DOMAIN)
    })

    it('rejects an ARC-60 payload whose domain is not the page origin before contacting the wallet', async () => {
        const { transport, client } = await connected()
        ;(client.request as Mock).mockClear()
        const payload = {
            data: Buffer.from('{}').toString('base64'),
            signer: algosdk.decodeAddress(ADDR_A).publicKey,
            domain: 'evil.example',
            authenticatorData: new Uint8Array([1]),
        }

        await expect(
            transport.signArc60Data(
                payload,
                { scope: 1, encoding: 'base64' },
                false,
            ),
        ).rejects.toSatisfy(e => isWcV2Error(e, 'SIGN_DATA_DOMAIN_MISMATCH'))
        expect(client.request).not.toHaveBeenCalled()
    })

    it('verifies ARC-60 signatures when asked and rejects bad ones', async () => {
        const { transport, client } = await connected()
        const json = `{"domain":"${PAGE_DOMAIN}"}`
        const jsonBytes = new Uint8Array(Buffer.from(json))
        const authenticatorData = sha256(utf8ToBytes(PAGE_DOMAIN))
        const payload = {
            data: Buffer.from(json).toString('base64'),
            signer: algosdk.decodeAddress(ADDR_A).publicKey,
            domain: PAGE_DOMAIN,
            authenticatorData,
        }
        // ARC-60: ed25519(sha256(data) || sha256(authenticatorData)), no prefix.
        const message = new Uint8Array([
            ...sha256(jsonBytes),
            ...sha256(authenticatorData),
        ])
        const good = ed25519.sign(message, A.sk.slice(0, 32))
        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(good).toString('base64'),
        ])

        const response = await transport.signArc60Data(
            payload,
            { scope: 1, encoding: 'base64' },
            true,
        )

        expect(response.signature).toEqual(good)

        ;(client.request as Mock).mockResolvedValueOnce([
            Buffer.from(new Uint8Array(64)).toString('base64'),
        ])
        await expect(
            transport.signArc60Data(
                payload,
                { scope: 1, encoding: 'base64' },
                true,
            ),
        ).rejects.toSatisfy(e =>
            isWcV2Error(e, 'SIGN_DATA_VERIFICATION_FAILED'),
        )
    })

    it('shows and dismisses the sign prompt on touch devices only', async () => {
        const touch = makeTransport({ isTouchDevice: () => true })
        const pending = touch.transport.connect()
        await flush()
        touch.client.approve(makeSession())
        await pending
        const dismiss = vi.fn()
        touch.ui.showSignPrompt.mockReturnValueOnce(dismiss)
        const txn = pay()
        ;(touch.client.request as Mock).mockResolvedValueOnce([
            b64(signedBy(A, txn)),
        ])

        await touch.transport.signTransaction([[{ txn }]])

        expect(touch.ui.showSignPrompt).toHaveBeenCalledTimes(1)
        expect(dismiss).toHaveBeenCalledTimes(1)

        const desktop = await connected()
        ;(desktop.client.request as Mock).mockResolvedValueOnce([
            b64(signedBy(A, txn)),
        ])
        await desktop.transport.signTransaction([[{ txn }]])
        expect(desktop.ui.showSignPrompt).not.toHaveBeenCalled()
    })
})

describe('V2Transport getEmptySignatures', () => {
    it('rejects with NOT_SUPPORTED without contacting the relay', async () => {
        const { transport, createClient } = makeTransport()

        await expect(
            transport.getEmptySignatures(ChainType.TestNet),
        ).rejects.toSatisfy(e => isWcV2Error(e, 'NOT_SUPPORTED'))
        expect(createClient).not.toHaveBeenCalled()
    })
})

describe('pairingDeepLink', () => {
    it('wraps the wc uri in the perawallet-wc scheme', () => {
        expect(pairingDeepLink('wc:abc@2?relay-protocol=irn&symKey=1')).toBe(
            'perawallet-wc://wc?uri=wc%3Aabc%402%3Frelay-protocol%3Dirn%26symKey%3D1',
        )
    })
})
