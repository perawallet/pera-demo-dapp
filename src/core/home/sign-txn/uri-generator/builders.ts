export type UriNetwork = "mainnet" | "testnet" | "betanet";

const netPrefix = (network?: UriNetwork): string => {
  return network ? `net:${network}/` : "";
};

const queryString = (params: Record<string, string | undefined>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&")
  );
};

export interface AlgoTransferUriArgs {
  address: string;
  amount?: string;
  note?: string;
  xnote?: string;
  label?: string;
  network?: UriNetwork;
}

export const buildAlgoTransferUri = (args: AlgoTransferUriArgs): string => {
  return `algorand://${netPrefix(args.network)}${args.address}${queryString({
    amount: args.amount,
    note: args.note,
    xnote: args.xnote,
    label: args.label
  })}`;
};

export interface AssetTransferUriArgs {
  address: string;
  assetId: string;
  amount: string;
  note?: string;
  xnote?: string;
  label?: string;
  network?: UriNetwork;
}

export const buildAssetTransferUri = (args: AssetTransferUriArgs): string => {
  return `algorand://${netPrefix(args.network)}${args.address}${queryString({
    asset: args.assetId,
    amount: args.amount,
    note: args.note,
    xnote: args.xnote,
    label: args.label
  })}`;
};

export interface AssetOptInUriArgs {
  address: string;
  assetId: string;
  network?: UriNetwork;
}

export const buildAssetOptInUri = (args: AssetOptInUriArgs): string => {
  return `algorand://${netPrefix(args.network)}${args.address}${queryString({
    asset: args.assetId,
    amount: "0"
  })}`;
};

export interface KeyregUriArgs {
  address: string;
  votekey?: string;
  selkey?: string;
  sprfkey?: string;
  votefst?: string;
  votelst?: string;
  votekd?: string;
  fee?: string;
  note?: string;
  xnote?: string;
  network?: UriNetwork;
}

export const buildKeyregUri = (args: KeyregUriArgs): string => {
  return `algorand://${netPrefix(args.network)}${args.address}${queryString({
    type: "keyreg",
    votekey: args.votekey,
    selkey: args.selkey,
    sprfkey: args.sprfkey,
    votefst: args.votefst,
    votelst: args.votelst,
    votekd: args.votekd,
    fee: args.fee,
    note: args.note,
    xnote: args.xnote
  })}`;
};

export interface AssetQueryUriArgs {
  assetId: string;
  network?: UriNetwork;
}

export const buildAssetQueryUri = (args: AssetQueryUriArgs): string => {
  return `algorand://${netPrefix(args.network)}asset/${args.assetId}`;
};

export interface AppQueryUriArgs {
  appId: string;
  network?: UriNetwork;
}

export const buildAppQueryUri = (args: AppQueryUriArgs): string => {
  return `algorand://${netPrefix(args.network)}app/${args.appId}`;
};
