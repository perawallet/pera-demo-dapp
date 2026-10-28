import type { ChainType } from '@lib/algod/networks'
import { getNetworkConfig } from '@lib/algod/networks'

export interface PeraAsset {
    asset_id: number
    name: string
    unit_name: string
}

interface ListResponse<Result> {
    next: string | null
    previous: string | null
    results: Result[]
}

export class PeraApiUnavailableError extends Error {
    constructor(networkLabel: string) {
        super(
            `The Pera API is unavailable on ${networkLabel}; it only covers MainNet and TestNet.`,
        )
        this.name = 'PeraApiUnavailableError'
    }
}

export const isPeraApiAvailable = (chain: ChainType): boolean =>
    getNetworkConfig(chain).peraApiBaseUrl !== undefined

const getJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal,
    })

    if (!response.ok) {
        throw new Error(`GET ${url} failed with ${response.status}`)
    }

    return (await response.json()) as T
}

/**
 * Walks the paginated asset list until `count` assets are collected or the
 * list ends. Used to build bulk opt-in groups against real asset IDs.
 */
export const fetchAssets = async (
    chain: ChainType,
    count: number,
    signal?: AbortSignal,
): Promise<PeraAsset[]> => {
    const { peraApiBaseUrl, label } = getNetworkConfig(chain)

    if (!peraApiBaseUrl) {
        throw new PeraApiUnavailableError(label)
    }

    const assets: PeraAsset[] = []
    let next: string | null = `${peraApiBaseUrl}assets/`

    while (next && assets.length < count) {
        const page: ListResponse<PeraAsset> = await getJson(next, signal)

        assets.push(...page.results)
        next = page.next
    }

    return assets.slice(0, count)
}
