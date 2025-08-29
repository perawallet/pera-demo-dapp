
export interface ParameterDefinition {
    id: string
    required: boolean
    token: string
    label: string
}

export interface DeeplinkDefinition {
    key: string
    name: string
    params: ParameterDefinition[]
    templates: {
        new: string
        old: string | null
        universal: string
    }
}


// Helper to make param entries concise
const P = (id: string, required: boolean, token: string, label?: string): ParameterDefinition => 
    ({ id, required: !!required, token, label: label || id});

// ---------- JSON config (expanded from your CSV) ----------
// Each item defines the UI and the relative template per link type.
// If a template string already includes a URI scheme (e.g., "http://", "algo:", "perawallet://"),
// the generator will NOT prefix it with the BASE for the selected type.
export const DEEP_LINKS: DeeplinkDefinition[] = [
  {
    key: "add-contact",
    name: "Add Contact",
    params: [P("address", true, "$ADDRESS"), P("label", false, "$LABEL")],
    templates: {
      new: "add-contact/?address=$ADDRESS&label=$LABEL",
      old: "$ADDRESS",
      universal: "add-contact/?address=$ADDRESS&label=$LABEL",
    },
  },
  {
    key: "edit-contact",
    name: "Edit Contact",
    params: [P("address", true, "$ADDRESS"), P("label", false, "$LABEL")],
    templates: {
      new: "edit-contact/?address=$ADDRESS&label=$LABEL",
      old: "$ADDRESS",
      universal: "edit-contact/?address=$ADDRESS&label=$LABEL",
    },
  },
  {
    key: "add-watch-account",
    name: "Add Watch Account",
    params: [P("address", true, "$ADDRESS"), P("label", false, "$LABEL")],
    templates: {
      new: "register-watch-account/?address=$ADDRESS&label=$LABEL",
      old: "$ADDRESS",
      universal: "register-watch-account/?address=$ADDRESS&label=$LABEL",
    },
  },
  {
    key: "receiver-account-selection",
    name: "Receiver Account Selection",
    params: [P("address", true, "$ADDRESS"), P("label", false, "$LABEL")],
    templates: {
      new: "receiver-account-selection/?address=$ADDRESS",
      old: "$ADDRESS",
      universal: "receiver-account-selection/?address=$ADDRESS",
    },
  },
  {
    key: "address-actions",
    name: "Adress Actions",
    params: [P("address", true, "$ADDRESS"), P("label", false, "$LABEL")],
    templates: {
      new: "address-actions/?address=$ADDRESS&label=$LABEL",
      old: "$ADDRESS",
      universal: "address-actions/?address=$ADDRESS&label=$LABEL",
    },
  },
  {
    key: "algo-transfer",
    name: "ALGO Transfer",
    params: [
      P("assetId", true, "$ASSET_ID"),
      P("receiverAccountAddress", true, "$ADDRESS", "receiverAccountAddress"),
      P("amount", true, "$AMOUNT"),
      P("note", false, "$NOTE"),
      P("xnote", false, "$XNOTE"),
      P("label", false, "$LABEL"),
    ],
    templates: {
      new: "asset-transfer/?assetId=0&receiverAccountAddress=$ADDRESS&amount=$AMOUNT&note=$NOTE&xnote=$XNOTE&label=$LABEL",
      old: "$ADDRESS?amount=$AMOUNT&note=$NOTE",
      universal: "asset-transfer/?assetId=0&receiverAccountAddress=$ADDRESS&amount=$AMOUNT&note=$NOTE&xnote=$XNOTE&label=$LABEL",
    },
  },
  {
    key: "asset-transfer",
    name: "Asset Transfer",
    params: [
      P("assetId", true, "$ASSET_ID"),
      P("receiverAccountAddress", true, "$ADDRESS", "receiverAccountAddress"),
      P("amount", true, "$AMOUNT"),
      P("note", false, "$NOTE"),
      P("xnote", false, "$XNOTE"),
      P("label", false, "$LABEL"),
    ],
    templates: {
      new: "asset-transfer/?assetId=$ASSET_ID&receiverAccountAddress=$ADDRESS&amount=$AMOUNT&note=$NOTE&xnote=$XNOTE&label=$LABEL",
      old: "$ADDRESS?amount=$AMOUNT&asset=$ASSET_ID&xnote=$XNOTE",
      universal: "asset-transfer/?assetId=$ASSET_ID&receiverAccountAddress=$ADDRESS&amount=$AMOUNT&note=$NOTE&xnote=$XNOTE&label=$LABEL",
    },
  },
  {
    key: "keyreg",
    name: "Keyreg",
    params: [
      P("senderAddress", true, "$ADDRESS"),
      P("type", true, "$TYPE"),
      P("voteKey", false, "$VOTE_KEY"),
      P("selkey", false, "$SELKEY"),
      P("sprfkey", false, "$SPFRKEY"),
      P("votefst", false, "$VOTEFST"),
      P("votelst", false, "$VOTELST"),
      P("votekd", false, "$VOTEKD"),
      P("fee", false, "$FEE"),
      P("note", false, "$NOTE"),
      P("xnote", false, "$XNOTE"),
    ],
    templates: {
      new: "keyreg/?senderAddress=$ADDRESS&type=$TYPE&voteKey=$VOTE_KEY&selkey=$SELKEY&sprfkey=$SPFRKEY&votefst=$VOTEFST&votelst=$VOTELST&votekd=$VOTEKD&fee=$FEE&note=$NOTE&xnote=$XNOTE",
      old: "$ADDRESS?type=keyreg&selkey=$SELKEY&sprfkey=$SPRFKEY&votefst=$VOTEFST&votekd=$VOTEKD&votekey=$VOTEKEY&votelst=$VOTELST&fee=$FEE&note=$NOTE",
      universal: "keyreg/?senderAddress=$ADDRESS&type=$TYPE&voteKey=$VOTE_KEY&selkey=$SELKEY&sprfkey=$SPFRKEY&votefst=$VOTEFST&votelst=$VOTELST&votekd=$VOTEKD&fee=$FEE&note=$NOTE&xnote=$XNOTE",
    },
  },
  {
    key: "recover-address",
    name: "Recover Address",
    params: [P("mnemonic", true, "$MNEMONIC")],
    templates: {
      new: "recover-address/?mnemonic=$MNEMONIC",
      old: null,
      universal: "recover-address/?mnemonic=$MNEMONIC",
    },
  },
  {
    key: "web-import",
    name: "Web Import",
    params: [P("backupId", true, "$BACKUP_ID"), P("encryptionKey", true, "$ENCRYPTION_KEY")],
    templates: {
      new: "web-import/?backupId=$BACKUP_ID&$encryptionKey=$ENCRYPTION_KEY",
      old: null,
      universal: "web-import/?backupId=$BACKUP_ID&$encryptionKey=$ENCRYPTION_KEY",
    },
  },
  {
    key: "wallet-connect",
    name: "Wallet Connect",
    params: [P("uri", true, "$URI")],
    templates: {
      new: "wallet-connect/?uri=$URI",
      old: "wc:$ID@1?bridge=$BRIDGE&key=$KEY",
      universal: "wallet-connect/?uri=$URI",
    },
  },
  {
    key: "asset-opt-in",
    name: "Asset Opt-in",
    params: [P("address", true, "$ADDRESS"), P("assetId", true, "$ASSET_ID")],
    templates: {
      new: "asset-opt-in/?address=$ADDRESS&assetId=$ASSET_ID",
      old: "?amount=0&asset=$ASSET_ID",
      universal: "asset-opt-in/?address=$ADDRESS&assetId=$ASSET_ID",
    },
  },
  {
    key: "asset-opt-in-with-type",
    name: "Asset Opt-in (with type)",
    params: [P("address", true, "$ADDRESS"), P("assetId", true, "$ASSET_ID")],
    templates: {
      new: "asset-opt-in/?address=$ADDRESS&type=asset/opt-in&assetId=$ASSET_ID",
      old: "?amount=0&asset=$ASSET_ID",
      universal: "asset-opt-in/?address=$ADDRESS&assetId=$ASSET_ID",
    },
  },
  {
    key: "asset-inbox",
    name: "Asset Inbox",
    params: [P("address", true, "$ADDRESS"), P("notificationGroupType", false, "$NOTIFICATION_GROUP_TYPE")],
    templates: {
      new: "asset-inbox/?address=$ADDRESS",
      old: "$ADDRESS&type=asset-inbox",
      universal: "asset-inbox/?address=$ADDRESS",
    },
  },
  {
    key: "asset-transactions",
    name: "Asset Transactions",
    params: [
      P("address", true, "$ADDRESS"),
      P("assetId", true, "$ASSET_ID"),
    ],
    templates: {
      new: "asset-detail/?address=$ADDRESS&assetId=$ASSET_ID",
      old: "$ADDRESS&type=asset/transactions&asset=$ASSET_ID",
      universal: "asset-detail/?address=$ADDRESS&assetId=$ASSET_ID",
    },
  },
  {
    key: "discover-browser",
    name: "Discover Browser",
    params: [P("url", true, "$URL")],
    templates: {
      new: "discover-browser/?url=$URL",
      old: "?url=$URL",
      universal: "discover-browser/?url=$URL",
    },
  },
  {
    key: "discover",
    name: "Discover",
    params: [P("path", true, "$PATH")],
    templates: {
      new: "discover-path/?path=$PATH",
      old: "discover?path=$PATH",
      universal: "discover-path/?path=$PATH",
    },
  },
  {
    key: "cards",
    name: "Cards",
    params: [P("path", true, "$PATH")],
    templates: {
      new: "cards-path/?path=$PATH",
      old: "cards?path=$PATH",
      universal: "cards-path/?path=$PATH",
    },
  },
  {
    key: "staking",
    name: "Staking",
    params: [P("path", true, "$PATH")],
    templates: {
      new: "staking-path/?path=$PATH",
      old: "staking?path=$PATH",
      universal: "staking-path/?path=$PATH",
    },
  },
  {
    key: "undefined",
    name: "Undefined (Error)",
    params: [],
    templates: { new: "", old: null, universal: "" },
  },
  {
    key: "coinbase-asset-transfer",
    name: "Coinbase Asset Transfer",
    params: [P("address", true, "$ADDRESS")],
    // CSV gives absolute algo: links for both columns; leaving as absolute template so we don't prefix BASE
    templates: {
      new: "algo:31566704/transfer?address=KG2HXWIOQSBOBGJEXSIBNEVNTRD4G4EFIJGRKBG2ZOT7NQ",
      old: "algo:31566704/transfer?address=KG2HXWIOQSBOBGJEXSIBNEVNTRD4G4EFIJGRKBG2ZOT7NQ",
      universal: "",
    },
  },
  {
    key: "swap",
    name: "Swap",
    params: [
      P("address", false, "$ADDRESS"),
      P("assetId", false, "$ASSET_ID"),
      P("assetInId", false, "$ASSET_IN_ID"),
      P("assetOutId", false, "$ASSET_OUT_ID"),
    ],
    templates: {
      new: "swap/?address=$ADDRESS&assetInId=$ASSET_IN_ID&assetOutId=$ASSET_OUT_ID",
      old: null,
      universal: "swap/?address=$ADDRESS&assetInId=$ASSET_IN_ID&assetOutId=$ASSET_OUT_ID",
    },
  },
  {
    key: "buy",
    name: "Buy",
    params: [P("address", false, "$ADDRESS")],
    templates: {
      new: "buy/?address=$ADDRESS",
      old: null,
      universal: "buy/?address=$ADDRESS",
    },
  },
  {
    key: "sell",
    name: "Sell",
    params: [P("address", false, "$ADDRESS")],
    templates: {
      new: "sell/?address=$ADDRESS",
      old: null,
      universal: "sell/?address=$ADDRESS",
    },
  },
  {
    key: "account-detail",
    name: "Account Detail",
    params: [P("address", true, "$ADDRESS")],
    templates: {
      new: "account-detail/?address=$ADDRESS",
      old: null,
      universal: "account-detail/?address=$ADDRESS",
    },
  },
  {
    key: "open-website",
    name: "Open Website",
    params: [P("url", true, "$URL")],
    templates: {
      new: "internal-browser/?url=$URL",
      old: null,
      universal: "internal-browser/?url=$URL",
    },
  },
];
