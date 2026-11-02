import { ChainType } from '@lib/algod/networks'

import {
    fetchAssets,
    isPeraApiAvailable,
    PeraApiUnavailableError,
} from '../peraApi'

const asset = (id: number) => ({
    asset_id: id,
    name: `Asset ${id}`,
    unit_name: `A${id}`,
})

const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200 })

describe('peraApi', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('is available only on networks with a Pera API', () => {
        expect(isPeraApiAvailable(ChainType.MainNet)).toBe(true)
        expect(isPeraApiAvailable(ChainType.TestNet)).toBe(true)
        for (const chain of [
            ChainType.BetaNet,
            ChainType.LocalNet,
            ChainType.Custom,
        ]) {
            expect(isPeraApiAvailable(chain)).toBe(false)
        }
    })

    it('follows pagination until enough assets are collected', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({
                    next: 'https://next.page/',
                    previous: null,
                    results: [asset(1), asset(2)],
                }),
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    next: 'https://third.page/',
                    previous: null,
                    results: [asset(3), asset(4)],
                }),
            )
        vi.stubGlobal('fetch', fetchMock)

        const assets = await fetchAssets(ChainType.TestNet, 3)

        expect(assets.map(a => a.asset_id)).toEqual([1, 2, 3])
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[1][0]).toBe('https://next.page/')
    })

    it('rejects on networks without a Pera API', async () => {
        await expect(fetchAssets(ChainType.LocalNet, 1)).rejects.toBeInstanceOf(
            PeraApiUnavailableError,
        )
    })
})
