import "./_home.scss";

import {Button, Dropdown, DropdownOption, useToaster} from "@hipo/react-ui-toolkit";
import {useEffect, useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect";

import AccountBalance from "./account-balance/AccountBalance";
import SignTxn from "./sign-txn/SignTxn";
import PeraToast from "../component/toast/PeraToast";
import {ChainType} from "../utils/algod/algod";
import useGetAccountDetailRequest from "../hooks/useGetAccountDetailRequest/useGetAccountDetailRequest";

const peraWallet = new PeraWalletConnect();

function Home() {
  const [chainType, setChainType] = useState<ChainType>(ChainType.TestNet);
  const [chainDropdownSelectedOption, setChainDropdownSelectedOption] =
    useState<DropdownOption<"mainnet" | "testnet", any> | null>({
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

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length) {
          setAccountAddress(accounts[0]);

          handleSetLog("Connected to Pera Wallet");
        }

        peraWallet.connector?.on("disconnect", () => {
          setAccountAddress(null);
        });
      })
      .catch((e) => console.log(e));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`app ${isConnectedToPeraWallet ? "app--connected" : ""}`}>
      <div className={"app__header"}>
        <Dropdown
          customClassName={"app__header__chain-select-dropdown"}
          role={"menu"}
          options={[
            {
              id: "testnet",
              title: "TestNet"
            },
            {
              id: "mainnet",
              title: "MainNet"
            }
          ]}
          selectedOption={chainDropdownSelectedOption}
          onSelect={(option) => {
            handleSelectChainType(option);
          }}
          hasDeselectOption={false}
        />
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

      {accountInformationState.data && (
        <AccountBalance
          accountInformation={accountInformationState.data}
          chain={chainType}
        />
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
    </div>
  );

  async function handleConnectWalletClick() {
    const newAccounts = await peraWallet.connect();

    handleSetLog("Connected to Pera Wallet");

    setAccountAddress(newAccounts[0]);
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
    option: DropdownOption<"mainnet" | "testnet", any> | null
  ) {
    if (option?.id === "testnet") {
      setChainType(ChainType.TestNet);
      setChainDropdownSelectedOption({
        id: "testnet",
        title: "TestNet"
      });
    } else if (option?.id === "mainnet") {
      setChainType(ChainType.MainNet);
      setChainDropdownSelectedOption({
        id: "mainnet",
        title: "MainNet"
      });
    }
  }
}

export default Home;
