import { useState } from "react";
import { Button, List, ListItem } from "@hipo/react-ui-toolkit";
import { PeraWalletConnect, ScopeType } from "@perawallet/connect";
import type { PeraWalletArbitraryData, PeraWalletArc60SignData, SignerTransaction, Siwa } from "@perawallet/connect";

import { mainnetScenarios, Scenario, scenarios } from "./util/signTxnUtils";
import { ChainType, clientForChain } from "../../utils/algod/algod";
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
  const { isModalOpen, openModal, closeModal } = useModalVisibilityState();

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

      <div style={{ marginTop: "45px" }}>
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

      <div style={{ marginTop: "45px" }}>
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

        <div style={{ display: "flex", gap: "20px" }}>
          <Button
            customClassName={"app__button"}
            style={{ width: "160px" }}
            onClick={signSingleArbitraryData}
            shouldDisplaySpinner={isRequestPending}
            isDisabled={isRequestPending}>
            {isRequestPending ? "Loading..." : "Sign Single Arbitrary Data"}
          </Button>

          <Button
            customClassName={"app__button"}
            style={{ width: "160px" }}
            onClick={signMultipleArbitraryData}
            shouldDisplaySpinner={isRequestPending}
            isDisabled={isRequestPending}>
            {isRequestPending ? "Loading..." : "Sign Multiple Arbitrary Data"}
          </Button>

          <Button
            customClassName={"app__button"}
            style={{ width: "160px" }}
            onClick={signArc60AuthRequest}
            shouldDisplaySpinner={isRequestPending}
            isDisabled={isRequestPending}>
            {isRequestPending ? "Loading..." : "Sign ARC-60 Auth (preview)"}
          </Button>
        </div>
      </div>
    </>
  );

  async function signSingleArbitraryData() {
    const unsignedData = [
      {
        data: new Uint8Array(Buffer.from(`timestamp`)),
        message: "Timestamp confirmation"
      }];

    await signArbitraryData(unsignedData);
  }

  async function signMultipleArbitraryData() {
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

    await signArbitraryData(unsignedData)
  }

  async function signArc60AuthRequest() {
    const domain = window.location.host;

    const siwaPayload: Siwa = {
      account_address: accountAddress,
      chain_id: "283",
      domain,
      "issued-at": new Date().toISOString(),
      nonce: crypto.randomUUID(),
      "request-id": crypto.randomUUID(),
      statement: "Sign in to Pera Demo dApp with your Algorand account.",
      type: "ed25519",
      uri: window.location.origin,
      version: "1"
    };

    // RFC 8785 canonical JSON: sorted top-level keys, no whitespace. Safe here
    // because every value is an ASCII string with no JSON-escape characters.
    const canonicalJson = JSON.stringify(
      siwaPayload,
      Object.keys(siwaPayload).sort()
    );

    // First 32 bytes of authenticatorData must equal sha256(domain) per ARC-60.
    const authenticatorData = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(domain))
    );

    const payload: PeraWalletArc60SignData = {
      data: new Uint8Array(Buffer.from(canonicalJson)),
      signer: accountAddress,
      domain,
      authenticatorData,
      requestId: crypto.randomUUID(),
      metadata: {
        scope: ScopeType.AUTH,
        encoding: "base64"
      }
    };

    setIsRequestPending(true);

    try {
      const signature = await peraWallet.signArc60Data(payload, true);

      handleSetLog(`ARC-60 auth signed and verified successfully`);
      console.log({authenticatorData, data: payload.data, signature});
    } catch (error) {
      console.log(error);
      handleSetLog(`${error}`);
    } finally {
      setIsRequestPending(false);
    }
  }

  async function signArbitraryData(arbitraryData: PeraWalletArbitraryData[]) {
    try {
      const signedData: Uint8Array[] = await peraWallet.signData(
        arbitraryData,
        accountAddress,
        true
      );

      handleSetLog(`Arbitrary data signed and verified successfully`);
      console.log({arbitraryData, signedData});
    } catch (error) {
      console.log(error)
      handleSetLog(`${error}`);
    }
  }

  async function signTransaction(scenario: Scenario, name: string) {
    setIsRequestPending(true);

    try {
      const { transaction: txnsToSign, transactionTimeout } = await scenario(
        chain,
        accountAddress
      );

      const transactions: SignerTransaction[] = txnsToSign.reduce(
        (acc, val) => acc.concat(val),
        []
      );

      const signedTransactions = await peraWallet.signTransaction([transactions]);

      console.log({ transactions, signedTransactions });

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
