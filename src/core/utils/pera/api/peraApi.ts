import peraApiManager from "./peraApiManager";

const PERA_API_PAGINATED_RESPONSE_LIMIT = 50;

export interface Asset {
  asset_id: number;
  name: string;
  unit_name: string;
}

const peraApi = {
  getAssets(params?: ListRequestParams, options?: {signal: AbortSignal}) {
    return peraApiManager.fetcher.run<ListRequestResponse<Asset>>(
      {method: "GET", params, signal: options?.signal},
      "assets/"
    );
  }
};

export default peraApi;
export {PERA_API_PAGINATED_RESPONSE_LIMIT};
