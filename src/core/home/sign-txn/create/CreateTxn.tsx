import algosdk from "algosdk";
import {useEffect, useMemo, useState} from "react";
import type {SignerTransaction} from "@perawallet/connect";
import type {WalletSigner} from "../../../utils/pera-wallet/transport/WalletTransport";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {ChainType, clientForChain} from "../../../utils/algod/algod";
import CreateTxnButton from "./button/CreateTxnButton";
import {usePeraToast} from "../../../component/toast/PeraToast";
import {separateIntoChunks} from "../../../utils/array/arrayUtils";
import {
  ALGORAND_DEFAULT_TXN_WAIT_ROUNDS,
  TRANSACTION_IN_GROUP_LIMIT
} from "../../../transaction/transactionConstants";
import {
  AssetTransactionType,
  PeraTransactionType
} from "../../../transaction/transactionTypes";
import {
  ASA_MAX_DECIMALS,
  emptyTxnForm,
  validateTxnForm,
  visibleErrors
} from "./txnFormValidation";
import type {TxnForm} from "./txnFormValidation";

export type {TxnForm};

interface CreateTxnModalProps {
  chain: ChainType;
  address: string;
  isOpen: boolean;
  onClose: VoidFunction;
  wallet: Pick<WalletSigner, "signTransaction">;
}

const TXN_DROPDOWN_OPTIONS: {id: PeraTransactionType; title: string}[] = [
  {id: "pay", title: "pay"},
  {id: "axfer", title: "axfer"},
  {id: "keyreg", title: "keyreg"},
  {id: "acfg", title: "acfg"},
  {id: "afrz", title: "afrz"}
];

const ASSET_TXN_TABS: {id: AssetTransactionType; label: string}[] = [
  {id: "create", label: "Create"},
  {id: "modify", label: "Modify"},
  {id: "destroy", label: "Destroy"}
];

/** Used to name fields in the "fix these before continuing" summary, so a
 *  disabled Create button is never unexplained. */
const FIELD_LABELS: Partial<Record<keyof TxnForm, string>> = {
  address: "From Address",
  toAddress: "To Address",
  amount: "Amount",
  note: "Note",
  assetIndex: "Asset Index",
  rekeyTo: "Rekey To",
  closeTo: "Close To",
  transactionAmount: "Transaction Amount",
  voteKey: "Vote Key",
  selectionKey: "Selection Key",
  stateProofKey: "State Proof Key",
  voteFirst: "Vote First",
  voteLast: "Vote Last",
  voteKeyDilution: "Vote Key Dilution",
  unitName: "Unit Name",
  assetName: "Asset Name",
  manager: "Manager",
  reserve: "Reserve",
  freeze: "Freeze",
  clawback: "Clawback",
  assetURL: "Asset URL",
  total: "Total",
  decimals: "Decimals",
  freezeTarget: "Freeze Target"
};

const numberOrUndefined = (raw: string): number | undefined =>
  raw.trim() === "" ? undefined : Number(raw);

const CreateTxn = ({chain, address, isOpen, onClose, wallet}: CreateTxnModalProps) => {
  const [transactions, setTransactions] = useState<SignerTransaction[]>([]);
  const [txnType, setTxnType] = useState<PeraTransactionType>("pay");
  const [assetTabIndex, setAssetTabIndex] = useState(0);
  const [formState, setFormState] = useState<TxnForm>(() => emptyTxnForm(address));
  const [touched, setTouched] = useState<Set<keyof TxnForm>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [sendBlockchain, setSendBlockchain] = useState(false);
  const {display: displayToast} = usePeraToast();

  // The dialog mounts with Home, before a wallet is connected, so the sender
  // captured by the initial state is empty. Track the prop instead of seeding
  // from it once, which also keeps the form in step with account switching.
  useEffect(() => {
    setFormState((current) =>
      current.address === address ? current : {...current, address}
    );
  }, [address]);

  const errors = useMemo(
    () => validateTxnForm(formState, txnType),
    [formState, txnType]
  );
  const invalidFields = Object.keys(errors) as (keyof TxnForm)[];
  const isFormValid = invalidFields.length === 0;
  const shownErrors = visibleErrors(errors, touched, submitAttempted);

  const setField = <K extends keyof TxnForm>(key: K, value: TxnForm[K]) => {
    setFormState((current) => ({...current, [key]: value}));
  };

  const markTouched = (key: keyof TxnForm) => {
    setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
  };

  const fieldProps = (key: keyof TxnForm) => {
    const message = shownErrors[key];

    return {
      error: Boolean(message),
      helperText: message,
      onBlur: () => markTouched(key),
      fullWidth: true,
      size: "small" as const
    };
  };

  const textField = (key: keyof TxnForm & string, label: string) => (
    <TextField
      label={label}
      value={(formState[key] as string | undefined) ?? ""}
      onChange={(e) => setField(key, e.target.value as TxnForm[typeof key])}
      {...fieldProps(key)}
    />
  );

  const renderAcfgCreateForm = () => (
    <>
      {textField("unitName", "Unit Name")}
      {textField("assetName", "Asset Name")}
      {textField("manager", "Manager (optional)")}
      {textField("reserve", "Reserve (optional)")}
      {textField("freeze", "Freeze (optional)")}
      {textField("clawback", "Clawback (optional)")}
      {textField("assetURL", "Asset URL (optional)")}
      {textField("total", "Total (base units)")}

      <TextField
        label={"Decimals"}
        value={formState.decimals ?? ""}
        type={"number"}
        slotProps={{htmlInput: {min: 0, max: ASA_MAX_DECIMALS}}}
        onChange={(e) => setField("decimals", numberOrUndefined(e.target.value))}
        {...fieldProps("decimals")}
      />

      <FormControlLabel
        control={
          <Switch
            checked={formState.defaultFrozen || false}
            onChange={(_e, checked) => setField("defaultFrozen", checked)}
          />
        }
        label={"Default Frozen"}
      />
    </>
  );

  const renderAcfgModifyForm = () => (
    <>
      {textField("assetIndex", "Asset Index")}
      {textField("manager", "Manager (optional)")}
      {textField("reserve", "Reserve (optional)")}
      {textField("freeze", "Freeze (optional)")}
      {textField("clawback", "Clawback (optional)")}
    </>
  );

  const renderAcfgDestroyForm = () => textField("assetIndex", "Asset Index");

  const handleAssetTabChange = (index: number) => {
    setAssetTabIndex(index);
    setField("assetTxnType", ASSET_TXN_TABS[index].id);
  };

  const handleSetTransactions = (newTxns: SignerTransaction[]) => {
    setTransactions([...transactions, ...newTxns]);
  };

  /** Built transactions accumulate until they are signed, and a cancelled or
   *  rejected signature leaves them queued. This is the only way to drop them
   *  without reloading the page. */
  const clearTransactions = () => {
    setTransactions([]);
  };

  const handleGroupTxn = () => {
    try {
      const transactionChunks = separateIntoChunks(
        transactions,
        TRANSACTION_IN_GROUP_LIMIT
      );

      for (const transactionChunk of transactionChunks) {
        algosdk.assignGroupID(transactionChunk.map((toSign) => toSign.txn));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const signTxn = async () => {
    try {
      if (transactions.length === 0) {
        return;
      }

      const signedTransactions = await wallet.signTransaction([transactions]);

      console.log({signedTransactions});

      if (!sendBlockchain) {
        displayToast({
          message: `Signed ${transactions.length} transaction(s)`,
          severity: "success"
        });
        return;
      }

      for (const signedTransaction of signedTransactions) {
        await clientForChain(chain).sendRawTransaction(signedTransaction).do();
        await algosdk.waitForConfirmation(
          clientForChain(chain),
          transactions[0].txn.txID(),
          ALGORAND_DEFAULT_TXN_WAIT_ROUNDS
        );
      }

      displayToast({
        message: `Sent ${transactions.length} transaction(s) to the network`,
        severity: "success"
      });
    } catch (error) {
      // A cancelled signature lands here too, so say something rather than
      // leaving the queue sitting there with no explanation.
      console.log(error);
      displayToast({
        message: `${error instanceof Error ? error.message : error}`,
        severity: "error"
      });
    }
  };

  /** Clears everything the user typed while keeping the sender and the
   *  currently selected asset sub-type. */
  const resetForm = () => {
    setFormState((current) => ({
      ...emptyTxnForm(current.address),
      assetTxnType: current.assetTxnType
    }));
    setTouched(new Set());
    setSubmitAttempted(false);
  };

  const renderForm = () => {
    switch (txnType) {
      case "pay":
        return (
          <>
            {textField("toAddress", "To Address")}
            {textField("amount", "Amount (in microAlgos)")}
            {textField("rekeyTo", "Rekey To (optional)")}
            {textField("closeTo", "Close To (optional)")}

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setField("note", e.target.value)}
              multiline={true}
              minRows={3}
              {...fieldProps("note")}
            />
          </>
        );

      case "axfer":
        return (
          <>
            {textField("toAddress", "To Address")}
            {formState.transactionAmount <= 1 && textField("assetIndex", "Asset Index")}
            {textField("amount", "Amount (in base units)")}
            {textField("rekeyTo", "Rekey To (optional)")}
            {textField("closeTo", "Close To (optional)")}

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setField("note", e.target.value)}
              multiline={true}
              minRows={3}
              {...fieldProps("note")}
            />

            <TextField
              label={"Transaction Amount"}
              value={formState.transactionAmount}
              type={"number"}
              slotProps={{htmlInput: {min: 1}}}
              onChange={(e) =>
                setField("transactionAmount", numberOrUndefined(e.target.value) ?? 0)
              }
              {...fieldProps("transactionAmount")}
            />

            {formState.transactionAmount > 1 && (
              <Alert severity={"info"}>
                {
                  "Bulk mode builds one 0-amount opt-in per asset, using asset IDs from the Pera API. The Asset Index and Amount fields are ignored."
                }
              </Alert>
            )}
          </>
        );

      case "keyreg":
        return (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={formState.isOnlineKeyregTxn || false}
                  onChange={(_e, checked) => setField("isOnlineKeyregTxn", checked)}
                />
              }
              label={`${
                formState.isOnlineKeyregTxn ? "Online" : "Offline"
              } Keyreg Transaction`}
            />

            {textField("rekeyTo", "Rekey To (optional)")}

            {formState.isOnlineKeyregTxn && (
              <>
                {textField("voteKey", "Vote Key (base64, 32 bytes)")}
                {textField("selectionKey", "Selection Key (base64, 32 bytes)")}
                {textField("stateProofKey", "State Proof Key (base64, 64 bytes)")}

                <TextField
                  label={"Vote First"}
                  value={formState.voteFirst ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setField("voteFirst", numberOrUndefined(e.target.value))
                  }
                  {...fieldProps("voteFirst")}
                />

                <TextField
                  label={"Vote Last"}
                  value={formState.voteLast ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setField("voteLast", numberOrUndefined(e.target.value))
                  }
                  {...fieldProps("voteLast")}
                />

                <TextField
                  label={"Vote Key Dilution"}
                  value={formState.voteKeyDilution ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setField("voteKeyDilution", numberOrUndefined(e.target.value))
                  }
                  {...fieldProps("voteKeyDilution")}
                />
              </>
            )}
          </>
        );

      case "acfg":
        return (
          <Box>
            <Box sx={{borderBottom: 1, borderColor: "divider", mb: 2}}>
              <Tabs
                value={assetTabIndex}
                onChange={(_e, index) => handleAssetTabChange(index)}>
                {ASSET_TXN_TABS.map((tab) => (
                  <Tab key={tab.id} label={tab.label} />
                ))}
              </Tabs>
            </Box>

            {ASSET_TXN_TABS.map((tab, index) => (
              <Box
                key={tab.id}
                hidden={assetTabIndex !== index}
                sx={{display: "flex", flexDirection: "column", gap: 2}}>
                {tab.id === "create" && renderAcfgCreateForm()}
                {tab.id === "modify" && renderAcfgModifyForm()}
                {tab.id === "destroy" && renderAcfgDestroyForm()}
              </Box>
            ))}
          </Box>
        );

      case "afrz":
        return (
          <>
            {textField("assetIndex", "Asset Index")}
            {textField("freezeTarget", "Freeze Target")}

            <FormControlLabel
              control={
                <Switch
                  checked={formState.frozen || false}
                  onChange={(_e, checked) => setField("frozen", checked)}
                />
              }
              label={formState.frozen ? "Freeze (true)" : "Unfreeze (false)"}
            />

            {textField("rekeyTo", "Rekey To (optional)")}

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setField("note", e.target.value)}
              multiline={true}
              minRows={3}
              {...fieldProps("note")}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true} maxWidth={"md"}>
      <DialogTitle sx={{display: "flex", alignItems: "center"}}>
        <Box sx={{flexGrow: 1}}>{"Create Transaction"}</Box>
        <IconButton onClick={onClose} aria-label={"close"}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{display: "flex", flexDirection: "column", gap: 2, pt: 1}}>
          <TextField
            select={true}
            label={"Transaction Type"}
            value={txnType}
            onChange={(e) => {
              setTxnType(e.target.value as PeraTransactionType);
              setTouched(new Set());
              setSubmitAttempted(false);
            }}
            fullWidth={true}
            size={"small"}>
            {TXN_DROPDOWN_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={"From Address"}
            value={formState.address}
            disabled={true}
            error={Boolean(errors.address)}
            helperText={errors.address}
            fullWidth={true}
            size={"small"}
          />

          {renderForm()}

          <FormControlLabel
            control={
              <Switch
                checked={sendBlockchain}
                onChange={(_e, checked) => setSendBlockchain(checked)}
              />
            }
            label={"Send Blockchain"}
          />

          {transactions.length > 0 && (
            <Box
              sx={{
                borderTop: 1,
                borderColor: "divider",
                pt: 1
              }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1
                }}>
                <Typography variant={"subtitle2"} sx={{flexGrow: 1}}>
                  {`Pending Transactions (${transactions.length})`}
                </Typography>
                <Button size={"small"} color={"error"} onClick={clearTransactions}>
                  {"Clear"}
                </Button>
              </Box>
              <List dense={true}>
                {transactions.map((item, index) => (
                  <ListItem key={index} disablePadding={true}>
                    <ListItemText primary={`Txn ${index + 1} type: ${item.txn.type}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{flexDirection: "column", alignItems: "stretch", gap: 1, p: 2}}>
        {submitAttempted && !isFormValid && (
          <Typography variant={"caption"} color={"error"}>
            {`Fix before continuing: ${invalidFields
              .map((field) => FIELD_LABELS[field] ?? field)
              .join(", ")}`}
          </Typography>
        )}

        <CreateTxnButton
          txnForm={formState}
          type={txnType}
          chain={chain}
          isFormValid={isFormValid}
          onInvalidSubmit={() => {
            setSubmitAttempted(true);
            setTouched(new Set(invalidFields));
          }}
          onResetForm={resetForm}
          onSetTransactions={handleSetTransactions}
        />

        <Button
          onClick={handleGroupTxn}
          variant={"contained"}
          fullWidth={true}
          disabled={transactions.length === 0}>
          {"Create Group Txn with created transactions"}
        </Button>

        <Button
          onClick={signTxn}
          variant={"contained"}
          fullWidth={true}
          disabled={transactions.length === 0}>
          {`Sign ${transactions.length} Transactions`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTxn;
