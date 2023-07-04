import Fetcher from "../../../network/fetcher/Fetcher";
import {FetcherConfig} from "../../../network/fetcher/fetcherTypes";
import {ChainType} from "../../algod/algod";

const PERA_API_URLS = {
  mainnet: "https://mainnet.staging.api.perawallet.app/v1/",
  testnet: "https://testnet.staging.api.perawallet.app/v1/"
};

const PERA_API_DEFAULT_OPTIONS: Omit<FetcherConfig, "baseUrl"> = {
  initOptions: {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": "pera-web-staging-U-jZ3m-LR6-ed-7fLTmekDl0-95N5jUX"
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
