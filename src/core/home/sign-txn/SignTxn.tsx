import { useState } from "react";

import { ChainType, clientForChain } from "../../utils/algod/algod";
import { signAndSubmit } from "./signing";
import ScenarioList from "./scenario-list/ScenarioList";
import { getScenarios, type NumberedScenario } from "../../../scenarios/registry";
import { useWallet } from "../../wallet/WalletProvider";

interface SignTxnProps {
  accountAddress: string | null;
  handleSetLog: (log: string) => void;
  chain: ChainType;
  refecthAccountDetail: () => void;
}

const SignTxn = ({ accountAddress, handleSetLog, chain, refecthAccountDetail }: SignTxnProps) => {
  const [invokingId, setInvokingId] = useState<string | null>(null);
  const { connector } = useWallet();

  const network = chain === ChainType.MainNet ? "mainnet" : "testnet";
  const scenarios = getScenarios(network);

  const invoke = async (scenario: NumberedScenario) => {
    if (!accountAddress) {
      handleSetLog("Connect a wallet first to invoke scenarios.");
      return;
    }
    const kind = scenario.kind || "txn";
    if (!connector.supports(kind)) {
      handleSetLog(`"${scenario.title}" (${kind}) is not supported by ${connector.protocol}.`);
      return;
    }
    setInvokingId(scenario.id);
    try {
      if (kind === "txn") {
        const result = await scenario.build(chain, accountAddress);
        if (!("transaction" in result)) throw new Error("kind mismatch: expected transaction");
        const { submittedGroups, partialSignGroups } = await signAndSubmit({
          signTransaction: (groups) => connector.signTransaction(groups),
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
      } else if (kind === "arbitrary-data") {
        const result = await scenario.build(chain, accountAddress);
        if (!("data" in result)) throw new Error("kind mismatch: expected data");
        if (!connector.signData) throw new Error("Active protocol does not support arbitrary data");
        const signedData = await connector.signData(result.data, accountAddress);
        handleSetLog(`Arbitrary data signed: ${scenario.title}`);
        console.log({ scenario: scenario.id, signedData });
      } else if (kind === "arc60") {
        const result = await scenario.build(chain, accountAddress);
        if (!("payload" in result)) throw new Error("kind mismatch: expected payload");
        const signature = await connector.signArc60Data(result.payload);
        handleSetLog(`ARC-60 auth signed: ${scenario.title}`);
        console.log({ scenario: scenario.id, signature });
      }
    } catch (error) {
      handleSetLog(`${error}`);
      console.log(error);
    } finally {
      setInvokingId(null);
      refecthAccountDetail();
    }
  };

  return <ScenarioList scenarios={scenarios} onInvoke={invoke} invokingId={invokingId} />;
};

export default SignTxn;
