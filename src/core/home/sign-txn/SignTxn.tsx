import {useState} from "react";
import {Button, List, ListItem} from "@hipo/react-ui-toolkit";
import {PeraWalletConnect} from "@perawallet/connect-beta";
import {SignerTransaction} from "@perawallet/connect-beta/dist/util/model/peraWalletModels";
import algosdk from "algosdk";

import {mainnetScenarios, Scenario, scenarios} from "./util/signTxnUtils";
import {ChainType, clientForChain} from "../../utils/algod/algod";
import CreateTxn from "./create/CreateTxn";
import useModalVisibilityState from "../../hooks/useModalVisibilityState";

interface SignTxnProps {
  accountAddress: string;
  peraWallet: PeraWalletConnect;
  handleSetLog: (log: string) => void;
  chain: ChainType;
  refecthAccountDetail: () => void;
}

function SignTxn({
  accountAddress,
  peraWallet,
  handleSetLog,
  chain,
  refecthAccountDetail
}: SignTxnProps) {
  const [isRequestPending, setIsRequestPending] = useState(false);
  const {isModalOpen, openModal, closeModal} = useModalVisibilityState();

  return (
    <>
      <Button customClassName={"app__button--connect"} onClick={openModal}>
        {"Create Transaction"}
      </Button>

      <CreateTxn
        chain={chain}
        peraWallet={peraWallet}
        address={accountAddress}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      <div style={{marginTop: "45px"}}>
        <h3>{"Mainnet only, do not sign!"}</h3>
        {chain === ChainType.TestNet && <small>{"Switch to MainNet to see txns"}</small>}

        <List items={mainnetScenarios} customClassName={"app__actions"}>
          {(item) => (
            <ListItem>
              <Button
                customClassName={"app__button"}
                onClick={() => signTransaction(item.scenario, item.name)}
                shouldDisplaySpinner={isRequestPending}
                isDisabled={isRequestPending}>
                {isRequestPending ? "Loading..." : item.name}
              </Button>
            </ListItem>
          )}
        </List>
      </div>

      <div style={{marginTop: "45px"}}>
        <h3>{"Both Networks"}</h3>

        <List items={scenarios} customClassName={"app__actions"}>
          {(item) => (
            <ListItem>
              <Button
                customClassName={"app__button"}
                onClick={() => signTransaction(item.scenario, item.name)}
                shouldDisplaySpinner={isRequestPending}
                isDisabled={isRequestPending}>
                {isRequestPending ? "Loading..." : item.name}
              </Button>
            </ListItem>
          )}
        </List>

        <Button
          customClassName={"app__button"}
          style={{width: "160px"}}
          onClick={signArbitraryData}
          shouldDisplaySpinner={isRequestPending}
          isDisabled={isRequestPending}>
          {isRequestPending ? "Loading..." : "Sign Arbitrary Data"}
        </Button>
      </div>
    </>
  );

  async function signArbitraryData() {
    try {
      const unsignedData = [
        {
          data: new Uint8Array(Buffer.from(`timestamp//${Date.now()}`)),
          message: "Timestamp confirmation"
        },
        {
          data: new Uint8Array(Buffer.from(`agent//${navigator.userAgent}`)),
          message: "User agent confirmation"
        }
      ];
      const signedData: Uint8Array[] = await peraWallet.signData(
        unsignedData,
        accountAddress
      );

      unsignedData.forEach((data, index) => {
        const isVerified = algosdk.verifyBytes(data.data, signedData[index], accountAddress)

        console.log({data, signedData: signedData[index], isVerified});

        if (!isVerified) {
          handleSetLog(`Arbitrary data did not match with signed data!`);
        }
      });

      console.log({signedData});
      handleSetLog("Data signed successfully");
    } catch (error) {
      console.log(error)
      handleSetLog(`${error}`);
    }
  }

  async function signTransaction(scenario: Scenario, name: string) {
    setIsRequestPending(true);

    try {
      const {transaction: txnsToSign, transactionTimeout} = await scenario(
        chain,
        accountAddress
      );

      const transactions: SignerTransaction[] = txnsToSign.reduce(
        (acc, val) => acc.concat(val),
        []
      );

      const signedTransactions = await peraWallet.signTransaction([transactions]);

      console.log({transactions, signedTransactions});

      handleSetLog(`Transaction signed successfully: ${name}`);

      if (transactionTimeout) {
        setTimeout(async () => {
          await clientForChain(chain).sendRawTransaction(signedTransactions).do();
          handleSetLog(`Transaction sended network: ${name}`);
        }, transactionTimeout);
      } else {
        for (let i = 0; i < txnsToSign.length; i++) {
          await clientForChain(chain)
            // eslint-disable-next-line no-magic-numbers
            .sendRawTransaction(signedTransactions.slice(i * 16, (i + 1) * 16))
            .do();
        }

        handleSetLog(`Transaction sended network: ${name}`);
      }
    } catch (error) {
      handleSetLog(`${error}`);
      console.log(error);
    } finally {
      setIsRequestPending(false);
      refecthAccountDetail();
    }
  }
}

export default SignTxn;
