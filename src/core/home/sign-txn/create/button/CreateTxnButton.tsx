import {useEffect, useRef, useState} from "react";
import {Button, CircularProgress} from "@mui/material";
import algosdk, {Transaction, isValidAddress} from "algosdk";
import type {SignerTransaction} from "@perawallet/connect";

import useAsyncProcess from "../../../../hooks/useAsyncProcess/useAsyncProcess";
import peraApi, {Asset} from "../../../../utils/pera/api/peraApi";
import {getSearchParams} from "../../../../utils/url/urlUtils";
import {TxnForm} from "../CreateTxn";
import {ChainType, apiGetTxnParams} from "../../../../utils/algod/algod";
import {PeraTransactionType} from "../../../../transaction/transactionTypes";

const CreateTxnButton = ({
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
}) => {
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
    decimals,

    // afrz
    freezeTarget,
    frozen
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

  const fetchAssets = async (next?: string) => {
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
  };

  const createAcfgTransaction = async () => {
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
          sender: address,
          suggestedParams
        });
      } else if (assetTxnType === "modify") {
        txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
          sender: address,
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
          sender: address,
          suggestedParams,
          assetIndex: Number(assetIndex)
        })
      }


      onSetTransactions([{txn}]);
    } catch (e) {
      console.log(e);
    }
  };

  const createAfrzTransaction = async () => {
    try {
      setPendingState(true);
      const suggestedParams = await apiGetTxnParams(chain);

      const txn = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
        sender: address,
        assetIndex: Number(assetIndex),
        freezeTarget: freezeTarget!,
        frozen: frozen || false,
        note: new Uint8Array(Buffer.from(note)),
        rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
        suggestedParams
      });

      onSetTransactions([{txn}]);
    } catch (error) {
      console.log(error);
    } finally {
      setPendingState(false);
    }
  };

  const createKeyregTransaction = async () => {
    try {
      const suggestedParams = await apiGetTxnParams(chain);
      let txn: Transaction;

      if (isOnlineKeyregTxn) {
        // algosdk v3 requires participation keys as raw bytes; the form
        // provides them as base64 strings, so decode at the boundary.
        txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
          sender: address,
          voteKey: new Uint8Array(Buffer.from(voteKey!, "base64")),
          selectionKey: new Uint8Array(Buffer.from(selectionKey!, "base64")),
          stateProofKey: new Uint8Array(Buffer.from(stateProofKey!, "base64")),
          voteFirst: suggestedParams.firstValid,
          voteLast: suggestedParams.lastValid,
          voteKeyDilution: voteKeyDilution!,
          rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
          suggestedParams
        });
      } else {
        txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
          sender: address,
          rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
          suggestedParams
        });
      }

      onSetTransactions([{txn}]);
    } catch (error) {
      console.log(error);
    }
  };

  const createPayTransaction = async () => {
    try {
      setPendingState(true);
      const suggestedParams = await apiGetTxnParams(chain);

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: toAddress,
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
  };

  const createAxferTransaction = async () => {
    try {
      setPendingState(true);
      await fetchAssets();

      const suggestedParams = await apiGetTxnParams(chain);
      const txns: SignerTransaction[] = [];

      for (let i = 0; i < transactionAmount; i++) {
        const assetId = assetsRef.current!.results[i].asset_id;

        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: address,
          receiver: toAddress,
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
  };

  const handleCreateTransaction = async () => {
    try {
      if (type === "pay") {
        await createPayTransaction();
      } else if (type === "axfer") {
        await createAxferTransaction();
      } else if (type === "keyreg") {
        await createKeyregTransaction();
      } else if (type === "acfg") {
        await createAcfgTransaction();
      } else if (type === "afrz") {
        await createAfrzTransaction();
      }

      onResetForm();
    } catch {
      console.log("Failed to create transactions.");
    }
  };

  return (
    <Button
      onClick={handleCreateTransaction}
      disabled={isDisabled || isPending}
      variant={"contained"}
      fullWidth={true}
      startIcon={
        isPending ? <CircularProgress size={16} color={"inherit"} /> : undefined
      }>
      {`Create ${type} Transaction`}
    </Button>
  );
};

export default CreateTxnButton;
