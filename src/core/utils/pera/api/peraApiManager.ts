import Fetcher from "../../../network/fetcher/Fetcher";
import {FetcherConfig} from "../../../network/fetcher/fetcherTypes";
import {ChainType} from "../../algod/algod";
import {getNetworkConfig} from "../../algod/networks";

const PERA_API_DEFAULT_OPTIONS: Omit<FetcherConfig, "baseUrl"> = {
  initOptions: {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  },
  bodyParser: JSON.stringify
};

class PeraApiManager {
  /** Null on networks with no Pera API (BetaNet, LocalNet, Custom). */
  fetcher: Fetcher | null = null;

  constructor(network: ChainType) {
    this.updateFetcher(network);
  }

  get isAvailable(): boolean {
    return this.fetcher !== null;
  }

  updateFetcher(network: ChainType) {
    const {peraApiBaseUrl} = getNetworkConfig(network);

    this.fetcher = peraApiBaseUrl
      ? new Fetcher({baseUrl: peraApiBaseUrl, ...PERA_API_DEFAULT_OPTIONS})
      : null;
  }
}

const peraApiManager = new PeraApiManager(ChainType.TestNet);

export default peraApiManager;
