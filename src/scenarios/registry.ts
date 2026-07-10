import type { Scenario, Network } from "./types";
import { singlePayScenarios } from "./groups/single-pay";
import { singleAssetScenarios } from "./groups/single-asset";
import { singleAppScenarios } from "./groups/single-app";
import { singleKeyregScenarios } from "./groups/single-keyreg";
import { atomicGroupScenarios } from "./groups/atomic-group";
import { nonAtomicMultiScenarios } from "./groups/non-atomic-multi";
import { multiGroupMixedScenarios } from "./groups/multi-group-mixed";
import { multiAccountScenarios } from "./groups/multi-account";
import { arbitraryDataScenarios } from "./groups/arbitrary-data";
import { arc60Scenarios } from "./groups/arc60";
import { edgeCaseScenarios } from "./groups/edge-case";
import { mainnetDappScenarios } from "./groups/mainnet-dapp";

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
  ...edgeCaseScenarios,
  ...mainnetDappScenarios
];

export interface NumberedScenario extends Scenario {
  number: number;
}

export const getScenarios = (network: Network): NumberedScenario[] => {
  return allScenarios
    .map((s, i) => ({ ...s, number: i + 1 }))
    .filter((s) => s.networks.includes(network));
};

export const getAllScenarios = (): NumberedScenario[] => {
  return allScenarios.map((s, i) => ({ ...s, number: i + 1 }));
};

export const getScenarioById = (id: string): Scenario | undefined => {
  return allScenarios.find((s) => s.id === id);
};
