import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/pera-wallet/peraWalletTypes";

export enum ChainType {
  MainNet = "mainnet",
  TestNet = "testnet",
  BetaNet = "betanet",
  LocalNet = "localnet",
  Custom = "custom"
}

const MAINNET_CHAIN_ID = 416001;
const TESTNET_CHAIN_ID = 416002;
const BETANET_CHAIN_ID = 416003;
/** Network-agnostic: the wallet signs the bytes it is handed regardless of
 *  which network they target. Used for LocalNet and custom endpoints, which
 *  have no chain ID of their own. */
const ANY_NETWORK_CHAIN_ID = 4160;
/** AlgoKit LocalNet's algod token is 64 repetitions of "a". */
const LOCALNET_TOKEN_LENGTH = 64;

/** Chain IDs Pera Connect accepts. Declared locally rather than imported from
 *  `@perawallet/connect` because Jest cannot resolve that package's ESM
 *  exports map, and this module is unit tested. `ANY_NETWORK_CHAIN_ID` is
 *  network-agnostic. */
export type AlgorandChainId =
  | typeof MAINNET_CHAIN_ID
  | typeof TESTNET_CHAIN_ID
  | typeof BETANET_CHAIN_ID
  | typeof ANY_NETWORK_CHAIN_ID;

/** Scenario availability class. Mirrors `Network` in `src/scenarios/types.ts`. */
type ScenarioNetwork = "testnet" | "mainnet";

export interface CustomNetworkSettings {
  baseServer: string;
  port: number | string;
  token: string;
}

export interface NetworkConfig {
  id: ChainType;
  /** Display name shown in the network picker. */
  label: string;
  algod: {token: string; baseServer: string; port: number | string};
  /** Handed to Pera Connect so the wallet knows which network to sign for. */
  chainId: AlgorandChainId;
  /** Which scenario set this network gets. See `getScenarios`. */
  scenarioNetwork: ScenarioNetwork;
  /** Absent when no Pera API exists for this network. */
  peraApiBaseUrl?: string;
  /** Sample application. Absent → app scenarios are disabled. */
  appIndex?: number;
  /** Sample assets. Absent → asset scenarios are disabled. */
  assetIds?: {transfer: number; optIn: number; close: number};
}

/** AlgoKit LocalNet defaults. Also seed the Custom form, since the common
 *  custom case is a LocalNet on a non-standard port. */
export const LOCALNET_DEFAULTS: CustomNetworkSettings = {
  baseServer: "http://localhost",
  port: 4001,
  token: "a".repeat(LOCALNET_TOKEN_LENGTH)
};

const PRESETS: Record<Exclude<ChainType, ChainType.Custom>, NetworkConfig> = {
  [ChainType.MainNet]: {
    id: ChainType.MainNet,
    label: "MainNet",
    algod: {token: "", baseServer: "https://mainnet-api.algonode.cloud", port: ""},
    chainId: MAINNET_CHAIN_ID,
    scenarioNetwork: "mainnet",
    peraApiBaseUrl: "https://mainnet.api.perawallet.app/v1/",
    appIndex: 305162725,
    assetIds: {transfer: 604, optIn: 312769, close: 672}
  },
  [ChainType.TestNet]: {
    id: ChainType.TestNet,
    label: "TestNet",
    algod: {token: "", baseServer: "https://testnet-api.algonode.cloud", port: ""},
    chainId: TESTNET_CHAIN_ID,
    scenarioNetwork: "testnet",
    peraApiBaseUrl: "https://testnet.api.perawallet.app/v1/",
    appIndex: 22314999,
    assetIds: {transfer: 11711, optIn: 135270, close: 180132}
  },
  [ChainType.BetaNet]: {
    id: ChainType.BetaNet,
    label: "BetaNet",
    algod: {token: "", baseServer: "https://betanet-api.algonode.cloud", port: ""},
    chainId: BETANET_CHAIN_ID,
    scenarioNetwork: "testnet"
  },
  [ChainType.LocalNet]: {
    id: ChainType.LocalNet,
    label: "LocalNet",
    algod: {...LOCALNET_DEFAULTS},
    chainId: ANY_NETWORK_CHAIN_ID,
    scenarioNetwork: "testnet"
  }
};

/** Display order for the network picker. */
export const NETWORK_ORDER: ChainType[] = [
  ChainType.MainNet,
  ChainType.TestNet,
  ChainType.BetaNet,
  ChainType.LocalNet,
  ChainType.Custom
];

export const getCustomNetworkSettings = (): CustomNetworkSettings => {
  const raw = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.CUSTOM_NETWORK);

  if (!raw) {
    return {...LOCALNET_DEFAULTS};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomNetworkSettings>;

    if (typeof parsed.baseServer !== "string" || !parsed.baseServer) {
      return {...LOCALNET_DEFAULTS};
    }

    return {
      baseServer: parsed.baseServer,
      port: parsed.port ?? "",
      token: typeof parsed.token === "string" ? parsed.token : ""
    };
  } catch {
    return {...LOCALNET_DEFAULTS};
  }
};

export const setCustomNetworkSettings = (settings: CustomNetworkSettings): void => {
  localStorage.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.CUSTOM_NETWORK,
    JSON.stringify(settings)
  );
};

export const getNetworkConfig = (chain: ChainType): NetworkConfig => {
  if (chain === ChainType.Custom) {
    return {
      id: ChainType.Custom,
      label: "Custom",
      algod: getCustomNetworkSettings(),
      chainId: ANY_NETWORK_CHAIN_ID,
      scenarioNetwork: "testnet"
    };
  }

  return PRESETS[chain];
};
