import "./_home.scss";

import {Button, List, Select, Switch, useToaster} from "@hipo/react-ui-toolkit";
import {useEffect, useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect-beta";
import {PeraOnramp} from "@perawallet/onramp";
import {SignerTransaction} from "@perawallet/connect-beta/dist/util/model/peraWalletModels";

import AccountBalance from "./account-balance/AccountBalance";
import SignTxn from "./sign-txn/SignTxn";
import PeraToast from "../component/toast/PeraToast";
import {ChainType, clientForChain} from "../utils/algod/algod";
import useGetAccountDetailRequest from "../hooks/useGetAccountDetailRequest/useGetAccountDetailRequest";
import {createAssetOptInTxn} from "./sign-txn/util/signTxnUtils";
import peraApiManager from "../utils/pera/api/peraApiManager";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../utils/storage/pera-wallet/peraWalletTypes";

const PROJECT_ID = "cd16838f7a5ae77b3b4e21c57798eba2";

const isCompactMode = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE);
let peraWallet = new PeraWalletConnect({projectId: PROJECT_ID, compactMode: isCompactMode === "true"});
const peraOnRamp = new PeraOnramp({
  optInEnabled: true
});

const NETWORK_OPTIONS: {id: ChainType, title: string}[] = [
  {
    id: ChainType.TestNet,
    title: "TestNet"
  },
  {
    id: ChainType.MainNet,
    title: "MainNet"
  }
];

function Home() {
  const [chainType, setChainType] = useState<{id: ChainType, title: string}>(NETWORK_OPTIONS[0]);
  const [chainDropdownSelectedOption, setChainDropdownSelectedOption] =
    useState<{id: "mainnet" | "testnet", title: string} | null>({
      id: "testnet",
      title: "TestNet"
    });
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  const {display: displayToast} = useToaster();
  const {accountInformationState, refetchAccountDetail} = useGetAccountDetailRequest({
    chain: chainType.id,
    accountAddress: accountAddress || ""
  });
  const [isConnectCompactMode, setConnectCompactMode] = useState(peraWallet.compactMode || false);

  useEffect(() => {
    peraWallet = new PeraWalletConnect({projectId: PROJECT_ID, compactMode: isConnectCompactMode});
  }, [isConnectCompactMode]);

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length > 0) {
          setAccountAddress(accounts[0]);

          handleSetLog("Connected to Pera Wallet");
        }
      })
      .catch((e) => console.log(e));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`app ${isConnectedToPeraWallet ? "app--connected" : ""}`}>
      <div className={"app__header"}>
        <Select
          role={"listbox"}
          options={NETWORK_OPTIONS}
          onSelect={(option) => {
            handleSelectChainType(option);
          }}
          value={chainDropdownSelectedOption}>
          <Select.Trigger>
            {chainType.title}
          </Select.Trigger>

          <Select.Content>
            <List items={NETWORK_OPTIONS}>
              {(option) => (
                <Select.Item option={option} as={"li"}>
                  {option.title}
                </Select.Item>
              )}
            </List>
          </Select.Content>
        </Select>
      </div>

      {chainType.id === ChainType.MainNet && (
        <div className={"app__chain-message"}>
          {
            "You are using MainNet right now. Please be careful when you trying to send transactions."
          }
        </div>
      )}

      <h1 className={"app__title"}>
        {"Pera Wallet Demo dApp - Wallet Connect v2"}
      </h1>

      {!isConnectedToPeraWallet && (
        <div className={"app__compact-mode-switch"}>
          <p>{"Pera Connect Compact Mode: "}</p>

          <Switch onToggle={handleCompactModeSwitch} isToggledOn={isConnectCompactMode} />
        </div>
      )}

      {accountInformationState.data && accountAddress && (
        <AccountBalance
          accountInformation={accountInformationState.data}
          chain={chainType.id}
        />
      )}

      {isConnectedToPeraWallet && chainType.id === "mainnet" && (
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
          chain={chainType.id}
          refecthAccountDetail={refetchAccountDetail}
        />
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
              chainType.id,
              addr,
              Number(assetID)
            );

            const transactions: SignerTransaction[] = txnsToSign.reduce(
              (acc, val) => acc.concat(val),
              []
            );

            const signedTxn = await peraWallet.signTransaction([transactions]);

            await clientForChain(chainType.id).sendRawTransaction(signedTxn).do();

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
    option: {id: "mainnet" | "testnet"} | null
  ) {
    if (option?.id === "testnet") {
      setChainType(NETWORK_OPTIONS[0]);
      setChainDropdownSelectedOption({
        id: "testnet",
        title: "TestNet"
      });
      peraApiManager.updateFetcher(ChainType.TestNet);
    } else if (option?.id === "mainnet") {
      setChainType(NETWORK_OPTIONS[1]);
      setChainDropdownSelectedOption({
        id: "mainnet",
        title: "MainNet"
      });
      peraApiManager.updateFetcher(ChainType.MainNet);
    }
  }
}

export default Home;
