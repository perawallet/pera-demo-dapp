import algosdk from "algosdk";
import { apiGetTxnParams } from "../../core/utils/algod/algod";
import { testAccounts } from "../test-accounts";
import type { Scenario } from "../types";

// Protocol-specific constants. These are MainNet asset / app IDs and addresses
// for the various dApps exercised below. They live here (rather than in a
// shared module) because they are exclusively used by these mainnet scenarios
// and may go stale if a protocol redeploys its contracts.

// algofi: ALGO -> USDC swap
const ALGOFI_USDC_ASSET_ID = 31566704;
const ALGOFI_USDC_POOL_ADDRESS = "NGIHJMECRSFHIEQDHBVTLR54K7DOZWM5M6UM3A5CIOYSP6H3QTGSHHGJCQ";
const ALGOFI_USDC_POOL_APP_ID = 605929989;

// algofi: ALGO -> goETH swap
const ALGOFI_GOETH_ASSET_ID = 386195940;
const ALGOFI_GOETH_POOL_ADDRESS = "6NXX7RGJFLEI3HEQEZXDP73SMQKAPWS4N7CEQJ4IEVONUWYWJLT4NM5QQM";
const ALGOFI_GOETH_POOL_APP_ID = 607660059;

// folksfinance: deposit ALGO
const FF_DEPOSIT_ALGO_ADDRESS = "AV6PFVXWDQ7RVNQYOEXCWXCLXVJ5V57WVMVQZ2TWH4EKTB7GSWKUIAUPXQ";
const FF_DEPOSIT_ALGO_APP_ID = 686498781;

// folksfinance: ALGO-USDC pool
const FF_POOL_LP_ASSET_ID = 919950894;
const FF_POOL_USDC_ASSET_ID = 31566704;
const FF_POOL_ADDRESS = "KIW56KLIBX5UMWS5RT346TNA4HRV5H445S2LMQLRCR73SOHRVSM5TZBQ4A";
const FF_POOL_APP_ID = 919954173;

// algogems
const ALGOGEMS_NFT_ASSET_ID = 886237574;
const ALGOGEMS_NFT_SELLER = "N4EJ2ZFGWCEL4PVTCJSLD7RC4WVIUNO57V7LW2FQY7DFOP4EEN4XYC5UEM";
const ALGOGEMS_PAYOUT_PRIMARY = "RJASLRMECMQL66PH2KLMFSCYMOOBOK7KRX3XMAWDKDB2PQ5J3U5FMPAJNE";
const ALGOGEMS_PAYOUT_SECONDARY = "VWZBFLBUN6O5A5W6IWHMDUVP5NH2LPV4ZYFMAHP4FQBBYP627MP6WPOEG4";

// algoxnft
const ALGOXNFT_ASSET_ID = 865021507;
const ALGOXNFT_SELLER = "CATN6JYGMBZF4OAQBXZTGALLB3X3XUUU6CQAKXUPNKVOC32VNTRWK25HD4";
const ALGOXNFT_PAYOUT_1 = "BSKX6GSPTSY2KKXBO5L367OBY5SJT6GD25FV3RY25VLOGCMORQ6COPCOXY";
const ALGOXNFT_PAYOUT_2 = "ANGEL3CMT7TEXSBJR3DCTJTZCQFOF6FJB6PDKU4IOAMTNPXGR7XUYKOU5Y";
const ALGOXNFT_PAYOUT_3 = "XNFT36FUCFRR6CK675FW4BEBCCCOJ4HOSMGCN6J2W6ZMB34KM2ENTNQCP4";

// zone: asset transfer
const ZONE_ASSET_ID = 444035862;

export const mainnetDappScenarios: Scenario[] = [
  {
    id: "mainnet-algofi-swap-algo-usdc",
    title: "Swap Algo to USDC (algofi)",
    description:
      "MainNet algofi ALGO->USDC swap flow: 3 non-atomic groups — opt-in to USDC, 5 ALGO payment to the pool address, NoOp app call (fee doubled) against the USDC pool.",
    expected:
      "MainNet. Wallet shows 3 sequential popups (opt-in, payment, app call). User signs all three. If algofi's USDC pool contracts are still live, algod accepts and the user receives USDC; otherwise the app call fails at submit because the pool has rotted.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              assetIndex: ALGOFI_USDC_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOFI_USDC_POOL_ADDRESS,
              amount: 5000000,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: ALGOFI_USDC_POOL_APP_ID,
              appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
              suggestedParams
            })
          }
        ]
      ];

      groups[2][0].txn.fee = 2000n;

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-algofi-swap-algo-goeth",
    title: "Swap Algo to GoETH (algofi)",
    description:
      "MainNet algofi ALGO->goETH swap flow: 3 non-atomic groups — opt-in to goETH, 3 ALGO payment to the pool address, NoOp app call (fee doubled) against the goETH pool.",
    expected:
      "MainNet. Wallet shows 3 sequential popups (opt-in, payment, app call). User signs all three. If algofi's goETH pool contracts are still live, algod accepts and the user receives goETH; otherwise the app call fails at submit because the pool has rotted.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              assetIndex: ALGOFI_GOETH_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOFI_GOETH_POOL_ADDRESS,
              amount: 3000000,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: ALGOFI_GOETH_POOL_APP_ID,
              appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
              suggestedParams
            })
          }
        ]
      ];

      groups[2][0].txn.fee = 2000n;

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-folksfinance-deposit-algo",
    title: "Deposit Algo (folksfinance)",
    description:
      "MainNet folksfinance ALGO deposit flow: 2 non-atomic groups — 2 ALGO payment to the deposit address, then a NoOp app call (fee tripled) against the deposit app.",
    expected:
      "MainNet. Wallet shows 2 sequential popups (payment, app call). User signs both. If folksfinance's deposit app is still live, algod accepts and the user's ALGO is deposited; otherwise the app call fails at submit because the contracts have rotted.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: FF_DEPOSIT_ALGO_ADDRESS,
              amount: 2000000,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_DEPOSIT_ALGO_APP_ID,
              appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
              suggestedParams
            })
          }
        ]
      ];

      groups[1][0].txn.fee = 3000n;

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-folksfinance-pool-algo-usdc",
    title: "Pool ALGO-USDC (folksfinance)",
    description:
      "MainNet folksfinance ALGO/USDC pool flow: 10 non-atomic groups — LP opt-in, USDC and ALGO deposits to the pool, and a chain of pool_step_1..pool_step_7 NoOp app calls (with a 29000 µAlgo fee on step 1).",
    expected:
      "MainNet. Wallet shows 10 sequential popups. User signs all of them. If folksfinance's pool app is still live, algod accepts and the user gets LP tokens; otherwise one of the pool-step app calls fails at submit because the contracts have rotted.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              assetIndex: FF_POOL_LP_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: FF_POOL_ADDRESS,
              amount: 1160825,
              assetIndex: FF_POOL_USDC_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: FF_POOL_ADDRESS,
              amount: 3977452,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_1"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_2"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_3"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_4"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_5"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_6"))],
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeApplicationNoOpTxnFromObject({
              sender: address,
              appIndex: FF_POOL_APP_ID,
              appArgs: [new Uint8Array(Buffer.from("pool_step_7"))],
              suggestedParams
            })
          }
        ]
      ];

      groups[3][0].txn.fee = 29000n;

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-algogems-auth",
    title: "Auth (algogems)",
    description:
      "MainNet algogems auth: a single zero-amount self-payment carrying an `challenge/1449301/gems` note (the protocol's sign-in challenge).",
    expected:
      "MainNet. Wallet shows one popup with a 0-Algo self-payment whose note is the auth challenge. User signs. The signed (but typically un-submitted) txn is the auth proof returned to the dApp.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              note: new Uint8Array(Buffer.from("challenge/1449301/gems")),
              suggestedParams
            })
          }
        ]
      ];

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-algogems-buy-nft",
    title: "Buy NFT (algogems)",
    description:
      "MainNet algogems NFT purchase flow: 4 non-atomic groups — opt-in to the NFT asset, receive the NFT from the seller (external sender, signers default), 3.6 ALGO primary payout, 0.4 ALGO secondary payout.",
    expected:
      "MainNet. Wallet shows 4 sequential popups. User signs the opt-in and both payouts; the seller's NFT-send slot is external and not signed here. If the seller co-signs and the protocol is still live, all groups land and the NFT lands in the user's wallet.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              assetIndex: ALGOGEMS_NFT_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: ALGOGEMS_NFT_SELLER,
              receiver: address,
              amount: 1,
              assetIndex: ALGOGEMS_NFT_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOGEMS_PAYOUT_PRIMARY,
              amount: 3600000,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOGEMS_PAYOUT_SECONDARY,
              amount: 400000,
              suggestedParams
            })
          }
        ]
      ];

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-algoxnft-buy-nft",
    title: "Buy NFT (algoxnft)",
    description:
      "MainNet algoxnft NFT purchase flow: 6 non-atomic groups — opt-in to the NFT asset, receive the NFT from the seller (external sender), and four ALGO payments splitting fees/royalties across the seller and two payout addresses.",
    expected:
      "MainNet. Wallet shows 6 sequential popups. User signs the opt-in and the four ALGO payouts; the seller's NFT-send slot is external. If the seller co-signs and the protocol is still live, all groups land and the NFT lands in the user's wallet.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const groups: Array<Array<{ txn: algosdk.Transaction }>> = [
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: address,
              amount: 0,
              assetIndex: ALGOXNFT_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: ALGOXNFT_SELLER,
              receiver: address,
              amount: 1,
              assetIndex: ALGOXNFT_ASSET_ID,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOXNFT_PAYOUT_1,
              amount: 196900,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOXNFT_PAYOUT_2,
              amount: 18803950,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOXNFT_PAYOUT_3,
              amount: 689150,
              suggestedParams
            })
          }
        ],
        [
          {
            txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              sender: address,
              receiver: ALGOXNFT_SELLER,
              amount: 1000,
              suggestedParams
            })
          }
        ]
      ];

      // Assign Group ID
      groups.forEach((txns) => algosdk.assignGroupID(txns.map((toSign) => toSign.txn)));

      return {
        transaction: groups
      };
    }
  },
  {
    id: "mainnet-zone-transfer",
    title: "Zone Transfer",
    description:
      "MainNet single asset transfer of 1,000,000 base units of the Zone ASA (asset id 444035862) to a hardcoded test account.",
    expected:
      "MainNet. Wallet shows a single asset transfer txn. User signs. Algod accepts if the sender is opted-in to the Zone ASA and holds enough balance; otherwise rejects with an asset-balance / not-opted-in error.",
    category: "mainnet-dapp",
    modifiers: [],
    networks: ["mainnet"],
    async build(chain, address) {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: testAccounts[0].addr,
        amount: 1000000,
        assetIndex: ZONE_ASSET_ID,
        note: new Uint8Array(Buffer.from("example note value")),
        suggestedParams
      });

      const txnsToSign = [{ txn }];

      return {
        transaction: [txnsToSign]
      };
    }
  }
];
