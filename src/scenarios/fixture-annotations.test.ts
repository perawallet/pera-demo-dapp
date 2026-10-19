// Scenarios fetch suggested params before reaching the fixture lookup. Without
// this mock every build() would die on a connection-refused error instead, and
// the assertions below would silently check nothing.
vi.mock('../core/utils/algod/algod', async importOriginal => {
    const actual =
        await importOriginal<typeof import('../core/utils/algod/algod')>()

    return {
        ...actual,
        apiGetTxnParams: vi.fn().mockResolvedValue({
            fee: 1000,
            minFee: 1000,
            firstValid: 1,
            lastValid: 1001,
            genesisID: 'localnet-v1',
            genesisHash: new Uint8Array(32),
            flatFee: false,
        }),
        clientForChain: vi.fn(() => ({
            accountInformation: () => ({ do: async () => ({ assets: [] }) }),
            getAssetByID: () => ({ do: async () => ({ params: {} }) }),
            status: () => ({ do: async () => ({}) }),
        })),
    }
})

import { ChainType } from '../core/utils/algod/algod'
import { getAllScenarios } from './registry'
import { MissingNetworkFixtureError } from './network-fixtures'
import { testAccounts } from './test-accounts'

// A genuinely valid Algorand address, derived the same way every scenario's
// own test fixtures are (algosdk.mnemonicToSecretKey in test-accounts.ts).
// `.addr` is an algosdk 3.x Address object, hence the .toString().
const ADDRESS = testAccounts[0].addr.toString()

/** Which fixture, if any, this scenario demands when built against a network
 *  that supplies none. Returns null when the build got far enough not to need
 *  one (or failed for an unrelated reason, which this test ignores). */
const missingFixtureFor = async (
    scenario: ReturnType<typeof getAllScenarios>[number],
): Promise<'app' | 'asset' | null> => {
    try {
        await scenario.build(ChainType.LocalNet, ADDRESS, [ADDRESS, ADDRESS])
        return null
    } catch (error) {
        return error instanceof MissingNetworkFixtureError
            ? error.fixture
            : null
    }
}

describe('fixture annotations', () => {
    const scenarios = getAllScenarios()

    it('annotates every scenario that needs a network fixture', async () => {
        const unannotated: string[] = []

        for (const scenario of scenarios) {
            const missing = await missingFixtureFor(scenario)

            if (missing && !scenario.requiresFixtures?.includes(missing)) {
                unannotated.push(`${scenario.id} (needs "${missing}")`)
            }
        }

        expect(unannotated).toEqual([])
    })

    it('does not annotate scenarios that need no network fixture', async () => {
        const overAnnotated: string[] = []

        for (const scenario of scenarios.filter(
            s => s.requiresFixtures?.length,
        )) {
            if ((await missingFixtureFor(scenario)) === null) {
                overAnnotated.push(scenario.id)
            }
        }

        expect(overAnnotated).toEqual([])
    })
})
