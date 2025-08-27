import "./_home.scss";

import {Button, Select, Switch, useToaster} from "@hipo/react-ui-toolkit";
import {useEffect, useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect";
import {PeraOnramp} from "@perawallet/onramp";
import {SignerTransaction} from "@perawallet/connect/dist/util/model/peraWalletModels";

import AccountBalance from "./account-balance/AccountBalance";
import SignTxn from "./sign-txn/SignTxn";
import PeraToast from "../component/toast/PeraToast";
import {ChainType, clientForChain} from "../utils/algod/algod";
import useGetAccountDetailRequest from "../hooks/useGetAccountDetailRequest/useGetAccountDetailRequest";
import {createAssetOptInTxn} from "./sign-txn/util/signTxnUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../utils/storage/pera-wallet/peraWalletTypes";
import peraApiManager from "../utils/pera/api/peraApiManager";
import DeeplinkGenerator from "../deeplink/DeeplinkGenerator";

const isCompactMode = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE);
let peraWallet = new PeraWalletConnect({compactMode: isCompactMode === "true"});
const peraOnRamp = new PeraOnramp({
  optInEnabled: true
});

const chainOptions = [
  {
    id: "testnet",
    title: "TestNet"
  },
  {
    id: "mainnet",
    title: "MainNet"
  }
];

function Home() {
  const [chainType, setChainType] = useState<ChainType>(ChainType.TestNet);
  const [chainDropdownSelectedOption, setChainDropdownSelectedOption] =
    useState<{id: "testnet" | "mainnet", title: string}>({
      id: "testnet",
      title: "TestNet"
    });
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  const {display: displayToast} = useToaster();
  const {accountInformationState, refetchAccountDetail} = useGetAccountDetailRequest({
    chain: chainType,
    accountAddress: accountAddress || ""
  });
  const [isConnectCompactMode, setConnectCompactMode] = useState(peraWallet.compactMode || false);
  const [showDeeplink, setShowDeeplink] = useState(false);

  const toggleDeeplink = () => {
    setShowDeeplink(!showDeeplink)
  }

  useEffect(() => {
    peraWallet = new PeraWalletConnect({compactMode: isConnectCompactMode});
  }, [isConnectCompactMode]);

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts && accounts[0]) {
          setAccountAddress(accounts[0]);

          handleSetLog("Connected to Pera Wallet");
        }

        peraWallet.connector?.on("disconnect", () => {
          setAccountAddress(null);
        });
      })
      .catch((e) => console.log(e));
  }, []);

  return (
    <div className={`app ${isConnectedToPeraWallet ? "app--connected" : ""}`}>
      <div className={"app__header"}>

        <div className={"app__deeplink"}>
          <Button onClick={toggleDeeplink}>Deeplink Generator</Button>
        </div>
        <Select role={"menu"} options={chainOptions} value={chainDropdownSelectedOption} onSelect={handleSelectChainType}>
          <Select.Trigger customClassName={"button app__button--connect"}>
            {chainDropdownSelectedOption?.title}
          </Select.Trigger>

          <Select.Content>
            <ul>
              {chainOptions.map((option) => (
                <Select.Item option={option} as={"li"}>
                  {option.title}
                </Select.Item>
              ))}
            </ul>
          </Select.Content>
        </Select>
      </div>

      {chainType === ChainType.MainNet && (
        <div className={"app__chain-message"}>
          {
            "You are using MainNet right now. Please be careful when you trying to send transactions."
          }
        </div>
      )}

      <h1 className={"app__title"}>
        {"Pera Wallet"} <small>{"Example dApp"}</small>
      </h1>

      {!isConnectedToPeraWallet && (
        <div className={"app__compact-mode-switch"}>
          <p>{"Pera Connect Compact Mode: "}</p>

          <Switch onToggle={handleCompactModeSwitch} isToggledOn={isConnectCompactMode} />
        </div>
      )}

      {accountInformationState.data && (
        <AccountBalance
          accountInformation={accountInformationState.data}
          chain={chainType}
        />
      )}

      {isConnectedToPeraWallet && chainType === "mainnet" && (
        <Button customClassName={"app__button--connect"} onClick={handleAddFunds}>
          {"Add funds"}
        </Button>
      )}

      <Button
        customClassName={"app__button--connect"}
        onClick={
          isConnectedToPeraWallet ? handleDisconnectWalletClick : handleConnectWalletClick
        }>
        {isConnectedToPeraWallet ? "Disconnect" : "Connect to Pera Wallet"}
      </Button>

      {isConnectedToPeraWallet && (
        <SignTxn
          accountAddress={accountAddress}
          peraWallet={peraWallet}
          handleSetLog={handleSetLog}
          chain={chainType}
          refecthAccountDetail={refetchAccountDetail}
        />
      )}

      {showDeeplink && 
        (<div className="app__deeplink_modal">
          <div className="app__deeplink_header">
            <Button onClick={toggleDeeplink}>Close</Button>
          </div>
          <DeeplinkGenerator />
        </div>
      )}
    </div>
  );

  function handleCompactModeSwitch() {
    setConnectCompactMode(!isConnectCompactMode);

    localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE, localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE) === "true" ? "false" : "true");
  }

  function handleAddFunds() {
    if (accountAddress) {
      addFunds();

      peraOnRamp.on({
        OPT_IN_REQUEST: async ({accountAddress: addr, assetID}) => {
          try {
            const {transaction: txnsToSign} = await createAssetOptInTxn(
              chainType,
              addr,
              Number(assetID)
            );

            const transactions: SignerTransaction[] = txnsToSign.reduce(
              (acc, val) => acc.concat(val),
              []
            );

            const signedTxn = await peraWallet.signTransaction([transactions]);

            await clientForChain(chainType).sendRawTransaction(signedTxn).do();

            peraOnRamp.close();

            addFunds();
          } catch (error) {
            handleSetLog(`${error}`);
          }
        },
        ADD_FUNDS_COMPLETED: () => {
          handleSetLog("Add funds completed");
        },
        ADD_FUNDS_FAILED: () => {
          handleSetLog("Add funds failed");
        }
      });
    }
  }

  function addFunds() {
    if (accountAddress) {
      peraOnRamp
        .addFunds({
          accountAddress
        })
        .then(() => {
          handleSetLog("Funds added");
        })
        .catch((e) => {
          handleSetLog(`${e}`);
        });
    }
  }

  async function handleConnectWalletClick() {
    try {
      const newAccounts = await peraWallet.connect();

      handleSetLog("Connected to Pera Wallet");

      setAccountAddress(newAccounts[0]);
    } catch (e) {
      console.log(e);
      handleSetLog(`${e}`);
    }
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();

    setAccountAddress(null);
  }

  function handleSetLog(log: string) {
    displayToast({
      timeout: 10000,
      render() {
        return <PeraToast message={log} />;
      }
    });
  }

  function handleSelectChainType(
    option: {id: "mainnet" | "testnet"; title: string} | null
  ) {
    if (option?.id === "testnet") {
      setChainType(ChainType.TestNet);
      setChainDropdownSelectedOption({
        id: "testnet",
        title: "TestNet"
      });
      peraApiManager.updateFetcher(ChainType.TestNet);
    } else if (option?.id === "mainnet") {
      setChainType(ChainType.MainNet);
      setChainDropdownSelectedOption({
        id: "mainnet",
        title: "MainNet"
      });
      peraApiManager.updateFetcher(ChainType.MainNet);
    }
  }
}

export default Home;
