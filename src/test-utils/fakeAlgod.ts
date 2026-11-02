import { TEST_SUGGESTED_PARAMS } from './fixtures'

const call = <T>(result: T | (() => T)) => ({
    do: async () =>
        typeof result === 'function' ? (result as () => T)() : result,
})

/** Just enough of `algosdk.Algodv2` for the app's flows. */
export const createFakeAlgod = () => {
    const algod = {
        balance: 12_345_678n,
        sent: [] as Uint8Array[][],
        accountInformation: vi.fn((address: string) =>
            call(() => ({ address, amount: algod.balance, assets: [] })),
        ),
        getTransactionParams: vi.fn(() => call(TEST_SUGGESTED_PARAMS)),
        sendRawTransaction: vi.fn((bytes: Uint8Array | Uint8Array[]) => {
            algod.sent.push(Array.isArray(bytes) ? bytes : [bytes])
            return call({ txid: 'TXID' })
        }),
        status: vi.fn(() => call({ lastRound: 1000n })),
        statusAfterBlock: vi.fn(() => call({ lastRound: 1001n })),
        pendingTransactionInformation: vi.fn(() =>
            call({ confirmedRound: 1001n, poolError: '', assetIndex: 999n }),
        ),
        getAssetByID: vi.fn(() => call({ params: {} })),
    }

    return algod
}

export type FakeAlgod = ReturnType<typeof createFakeAlgod>

export const fakeAlgod = createFakeAlgod()
