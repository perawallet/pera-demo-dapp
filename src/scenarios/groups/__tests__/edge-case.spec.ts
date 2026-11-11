vi.mock('@lib/algod/algod', async importOriginal => ({
    ...(await importOriginal<typeof import('@lib/algod/algod')>()),
    apiGetTxnParams: vi.fn().mockResolvedValue({
        fee: 1000,
        minFee: 1000,
        firstValid: 1,
        lastValid: 1001,
        genesisID: 'testnet-v1.0',
        genesisHash: new Uint8Array(32),
        flatFee: false,
    }),
}))

import { ChainType } from '@lib/algod/algod'

import { testAccounts } from '../../test-accounts'
import { edgeCaseScenarios } from '../edge-case'

const ADDRESS = testAccounts[1].addr.toString()
const futureTransaction = edgeCaseScenarios.find(
    s => s.id === 'future-transaction',
)!

const buildWithAnswer = (answer: string | null) => {
    vi.spyOn(window, 'prompt').mockReturnValueOnce(answer)

    return futureTransaction.build(ChainType.TestNet, ADDRESS, [ADDRESS])
}

describe('future-transaction', () => {
    it.each([
        ['cancelled', null, 'Future transaction cancelled.'],
        ['left blank', '   ', 'Future transaction cancelled.'],
    ])(
        'stops with a notice when the prompt is %s',
        async (_label, answer, notice) => {
            await expect(buildWithAnswer(answer)).resolves.toEqual({ notice })
        },
    )

    it.each(['0', '-5', 'abc', 'Infinity', '35792'])(
        'stops with a notice for %s minutes',
        async answer => {
            await expect(buildWithAnswer(answer)).resolves.toEqual({
                notice: 'Enter a positive number of minutes (at most 35791).',
            })
        },
    )

    it('shifts the validity window and delays the submission', async () => {
        const result = await buildWithAnswer('2')

        if (!('transaction' in result)) throw new Error('expected a txn')
        const [[{ txn }]] = result.transaction
        expect(txn.firstValid).toBe(31n)
        expect(txn.lastValid).toBe(1031n)
        expect(result.transactionTimeout).toBe(120_000)
    })

    it('accepts a fraction of a minute', async () => {
        const result = await buildWithAnswer('0.5')

        expect(result).toMatchObject({ transactionTimeout: 30_000 })
    })
})
