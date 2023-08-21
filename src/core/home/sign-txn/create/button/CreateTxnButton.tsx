import {useRef, useState} from "react";
import {Button} from "@hipo/react-ui-toolkit";
import algosdk, {isValidAddress} from "algosdk";
import {SignerTransaction} from "@perawallet/connect-beta/dist/util/model/peraWalletModels";

import useAsyncProcess from "../../../../hooks/useAsyncProcess/useAsyncProcess";
import peraApi, {Asset} from "../../../../utils/pera/api/peraApi";
import {getSearchParams} from "../../../../utils/url/urlUtils";
import {TxnForm} from "../CreateTxn";
import {ChainType, apiGetTxnParams} from "../../../../utils/algod/algod";

function CreateTxnButton({
  txnForm,
  type,
  chain,
  onResetForm,
  onSetTransactions
}: {
  txnForm: TxnForm;
  type: "pay" | "axfer";
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
    transactionAmount
  } = txnForm;
  const {runAsyncProcess} = useAsyncProcess<ListRequestResponse<Asset>>();
  const assetsRef = useRef<ListRequestResponse<Asset>>();
  const [isPending, setPendingState] = useState(false);

  return (
    <Button
      onClick={handleCreateTransaction}
      shouldDisplaySpinner={isPending}
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
      }

      onResetForm();
    } catch {
      console.log("Failed to create transactions.");
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
