import {useState} from "react";
import {PeraWalletConnect, ScopeType} from "@perawallet/connect";

import {ChainType, clientForChain} from "../../utils/algod/algod";
import {signAndSubmit} from "./signing";
import ScenarioList from "./scenario-list/ScenarioList";
import {getScenarios, type NumberedScenario} from "../../../scenarios/registry";
import {
  clearOwnedAsset,
  getOwnedAsset,
  networkForChain,
  setOwnedAsset
} from "../../../scenarios/owned-asset";

interface SignTxnProps {
  accountAddress: string | null;
  connectedAccounts: string[];
  peraWallet: PeraWalletConnect;
  handleSetLog: (log: string) => void;
  chain: ChainType;
  refecthAccountDetail: () => void;
}

const SignTxn = ({
  accountAddress,
  connectedAccounts,
  peraWallet,
  handleSetLog,
  chain,
  refecthAccountDetail
}: SignTxnProps) => {
  const [invokingId, setInvokingId] = useState<string | null>(null);

  const network = networkForChain(chain);
  const scenarios = getScenarios(network);

  const invoke = async (scenario: NumberedScenario) => {
    if (!accountAddress) {
      handleSetLog("Connect a wallet first to invoke scenarios.");
      return;
    }
    if (scenario.minAccounts && connectedAccounts.length < scenario.minAccounts) {
      handleSetLog(
        `This scenario needs at least ${scenario.minAccounts} connected accounts (currently ${connectedAccounts.length}). Reconnect and approve more accounts.`
      );
      return;
    }
    setInvokingId(scenario.id);
    try {
      if (!scenario.kind || scenario.kind === "txn") {
        const result = await scenario.build(chain, accountAddress, connectedAccounts);
        if ("notice" in result) {
          handleSetLog(result.notice);
          return;
        }
        if (!("transaction" in result)) throw new Error("kind mismatch: expected transaction");
        const {submittedGroups, partialSignGroups, createdAssetIndex} = await signAndSubmit({
          peraWallet,
          algod: clientForChain(chain),
          accountAddress,
          txnsToSign: result.transaction,
          transactionTimeout: result.transactionTimeout,
          captureAssetIndex: scenario.captureCreatedAsset
        });
        if (createdAssetIndex !== undefined) {
          setOwnedAsset(network, accountAddress, createdAssetIndex);
          handleSetLog(`Created test asset ${createdAssetIndex} and stored it for role scenarios.`);
        } else if (scenario.captureCreatedAsset && submittedGroups > 0) {
          handleSetLog(
            "Asset created, but the dApp timed out capturing its ID — find the new asset ID on an explorer and re-run 'Create test asset (setup)' entering that ID."
          );
        }
        if (scenario.clearsOwnedAssetOnSuccess && submittedGroups > 0) {
          clearOwnedAsset(network, accountAddress);
        }
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
        const result = await scenario.build(chain, accountAddress, connectedAccounts);
        if ("notice" in result) throw new Error("kind mismatch: unexpected notice");
        if (!("data" in result)) throw new Error("kind mismatch: expected data");
        const signedData = await peraWallet.signData(result.data, accountAddress, true);
        handleSetLog(`Arbitrary data signed: ${scenario.title}`);
        console.log({scenario: scenario.id, signedData});
      } else if (scenario.kind === "arc60") {
        const result = await scenario.build(chain, accountAddress, connectedAccounts);
        if ("notice" in result) throw new Error("kind mismatch: unexpected notice");
        if (!("payload" in result)) throw new Error("kind mismatch: expected payload");
        const signature = await peraWallet.signArc60Data(result.payload, {scope: ScopeType.AUTH, encoding: "base64"}, true);
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

  const ownedAssetId = accountAddress
    ? getOwnedAsset(network, accountAddress)
    : null;

  return (
    <ScenarioList
      scenarios={scenarios}
      onInvoke={invoke}
      invokingId={invokingId}
      connectedAccountCount={connectedAccounts.length}
      ownedAssetId={ownedAssetId}
    />
  );
};

export default SignTxn;
