import {useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect";

import {ChainType, clientForChain} from "../../utils/algod/algod";
import {signAndSubmit} from "./signing";
import ScenarioList from "./scenario-list/ScenarioList";
import {getScenarios, type NumberedScenario} from "../../../scenarios/registry";

interface SignTxnProps {
  accountAddress: string | null;
  peraWallet: PeraWalletConnect;
  handleSetLog: (log: string) => void;
  chain: ChainType;
  refecthAccountDetail: () => void;
}

const SignTxn = ({
  accountAddress,
  peraWallet,
  handleSetLog,
  chain,
  refecthAccountDetail
}: SignTxnProps) => {
  const [invokingId, setInvokingId] = useState<string | null>(null);

  const network = chain === ChainType.MainNet ? "mainnet" : "testnet";
  const scenarios = getScenarios(network);

  const invoke = async (scenario: NumberedScenario) => {
    if (!accountAddress) {
      handleSetLog("Connect a wallet first to invoke scenarios.");
      return;
    }
    setInvokingId(scenario.id);
    try {
      if (!scenario.kind || scenario.kind === "txn") {
        const result = await scenario.build(chain, accountAddress);
        if (!("transaction" in result)) throw new Error("kind mismatch: expected transaction");
        const {submittedGroups, partialSignGroups} = await signAndSubmit({
          peraWallet,
          algod: clientForChain(chain),
          accountAddress,
          txnsToSign: result.transaction,
          transactionTimeout: result.transactionTimeout
        });
        if (submittedGroups > 0 && partialSignGroups === 0) {
          handleSetLog(`Signed and sent: ${scenario.title}`);
        } else if (submittedGroups > 0 && partialSignGroups > 0) {
          handleSetLog(
            `Signed: ${scenario.title} — ${submittedGroups} group(s) submitted, ${partialSignGroups} group(s) skipped (unsigned slot whose sender isn't a known test account).`
          );
        } else if (partialSignGroups > 0) {
          handleSetLog(
            `Signed: ${scenario.title} — not submitted (an unsigned slot's sender isn't a known test account; algod would reject as incomplete group).`
          );
        } else {
          handleSetLog(`Signed: ${scenario.title} (nothing to submit).`);
        }
      } else if (scenario.kind === "arbitrary-data") {
        const result = await scenario.build(chain, accountAddress);
        if (!("data" in result)) throw new Error("kind mismatch: expected data");
        const signedData = await peraWallet.signData(result.data, accountAddress, true);
        handleSetLog(`Arbitrary data signed: ${scenario.title}`);
        console.log({scenario: scenario.id, signedData});
      } else if (scenario.kind === "arc60") {
        const result = await scenario.build(chain, accountAddress);
        if (!("payload" in result)) throw new Error("kind mismatch: expected payload");
        const signature = await peraWallet.signArc60Data(result.payload, true);
        handleSetLog(`ARC-60 auth signed: ${scenario.title}`);
        console.log({scenario: scenario.id, signature});
      }
    } catch (error) {
      handleSetLog(`${error}`);
      console.log(error);
    } finally {
      setInvokingId(null);
      refecthAccountDetail();
    }
  };

  return (
    <ScenarioList scenarios={scenarios} onInvoke={invoke} invokingId={invokingId} />
  );
};

export default SignTxn;
