import { clientForChain } from '@lib/algod/algod'
import { getNetworkConfig } from '@lib/algod/networks'
import {
    getPersistedCompactMode,
    getPersistedNetwork,
    getPersistedPreferExtension,
    getPersistedWcVersion,
    persistWcVersion,
} from '@lib/storage/settings'

import { PeraConnectManager } from './PeraConnectManager'
import { V1Transport } from './transport/V1Transport'
import { normalizeProjectId } from './transport/v2/projectId'
import { createSignClient } from './transport/v2/signClientFactory'
import { V2Transport } from './transport/v2/V2Transport'
import { createWallet } from './wallet'

const initialChain = getPersistedNetwork()

/** The v1 SDK owner. Exposed for the settings that only v1 has (compact mode,
 *  extension preference) and for ARC-60 signer resolution. */
export const peraConnect = new PeraConnectManager({
    compactMode: getPersistedCompactMode(),
    chainId: getNetworkConfig(initialChain).chainId,
    shouldPreferExtension: getPersistedPreferExtension(),
})

/** The app-wide wallet, dispatching to the selected WalletConnect version. */
export const wallet = createWallet({
    initialVersion: getPersistedWcVersion(),
    initialChain,
    createV1: () => new V1Transport(peraConnect),
    createV2: (chain, ui) =>
        new V2Transport({
            getProjectId: () =>
                normalizeProjectId(import.meta.env.VITE_REOWN_PROJECT_ID),
            initialChain: chain,
            createClient: createSignClient,
            ui,
            resolveAuthAddr: async (signer, chain) => {
                const info = await clientForChain(chain)
                    .accountInformation(signer)
                    .do()

                return info.authAddr ? info.authAddr.toString() : null
            },
        }),
    persistVersion: persistWcVersion,
})
