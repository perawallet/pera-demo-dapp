import "./_home.scss";

import {Button, Select, Switch, useToaster} from "@hipo/react-ui-toolkit";
import {useCallback, useEffect, useState} from "react";
import type {SignerTransaction} from "@perawallet/connect";
import {PeraOnramp} from "@perawallet/onramp";

import AccountBalance from "./account-balance/AccountBalance";
import SignTxn from "./sign-txn/SignTxn";
import PeraToast from "../component/toast/PeraToast";
import {ChainType, clientForChain} from "../utils/algod/algod";
import useGetAccountDetailRequest from "../hooks/useGetAccountDetailRequest/useGetAccountDetailRequest";
import {createAssetOptInTxn} from "./sign-txn/util/signTxnUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../utils/storage/pera-wallet/peraWalletTypes";
import peraApiManager from "../utils/pera/api/peraApiManager";
import DeeplinkGenerator from "../deeplink/DeeplinkGenerator";
import peraWallet, {PeraWalletManager} from "../utils/pera-wallet/PeraWalletManager";

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
  const {accountInformation, refetchAccountDetail} = useGetAccountDetailRequest({
    chain: chainType,
    accountAddress
  });
  const [isConnectCompactMode, setConnectCompactMode] = useState(peraWallet.compactMode || false);
  const [showDeeplink, setShowDeeplink] = useState(false);

  const toggleDeeplink = () => {
    setShowDeeplink(!showDeeplink)
  }

  const handleSetLog = useCallback((log: string) => {
    displayToast({
      timeout: 10000,
      render() {
        return <PeraToast message={log} />;
      }
    });
  }, [displayToast]);


  useEffect(() => {
    peraWallet.updateConfig({
      compactMode: isConnectCompactMode,
      chainId: PeraWalletManager.getChainId(chainType)
    });
  }, [isConnectCompactMode, chainType]);

  useEffect(() => {
    peraWallet
      .reconnectSessionAndSetupEventHandlers({
        onDisconnect: async () => {
          setAccountAddress(null);
        }
      })
      .then((accounts) => {
        if (accounts && accounts[0]) {
          setAccountAddress(accounts[0]);
          refetchAccountDetail();
          handleSetLog("Connected to Pera Wallet");
        }
      })
      .catch((e) => console.error(e));
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

      {accountInformation && (
        <AccountBalance
          accountInformation={accountInformation}
          chain={chainType}
        />
      )}

      {peraWallet.isConnected && (
        <p className={"app__connected-wc-server"}>{`Connected WC server: ${peraWallet.connector?.bridge}`}</p>
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
    const newCompactMode = !isConnectCompactMode;
    setConnectCompactMode(newCompactMode);

    localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE, newCompactMode ? "true" : "false");
    
    peraWallet.updateConfig({
      compactMode: newCompactMode
    });
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
      const newAccounts = await peraWallet.connectAndSetupEventHandlers({
        onDisconnect: async () => {
          setAccountAddress(null);
        }
      });

      handleSetLog("Connected to Pera Wallet");

      setAccountAddress(newAccounts[0]);
    } catch (e) {
      console.error(e);
      handleSetLog(`${e}`);
    }
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();
    setAccountAddress(null);
  }

  function handleSelectChainType(
    option: {id: "mainnet" | "testnet"; title: string} | null
  ) {
    if (option?.id === "testnet") {
      const newChainType = ChainType.TestNet;
      setChainType(newChainType);
      setChainDropdownSelectedOption({
        id: "testnet",
        title: "TestNet"
      });
      peraApiManager.updateFetcher(newChainType);
      peraWallet.updateConfig({
        chainId: PeraWalletManager.getChainId(newChainType)
      });
    } else if (option?.id === "mainnet") {
      const newChainType = ChainType.MainNet;
      setChainType(newChainType);
      setChainDropdownSelectedOption({
        id: "mainnet",
        title: "MainNet"
      });
      peraApiManager.updateFetcher(newChainType);
      peraWallet.updateConfig({
        chainId: PeraWalletManager.getChainId(newChainType)
      });
    }
  }
}

export default Home;
