import {useRef, useState} from "react";
import {Button, CircularProgress} from "@mui/material";
import algosdk, {Transaction} from "algosdk";
import type {SignerTransaction} from "@perawallet/connect";

import useAsyncProcess from "../../../../hooks/useAsyncProcess/useAsyncProcess";
import peraApi, {Asset} from "../../../../utils/pera/api/peraApi";
import peraApiManager from "../../../../utils/pera/api/peraApiManager";
import {getSearchParams} from "../../../../utils/url/urlUtils";
import {ChainType, apiGetTxnParams} from "../../../../utils/algod/algod";
import {getNetworkConfig} from "../../../../utils/algod/networks";
import {PeraTransactionType} from "../../../../transaction/transactionTypes";
import {usePeraToast} from "../../../../component/toast/PeraToast";
import {optionalAddress, parseUint64} from "../txnFormValidation";
import type {TxnForm} from "../txnFormValidation";

/** The form is validated before this component will build anything, so a
 *  parse failure here is a bug rather than user error. */
const requireUint64 = (raw: string | undefined, field: string): bigint => {
  const {value, error} = parseUint64(raw);

  if (error !== undefined) {
    throw new Error(`${field}: ${error}`);
  }

  return value!;
};

const encodeNote = (note: string): Uint8Array | undefined =>
  note.trim() === "" ? undefined : new Uint8Array(Buffer.from(note));

const CreateTxnButton = ({
  txnForm,
  type,
  chain,
  isFormValid,
  onInvalidSubmit,
  onResetForm,
  onSetTransactions
}: {
  txnForm: TxnForm;
  type: PeraTransactionType;
  chain: ChainType;
  isFormValid: boolean;
  onInvalidSubmit: VoidFunction;
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
  const {display: displayToast} = usePeraToast();
  const assetsRef = useRef<ListRequestResponse<Asset>>();
  const [isPending, setPendingState] = useState(false);

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
    };

    if (
      (assetsRef.current.results.length || 0) < transactionAmount &&
      assetsResponse.next
    ) {
      await fetchAssets(assetsResponse.next);
    }
  };

  const createAcfgTransaction = async () => {
    const suggestedParams = await apiGetTxnParams(chain);
    let txn: Transaction;

    if (assetTxnType === "create") {
      txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        defaultFrozen: defaultFrozen || false,
        unitName: unitName?.trim() || undefined,
        assetName: assetName?.trim() || undefined,
        manager: optionalAddress(manager),
        reserve: optionalAddress(reserve),
        freeze: optionalAddress(freeze),
        clawback: optionalAddress(clawback),
        assetURL: assetURL?.trim() || undefined,
        total: requireUint64(total, "Total"),
        decimals: decimals ?? 0,
        note: encodeNote(note),
        sender: address,
        suggestedParams
      });
    } else if (assetTxnType === "modify") {
      txn = algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
        sender: address,
        manager: optionalAddress(manager),
        freeze: optionalAddress(freeze),
        clawback: optionalAddress(clawback),
        reserve: optionalAddress(reserve),
        assetIndex: requireUint64(assetIndex, "Asset Index"),
        note: encodeNote(note),
        suggestedParams,
        strictEmptyAddressChecking: false
      });
    } else {
      txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
        sender: address,
        note: encodeNote(note),
        suggestedParams,
        assetIndex: requireUint64(assetIndex, "Asset Index")
      });
    }

    onSetTransactions([{txn}]);
  };

  const createAfrzTransaction = async () => {
    const suggestedParams = await apiGetTxnParams(chain);

    const txn = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
      sender: address,
      assetIndex: requireUint64(assetIndex, "Asset Index"),
      freezeTarget: freezeTarget!.trim(),
      frozen: frozen || false,
      note: encodeNote(note),
      rekeyTo: optionalAddress(rekeyTo),
      suggestedParams
    });

    onSetTransactions([{txn}]);
  };

  const createKeyregTransaction = async () => {
    const suggestedParams = await apiGetTxnParams(chain);
    let txn: Transaction;

    if (isOnlineKeyregTxn) {
      // algosdk v3 requires participation keys as raw bytes; the form
      // provides them as base64 strings, so decode at the boundary.
      txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: address,
        voteKey: algosdk.base64ToBytes(voteKey!.trim()),
        selectionKey: algosdk.base64ToBytes(selectionKey!.trim()),
        stateProofKey: algosdk.base64ToBytes(stateProofKey!.trim()),
        voteFirst: voteFirst!,
        voteLast: voteLast!,
        voteKeyDilution: voteKeyDilution!,
        rekeyTo: optionalAddress(rekeyTo),
        suggestedParams
      });
    } else {
      txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
        sender: address,
        rekeyTo: optionalAddress(rekeyTo),
        suggestedParams
      });
    }

    onSetTransactions([{txn}]);
  };

  const createPayTransaction = async () => {
    const suggestedParams = await apiGetTxnParams(chain);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: toAddress.trim(),
      amount: requireUint64(amount, "Amount"),
      note: encodeNote(note),
      rekeyTo: optionalAddress(rekeyTo),
      closeRemainderTo: optionalAddress(closeTo),
      suggestedParams
    });

    onSetTransactions([{txn}]);
  };

  const createAxferTransaction = async () => {
    const isBulk = transactionAmount > 1;

    if (isBulk && !peraApiManager.isAvailable) {
      throw new Error(
        `Bulk asset transfers need the Pera API, which is unavailable on ${
          getNetworkConfig(chain).label
        }. Set the transaction amount to 1 and enter an asset ID manually.`
      );
    }

    if (isBulk) {
      await fetchAssets();
    }

    const suggestedParams = await apiGetTxnParams(chain);
    const txns: SignerTransaction[] = [];

    for (let i = 0; i < transactionAmount; i++) {
      // Bulk mode builds one 0-amount opt-in per asset from the Pera API.
      // A single transfer uses the asset and amount entered on the form.
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: toAddress.trim(),
        amount: isBulk ? 0 : requireUint64(amount, "Amount"),
        assetIndex: isBulk
          ? assetsRef.current!.results[i].asset_id
          : requireUint64(assetIndex, "Asset Index"),
        note: isBulk
          ? new Uint8Array(Buffer.from(`Transaction no: ${i + 1}`))
          : encodeNote(note),
        rekeyTo: optionalAddress(rekeyTo),
        closeRemainderTo: optionalAddress(closeTo),
        suggestedParams
      });

      txns.push({txn});
    }

    onSetTransactions(txns);
  };

  const handleCreateTransaction = async () => {
    // Kept clickable while invalid so the click is what reveals the errors. A
    // silently disabled button gives the user nothing to act on.
    if (!isFormValid) {
      onInvalidSubmit();
      return;
    }

    try {
      setPendingState(true);

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
      displayToast({
        message: `Created ${type} transaction`,
        severity: "success"
      });
    } catch (error) {
      console.log(error);
      displayToast({
        message: `${error instanceof Error ? error.message : error}`,
        severity: "error"
      });
    } finally {
      setPendingState(false);
    }
  };

  return (
    <Button
      onClick={handleCreateTransaction}
      disabled={isPending}
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
