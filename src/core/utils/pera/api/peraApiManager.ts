import Fetcher from "../../../network/fetcher/Fetcher";
import {FetcherConfig} from "../../../network/fetcher/fetcherTypes";
import {ChainType} from "../../algod/algod";

const PERA_API_URLS = {
  mainnet: "https://mainnet.api.perawallet.app/v1/",
  testnet: "https://testnet.api.perawallet.app/v1/"
};

const PERA_API_DEFAULT_OPTIONS: Omit<FetcherConfig, "baseUrl"> = {
  initOptions: {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  },
  bodyParser: JSON.stringify
};

function getPeraApiBaseURLForNetwork(network: ChainType) {
  return network === ChainType.MainNet ? PERA_API_URLS.mainnet : PERA_API_URLS.testnet;
}

class PeraApiManager {
  fetcher: Fetcher;

  constructor(network: ChainType) {
    this.fetcher = new Fetcher({
      baseUrl: getPeraApiBaseURLForNetwork(network),
      ...PERA_API_DEFAULT_OPTIONS
    });
  }

  updateFetcher(network: ChainType) {
    this.fetcher = new Fetcher({
      baseUrl: getPeraApiBaseURLForNetwork(network),
      ...PERA_API_DEFAULT_OPTIONS
    });
  }
}

const peraApiManager = new PeraApiManager(ChainType.TestNet);

export default peraApiManager;
