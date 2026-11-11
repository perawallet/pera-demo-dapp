// Every build fetches suggested params first; without this mock they would all
// die on a refused connection and the checks below would see nothing.
vi.mock('@lib/algod/algod', async importOriginal => {
    const actual = await importOriginal<typeof import('@lib/algod/algod')>()

    return {
        ...actual,
        apiGetTxnParams: vi.fn().mockResolvedValue({
            fee: 1000,
            minFee: 1000,
            firstValid: 1,
            lastValid: 1001,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32),
            flatFee: false,
        }),
        clientForChain: vi.fn(() => ({})),
    }
})

import algosdk from 'algosdk'

import type { SignerTransaction } from '@perawallet/connect'

import { ChainType } from '@lib/algod/algod'
import {
    ASSET_NAME_MAX_BYTES,
    ASSET_URL_MAX_BYTES,
    UNIT_NAME_MAX_BYTES,
} from '@modules/custom-txn/buildCustomTxn'

import { setOwnedAsset } from '../owned-asset'
import { getAllScenarios, type NumberedScenario } from '../registry'
import type { Network } from '../types'

const CHAIN_FOR_NETWORK: Record<Network, ChainType> = {
    testnet: ChainType.TestNet,
    mainnet: ChainType.MainNet,
}

// Connected accounts outside the bundled test accounts, so a slot sent by a
// test account never passes as "connected" by accident.
const CONNECTED = [
    algosdk.generateAccount().addr.toString(),
    algosdk.generateAccount().addr.toString(),
]
const [ADDRESS] = CONNECTED

interface Built {
    scenario: NumberedScenario
    network: Network
    groups: SignerTransaction[][]
    transactionTimeout?: number
}

interface Catalogue {
    built: Built[]
    /** Builds that answered with anything but transactions. */
    notices: string[]
}

/** Builds every transaction scenario on each network it runs on. A build that
 *  throws, or answers without transactions, fails the test rather than dropping out
 *  of the checks. */
const buildCatalogue = async (): Promise<Catalogue> => {
    const built: Built[] = []
    const notices: string[] = []

    for (const scenario of getAllScenarios()) {
        if ((scenario.kind ?? 'txn') !== 'txn') continue

        for (const network of scenario.networks) {
            const chain = CHAIN_FOR_NETWORK[network]

            setOwnedAsset(chain, ADDRESS, 123_456)

            const result = await scenario.build(chain, ADDRESS, CONNECTED)

            if ('transaction' in result) {
                built.push({
                    scenario,
                    network,
                    groups: result.transaction,
                    transactionTimeout: result.transactionTimeout,
                })
            } else {
                notices.push(
                    `${scenario.id} (${network}): ${'notice' in result ? result.notice : 'no transactions'}`,
                )
            }
        }
    }

    return { built, notices }
}

const utf8Length = (text: string | undefined) =>
    new TextEncoder().encode(text ?? '').length

/** Moves value from the connected account to somebody else. */
const paysAway = ({ txn }: SignerTransaction): boolean => {
    const sender = txn.sender.toString()

    if (!CONNECTED.includes(sender)) return false

    const transfer = txn.payment ?? txn.assetTransfer

    return (
        transfer !== undefined &&
        (transfer.receiver.toString() !== sender ||
            transfer.closeRemainderTo !== undefined)
    )
}

describe('scenario catalogue', () => {
    let catalogue: Built[]
    let notices: string[]

    beforeAll(async () => {
        localStorage.clear()
        // Answer the future-transaction prompt so that build is checked too;
        // the setup scenario's blank answer takes its create path.
        const answerPrompts = vi
            .spyOn(window, 'prompt')
            .mockImplementation(message =>
                message?.includes('minutes') ? '1' : null,
            )

        try {
            ;({ built: catalogue, notices } = await buildCatalogue())
        } finally {
            answerPrompts.mockRestore()
        }
    })

    it('builds every transaction scenario', () => {
        const builtIds = new Set(catalogue.map(b => b.scenario.id))

        expect(notices).toEqual([])
        expect(builtIds.size).toBeGreaterThan(80)
        expect(builtIds).toContain('atomic-full-group-of-16')
        expect(builtIds).toContain('mainnet-algoxnft-buy-nft')
        expect(builtIds).toContain('future-transaction')
    })

    // algod refuses a txID it has seen, including earlier in the same request.
    it('never repeats a transaction id within one build', () => {
        const repeated = catalogue
            .filter(({ groups }) => {
                const ids = groups.flat().map(slot => slot.txn.txID())

                return new Set(ids).size !== ids.length
            })
            .map(({ scenario, network }) => `${scenario.id} (${network})`)

        expect(repeated).toEqual([])
    })

    it('keeps asset names, unit names and URLs within the protocol limits', () => {
        const checked: string[] = []
        const oversized: string[] = []

        for (const { scenario, groups } of catalogue) {
            for (const { txn } of groups.flat()) {
                const config = txn.assetConfig

                if (!config) continue
                checked.push(scenario.id)

                if (
                    utf8Length(config.assetName) > ASSET_NAME_MAX_BYTES ||
                    utf8Length(config.unitName) > UNIT_NAME_MAX_BYTES ||
                    utf8Length(config.assetURL) > ASSET_URL_MAX_BYTES
                ) {
                    oversized.push(scenario.id)
                }
            }
        }

        expect(checked).toContain('single-acfg-create-metadata-hash')
        expect(oversized).toEqual([])
    })

    // Only `signers: []` tells the wallet a slot is not its to sign; anything
    // else asks it to sign for an account it does not hold.
    it('marks every slot from an unconnected sender as external', () => {
        const deliberatelyUnmarked = [
            // The wallet is meant to refuse an unknown sender.
            'edge-unconnected-sender',
            'single-appl-optin-with-app-rekey',
        ]
        const unmarked = catalogue
            .filter(
                ({ scenario }) => !deliberatelyUnmarked.includes(scenario.id),
            )
            .flatMap(({ scenario, groups }) =>
                groups
                    .flat()
                    .filter(
                        slot =>
                            !CONNECTED.includes(slot.txn.sender.toString()) &&
                            slot.signers?.length !== 0,
                    )
                    .map(() => scenario.id),
            )

        expect(unmarked).toEqual([])
    })

    // MainNet protocol flows are replayed one txn per group: an app call can
    // never see its payment, so submitting would only lose the funds.
    it('never submits a MainNet flow that pays away from the connected account', () => {
        const submitsOnMainNet = ['mainnet-zone-transfer']
        const unguarded = catalogue
            .filter(
                ({ scenario, network }) =>
                    network === 'mainnet' &&
                    !scenario.signOnly &&
                    !submitsOnMainNet.includes(scenario.id),
            )
            .filter(({ groups }) => groups.flat().some(paysAway))
            .map(({ scenario }) => scenario.id)

        expect(unguarded).toEqual([])
    })

    it('pins the sign-only set', () => {
        expect(
            getAllScenarios()
                .filter(s => s.signOnly)
                .map(s => s.id),
        ).toEqual([
            'mainnet-algofi-swap-algo-usdc',
            'mainnet-algofi-swap-algo-goeth',
            'mainnet-folksfinance-deposit-algo',
            'mainnet-folksfinance-pool-algo-usdc',
            'mainnet-algogems-auth',
            'mainnet-algogems-buy-nft',
            'mainnet-algoxnft-buy-nft',
        ])
    })

    // The runner skips submission for these, so anything that depends on a
    // submission would silently not happen.
    it('uses sign-only only where nothing depends on a submission', () => {
        const misused = getAllScenarios()
            .filter(s => s.signOnly)
            .filter(
                s =>
                    (s.kind ?? 'txn') !== 'txn' ||
                    s.captureCreatedAsset ||
                    s.clearsOwnedAssetOnSuccess,
            )
            .map(s => s.id)
        const delayed = catalogue
            .filter(b => b.scenario.signOnly && b.transactionTimeout)
            .map(b => b.scenario.id)

        expect(misused).toEqual([])
        expect(delayed).toEqual([])
    })

    // The runner sends every group in one wallet request and logs one line.
    it('does not promise a wallet request per group', () => {
        const misleading = getAllScenarios()
            .filter(({ description, expected }) =>
                [description, expected].some(text =>
                    /sequential (signing )?popups|separate algo_signTxn request|three 'Signed and sent' entries/i.test(
                        text,
                    ),
                ),
            )
            .map(s => s.id)

        expect(misleading).toEqual([])
    })
})
