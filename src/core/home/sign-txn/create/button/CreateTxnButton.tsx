import {useEffect, useRef, useState} from "react";
import {Buffer} from 'buffer';
import {Button} from "@hipo/react-ui-toolkit";
import algosdk, {Transaction, isValidAddress} from "algosdk";
import {SignerTransaction} from "@perawallet/connect/dist/util/model/peraWalletModels";

import useAsyncProcess from "../../../../hooks/useAsyncProcess/useAsyncProcess";
import peraApi, {Asset} from "../../../../utils/pera/api/peraApi";
import {getSearchParams} from "../../../../utils/url/urlUtils";
import {TxnForm} from "../CreateTxn";
import {ChainType, apiGetTxnParams} from "../../../../utils/algod/algod";
import {PeraTransactionType} from "../../../../transaction/transactionTypes";

function CreateTxnButton({
  txnForm,
  type,
  chain,
  onResetForm,
  onSetTransactions
}: {
  txnForm: TxnForm;
  type: PeraTransactionType;
  chain: ChainType;
  onResetForm: VoidFunction;
  onSetTransactions: (txns: SignerTransaction[]) => void;
}) {
  const {
    address,
    toAddress,
    amount,
    note,
    assetIndex,
    rekeyTo,
    closeTo,
    transactionAmount,

    // keyreg
    voteKey,
    selectionKey,
    stateProofKey,
    voteFirst,
    voteLast,
    voteKeyDilution,
    isOnlineKeyregTxn,

    // acfg

    assetTxnType,
    unitName,
    assetName,
    defaultFrozen,
    manager,
    reserve,
    freeze,
    clawback,
    assetURL,
    total,
    decimals
  } = txnForm;
  const {runAsyncProcess} = useAsyncProcess<ListRequestResponse<Asset>>();
  const assetsRef = useRef<ListRequestResponse<Asset>>();
  const [isPending, setPendingState] = useState(false);
  const [isDisabled, setDisablingState] = useState(false);

  useEffect(() => {
    if (type === "keyreg") {
      if (isOnlineKeyregTxn) {
        if (voteKey && selectionKey && stateProofKey && voteFirst && voteLast &&
          voteKeyDilution) {
          setDisablingState(false);
        } else {
          setDisablingState(true);
        }
      } else {
        setDisablingState(false);
      }
    }
  }, [isOnlineKeyregTxn, voteKey, selectionKey, stateProofKey, voteFirst, voteLast, voteKeyDilution, type]);

  return (
    <Button
      onClick={handleCreateTransaction}
      shouldDisplaySpinner={isPending}
      isDisabled={isDisabled}
      customClassName={
        "create-txn__cta"
      }>{`Create ${type} Transaction`}</Button>
  );

  async function handleCreateTransaction() {
    try {
      if (type === "pay") {
        await createPayTransaction();
      } else if (type === "axfer") {
        await createAxferTransaction();
      } else if (type === "keyreg") {
        await createKeyregTransaction();
      } else if (type === "acfg") {
        await createAcfgTransaction();
      }

      onResetForm();
    } catch {
      console.log("Failed to create transactions.");
    }
  }

  async function createAcfgTransaction() {
    try {
      const suggestedParams = await apiGetTxnParams(chain);
      let txn: Transaction;

      if (assetTxnType === "create") {
        txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
          defaultFrozen: defaultFrozen || false,
          unitName,
          assetName,
          manager,
          reserve,
          freeze,
          clawback,
          assetURL,
          total: total || 1,
          decimals: decimals || 0,
          from: address,
          suggestedParams
        });
      } else if (assetTxnType === "modify") {
        txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
          from: address,
          manager,
          freeze,
          clawback,
          reserve,
          assetIndex: Number(assetIndex),
          suggestedParams,
          strictEmptyAddressChecking: false
        })
      } else {
        txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
          from: address,
          suggestedParams,
          assetIndex: Number(assetIndex)
        })
      }
      

      onSetTransactions([{txn}]);
    } catch (e) {
      console.log(e);
    }
  }

  async function createKeyregTransaction() {
    try {
      const suggestedParams = await apiGetTxnParams(chain);
      let txn: Transaction;

      if (isOnlineKeyregTxn) {
        txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
          from: address,
          voteKey: voteKey!,
          selectionKey: selectionKey!,
          stateProofKey: stateProofKey!,
          voteFirst: voteFirst!,
          voteLast: voteLast!,
          voteKeyDilution: voteKeyDilution!,
          rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
          suggestedParams
        });
      } else {
        txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
          from: address,
          nonParticipation: true,
          rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
          suggestedParams
        });
      }

      onSetTransactions([{txn}]);
    } catch (error) {
      console.log(error);
    }
  }

  async function createPayTransaction() {
    try {
      setPendingState(true);
      const suggestedParams = await apiGetTxnParams(chain);

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: address,
        to: toAddress,
        amount: Number(amount),
        note: new Uint8Array(Buffer.from(note)),
        rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
        closeRemainderTo: isValidAddress(closeTo) ? closeTo : undefined,
        suggestedParams
      });

      onSetTransactions([{txn}]);
    } catch (error) {
      console.log(error);
    } finally {
      setPendingState(false);
    }
  }

  async function createAxferTransaction() {
    try {
      setPendingState(true);
      await fetchAssets();

      const suggestedParams = await apiGetTxnParams(chain);
      const txns: SignerTransaction[] = [];

      for (let i = 0; i < transactionAmount; i++) {
        const assetId = assetsRef.current!.results[i].asset_id;

        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: toAddress,
          amount: 0,
          assetIndex: transactionAmount === 1 ? Number(assetIndex) : assetId,
          note: new Uint8Array(Buffer.from(`Transaction no: ${i + 1}`)),
          rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
          closeRemainderTo: isValidAddress(closeTo) ? closeTo : undefined,
          suggestedParams
        });

        txns.push({txn});
      }

      onSetTransactions(txns);
    } catch (error) {
      console.log(error);
    } finally {
      setPendingState(false);
    }
  }

  async function fetchAssets(next?: string) {
    let assetsResponse: ListRequestResponse<Asset>;

    if (next) {
      const nextRequestUrl = new URL(next);

      assetsResponse = await runAsyncProcess(
        peraApi.getAssets(getSearchParams(nextRequestUrl.search))
      );
    } else {
      assetsResponse = await runAsyncProcess(peraApi.getAssets());
    }

    assetsRef.current = {
      ...assetsResponse,
      results: [...(assetsRef.current?.results || []), ...assetsResponse.results]
    }

    if ((assetsRef.current.results.length || 0) < transactionAmount && assetsResponse.next) await fetchAssets(assetsResponse.next)
  }
}

export default CreateTxnButton;
