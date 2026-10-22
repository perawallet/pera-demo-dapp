import { arbitraryDataScenarios } from './groups/arbitrary-data'
import { arc60Scenarios } from './groups/arc60'
import { atomicGroupScenarios } from './groups/atomic-group'
import { edgeCaseScenarios } from './groups/edge-case'
import { emptySignatureScenarios } from './groups/empty-signatures'
import { mainnetDappScenarios } from './groups/mainnet-dapp'
import { multiAccountScenarios } from './groups/multi-account'
import { multiGroupMixedScenarios } from './groups/multi-group-mixed'
import { nonAtomicMultiScenarios } from './groups/non-atomic-multi'
import { singleAppScenarios } from './groups/single-app'
import { singleAssetScenarios } from './groups/single-asset'
import { singleKeyregScenarios } from './groups/single-keyreg'
import { singlePayScenarios } from './groups/single-pay'
import type { Scenario, Network } from './types'

const allScenarios: Scenario[] = [
    ...singlePayScenarios,
    ...singleAssetScenarios,
    ...singleAppScenarios,
    ...singleKeyregScenarios,
    ...atomicGroupScenarios,
    ...nonAtomicMultiScenarios,
    ...multiGroupMixedScenarios,
    ...multiAccountScenarios,
    ...arbitraryDataScenarios,
    ...arc60Scenarios,
    ...emptySignatureScenarios,
    ...edgeCaseScenarios,
    ...mainnetDappScenarios,
]

export interface NumberedScenario extends Scenario {
    number: number
}

export const getScenarios = (network: Network): NumberedScenario[] => {
    return allScenarios
        .map((s, i) => ({ ...s, number: i + 1 }))
        .filter(s => s.networks.includes(network))
}

export const getAllScenarios = (): NumberedScenario[] => {
    return allScenarios.map((s, i) => ({ ...s, number: i + 1 }))
}
