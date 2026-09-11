import {useState} from "react";
import {ScopeType} from "@perawallet/connect";

import type {WalletSigner} from "../../utils/pera-wallet/transport/WalletTransport";
import {ChainType, clientForChain} from "../../utils/algod/algod";
import {getNetworkConfig} from "../../utils/algod/networks";
import {signAndSubmit} from "./signing";
import ScenarioList from "./scenario-list/ScenarioList";
import {getScenarios, type NumberedScenario} from "../../../scenarios/registry";
import {
  clearOwnedAsset,
  getOwnedAsset,
  scenarioNetworkForChain,
  setOwnedAsset
} from "../../../scenarios/owned-asset";

interface SignTxnProps {
  accountAddress: string | null;
  connectedAccounts: string[];
  wallet: WalletSigner;
  handleSetLog: (log: string) => void;
  chain: ChainType;
  refecthAccountDetail: () => void;
}

const SignTxn = ({
  accountAddress,
  connectedAccounts,
  wallet,
  handleSetLog,
  chain,
  refecthAccountDetail
}: SignTxnProps) => {
  const [invokingId, setInvokingId] = useState<string | null>(null);

  const network = scenarioNetworkForChain(chain);
  const scenarios = getScenarios(network);

  const {label: networkLabel, appIndex, assetIds} = getNetworkConfig(chain);
  const availableFixtures = {app: appIndex !== undefined, asset: assetIds !== undefined};

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
          wallet,
          algod: clientForChain(chain),
          accountAddress,
          txnsToSign: result.transaction,
          transactionTimeout: result.transactionTimeout,
          captureAssetIndex: scenario.captureCreatedAsset
        });
        if (createdAssetIndex !== undefined) {
          setOwnedAsset(chain, accountAddress, createdAssetIndex);
          handleSetLog(`Created test asset ${createdAssetIndex} and stored it for role scenarios.`);
        } else if (scenario.captureCreatedAsset && submittedGroups > 0) {
          handleSetLog(
            "Asset created, but the dApp timed out capturing its ID — find the new asset ID on an explorer and re-run 'Create test asset (setup)' entering that ID."
          );
        }
        if (scenario.clearsOwnedAssetOnSuccess && submittedGroups > 0) {
          clearOwnedAsset(chain, accountAddress);
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
        const signedData = await wallet.signData(result.data, accountAddress, true);
        handleSetLog(`Arbitrary data signed: ${scenario.title}`);
        console.log({scenario: scenario.id, signedData});
      } else if (scenario.kind === "arc60") {
        const result = await scenario.build(chain, accountAddress, connectedAccounts);
        if ("notice" in result) throw new Error("kind mismatch: unexpected notice");
        if (!("payload" in result)) throw new Error("kind mismatch: expected payload");
        const signature = await wallet.signArc60Data(result.payload, {scope: ScopeType.AUTH, encoding: "base64"}, true);
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
    ? getOwnedAsset(chain, accountAddress)
    : null;

  return (
    <ScenarioList
      scenarios={scenarios}
      onInvoke={invoke}
      invokingId={invokingId}
      connectedAccountCount={connectedAccounts.length}
      ownedAssetId={ownedAssetId}
      availableFixtures={availableFixtures}
      networkLabel={networkLabel}
    />
  );
};

export default SignTxn;
