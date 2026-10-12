import {useState} from "react";
import {ScopeType} from "@perawallet/connect";
import type {PeraWalletArc60SignData} from "@perawallet/connect";

import type {WalletSigner} from "../../utils/pera-wallet/transport/WalletTransport";
import {
  resolveArc60SignerForChain,
  type Arc60SignerLookup
} from "../../utils/pera-wallet/arc60Signer";
import {summarizeEmptySignatures} from "../../utils/pera-wallet/emptySignature";
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
  /** `PeraWalletConnect.resolveArc60Signer`. Injected rather than imported so
   *  this component stays independent of the connect singleton. */
  resolveArc60Signer: Arc60SignerLookup;
}

const SignTxn = ({
  accountAddress,
  connectedAccounts,
  wallet,
  handleSetLog,
  chain,
  refecthAccountDetail,
  resolveArc60Signer
}: SignTxnProps) => {
  const [invokingId, setInvokingId] = useState<string | null>(null);

  const network = scenarioNetworkForChain(chain);
  const scenarios = getScenarios(network);

  const {label: networkLabel, appIndex, assetIds} = getNetworkConfig(chain);
  const availableFixtures = {app: appIndex !== undefined, asset: assetIds !== undefined};

  /** Replaces the payload's `signer` with the account's resolved ARC-60
   *  signer. A lookup failure propagates: proceeding with the account's own
   *  key is exactly what makes a rekeyed account fail at the wallet. */
  const resolvedArc60Payload = async (
    payload: PeraWalletArc60SignData,
    accountAddress: string
  ): Promise<PeraWalletArc60SignData> => {
    const outcome = await resolveArc60SignerForChain(
      chain,
      accountAddress,
      resolveArc60Signer
    );

    if (outcome.status === "unavailable") {
      handleSetLog(outcome.reason);

      return payload;
    }

    if (outcome.resolution.isRekeyed) {
      handleSetLog(
        `${accountAddress} is rekeyed — signing ARC-60 as its auth address ${outcome.resolution.signerAddress}.`
      );
    }

    return {...payload, signer: outcome.resolution.signer};
  };

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
        // ARC-60 carries no network, so who signs has to be settled here
        // rather than by the wallet: a rekeyed account must name its auth
        // address as `signer` while the SIWA payload keeps the account as
        // `account_address`.
        const payload = scenario.preservesArc60Signer
          ? result.payload
          : await resolvedArc60Payload(result.payload, accountAddress);
        const signature = await wallet.signArc60Data(payload, {scope: ScopeType.AUTH, encoding: "base64"}, true);
        handleSetLog(`ARC-60 auth signed: ${scenario.title}`);
        console.log({scenario: scenario.id, signature});
      } else if (scenario.kind === "empty-signatures") {
        const emptySignatures = await wallet.getEmptySignatures(chain);
        handleSetLog(summarizeEmptySignatures(emptySignatures, connectedAccounts));
        console.log({scenario: scenario.id, emptySignatures});
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
