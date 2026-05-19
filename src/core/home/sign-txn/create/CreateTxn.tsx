/* eslint-disable max-lines */
import algosdk from "algosdk";
import {useState} from "react";
import type {SignerTransaction} from "@perawallet/connect";
import {PeraWalletConnect} from "@perawallet/connect";
import {
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
import {separateIntoChunks} from "../../../utils/array/arrayUtils";
import {
  ALGORAND_DEFAULT_TXN_WAIT_ROUNDS,
  TRANSACTION_IN_GROUP_LIMIT
} from "../../../transaction/transactionConstants";
import {
  AssetTransactionType,
  PeraTransactionType
} from "../../../transaction/transactionTypes";

interface CreateTxnModalProps {
  chain: ChainType;
  address: string;
  isOpen: boolean;
  onClose: VoidFunction;
  peraWallet: PeraWalletConnect;
}

export interface TxnForm {
  address: string;
  toAddress: string;
  amount: string;
  note: string;
  assetIndex: string;
  rekeyTo: string;
  closeTo: string;
  transactionAmount: number;

  // keyreg
  voteKey?: string;
  selectionKey?: string;
  stateProofKey?: string;
  voteFirst?: number;
  voteLast?: number;
  voteKeyDilution?: number;
  isOnlineKeyregTxn?: boolean;

  // acfg
  assetTxnType?: AssetTransactionType;
  unitName?: string;
  assetName?: string;
  defaultFrozen?: boolean;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  assetURL?: string;
  total?: number;
  decimals?: number;

  // afrz
  freezeTarget?: string;
  frozen?: boolean;
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

const CreateTxn = ({chain, address, isOpen, onClose, peraWallet}: CreateTxnModalProps) => {
  const [transactions, setTransactions] = useState<SignerTransaction[]>([]);
  const [txnType, setTxnType] = useState<PeraTransactionType>("pay");
  const [assetTabIndex, setAssetTabIndex] = useState(0);
  const [formState, setFormState] = useState<TxnForm>({
    address,
    toAddress: "",
    amount: "",
    note: "",
    assetIndex: "",
    rekeyTo: "",
    closeTo: "",
    transactionAmount: 1,
    assetTxnType: "create"
  });
  const [sendBlockchain, setSendBlockchain] = useState(false);

  const renderAcfgCreateForm = () => {
    return (
      <>
        <TextField
          label={"Unit Name"}
          value={formState.unitName || ""}
          onChange={(e) => setFormState({...formState, unitName: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Asset Name"}
          value={formState.assetName || ""}
          onChange={(e) => setFormState({...formState, assetName: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Manager"}
          value={formState.manager || ""}
          onChange={(e) => setFormState({...formState, manager: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Reserve"}
          value={formState.reserve || ""}
          onChange={(e) => setFormState({...formState, reserve: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Freeze"}
          value={formState.freeze || ""}
          onChange={(e) => setFormState({...formState, freeze: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Clawback"}
          value={formState.clawback || ""}
          onChange={(e) => setFormState({...formState, clawback: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Asset URL"}
          value={formState.assetURL || ""}
          onChange={(e) => setFormState({...formState, assetURL: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Total"}
          value={formState.total ?? ""}
          type={"number"}
          onChange={(e) =>
            setFormState({...formState, total: Number(e.target.value)})
          }
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Decimal"}
          value={formState.decimals ?? ""}
          type={"number"}
          onChange={(e) =>
            setFormState({...formState, decimals: Number(e.target.value)})
          }
          fullWidth={true}
          size={"small"}
        />

        <FormControlLabel
          control={
            <Switch
              checked={formState.defaultFrozen || false}
              onChange={(_e, checked) =>
                setFormState({...formState, defaultFrozen: checked})
              }
            />
          }
          label={"Default Frozen"}
        />
      </>
    );
  };

  const renderAcfgModifyForm = () => {
    return (
      <>
        <TextField
          label={"Asset Index"}
          value={formState.assetIndex}
          type={"number"}
          onChange={(e) =>
            setFormState({...formState, assetIndex: e.target.value})
          }
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Manager"}
          value={formState.manager || ""}
          onChange={(e) => setFormState({...formState, manager: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Reserve"}
          value={formState.reserve || ""}
          onChange={(e) => setFormState({...formState, reserve: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Freeze"}
          value={formState.freeze || ""}
          onChange={(e) => setFormState({...formState, freeze: e.target.value})}
          fullWidth={true}
          size={"small"}
        />

        <TextField
          label={"Clawback"}
          value={formState.clawback || ""}
          onChange={(e) => setFormState({...formState, clawback: e.target.value})}
          fullWidth={true}
          size={"small"}
        />
      </>
    );
  };

  const renderAcfgDestroyForm = () => {
    return (
      <TextField
        label={"Asset Index"}
        value={formState.assetIndex}
        type={"number"}
        onChange={(e) => setFormState({...formState, assetIndex: e.target.value})}
        fullWidth={true}
        size={"small"}
      />
    );
  };

  const handleAssetTabChange = (index: number) => {
    let txnType: AssetTransactionType = "create";

    if (index === 0) txnType = "create";
    else if (index === 1) txnType = "modify";
    else txnType = "destroy";

    setAssetTabIndex(index);
    setFormState({...formState, assetTxnType: txnType});
  };

  const handleSetTransactions = (newTxns: SignerTransaction[]) => {
    setTransactions([...transactions, ...newTxns]);
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

      const signedTransactions = await peraWallet.signTransaction([transactions]);

      console.log({signedTransactions});

      if (sendBlockchain) {
        for (const signedTransaction of signedTransactions) {
          await clientForChain(chain).sendRawTransaction(signedTransaction).do();
          await algosdk.waitForConfirmation(
            clientForChain(chain),
            transactions[0].txn.txID(),
            ALGORAND_DEFAULT_TXN_WAIT_ROUNDS
          );
        }

        console.log("Transactions sent to blockchain");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const resetForm = () => {
    setFormState({
      ...formState,
      toAddress: "",
      amount: "",
      note: "",
      assetIndex: "",
      rekeyTo: "",
      closeTo: "",
      transactionAmount: 1,
      freezeTarget: "",
      frozen: false
    });
  };

  const renderForm = () => {
    switch (txnType) {
      case "pay":
        return (
          <>
            <TextField
              label={"To Address"}
              value={formState.toAddress}
              onChange={(e) =>
                setFormState({...formState, toAddress: e.target.value})
              }
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Amount (on microAlgos)"}
              value={formState.amount}
              onChange={(e) => setFormState({...formState, amount: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Rekey To"}
              value={formState.rekeyTo}
              onChange={(e) => setFormState({...formState, rekeyTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Close To"}
              value={formState.closeTo}
              onChange={(e) => setFormState({...formState, closeTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setFormState({...formState, note: e.target.value})}
              fullWidth={true}
              size={"small"}
              multiline={true}
              minRows={3}
            />
          </>
        );

      case "axfer":
        return (
          <>
            <TextField
              label={"To Address"}
              value={formState.toAddress}
              onChange={(e) =>
                setFormState({...formState, toAddress: e.target.value})
              }
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Asset Index"}
              value={formState.assetIndex}
              onChange={(e) =>
                setFormState({...formState, assetIndex: e.target.value})
              }
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Amount (on microAlgos)"}
              value={formState.amount}
              onChange={(e) => setFormState({...formState, amount: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Rekey To"}
              value={formState.rekeyTo}
              onChange={(e) => setFormState({...formState, rekeyTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Close To"}
              value={formState.closeTo}
              onChange={(e) => setFormState({...formState, closeTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setFormState({...formState, note: e.target.value})}
              fullWidth={true}
              size={"small"}
              multiline={true}
              minRows={3}
            />

            <TextField
              label={"Transaction Amount (optional)"}
              value={formState.transactionAmount}
              type={"number"}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  transactionAmount: Number(e.target.value)
                })
              }
              fullWidth={true}
              size={"small"}
            />
          </>
        );

      case "keyreg":
        return (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={formState.isOnlineKeyregTxn || false}
                  onChange={(_e, checked) =>
                    setFormState({...formState, isOnlineKeyregTxn: checked})
                  }
                />
              }
              label={`${
                formState.isOnlineKeyregTxn ? "Online" : "Offline"
              } Keyreg Transaction`}
            />

            <TextField
              label={"Rekey To (optional)"}
              value={formState.rekeyTo}
              onChange={(e) => setFormState({...formState, rekeyTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            {formState.isOnlineKeyregTxn && (
              <>
                <TextField
                  label={"Vote Key"}
                  value={formState.voteKey || ""}
                  onChange={(e) =>
                    setFormState({...formState, voteKey: e.target.value})
                  }
                  fullWidth={true}
                  size={"small"}
                />

                <TextField
                  label={"Selection Key"}
                  value={formState.selectionKey || ""}
                  onChange={(e) =>
                    setFormState({...formState, selectionKey: e.target.value})
                  }
                  fullWidth={true}
                  size={"small"}
                />

                <TextField
                  label={"State Proof Key"}
                  value={formState.stateProofKey || ""}
                  onChange={(e) =>
                    setFormState({...formState, stateProofKey: e.target.value})
                  }
                  fullWidth={true}
                  size={"small"}
                />

                <TextField
                  label={"Vote First"}
                  value={formState.voteFirst ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      voteFirst: Number(e.target.value)
                    })
                  }
                  fullWidth={true}
                  size={"small"}
                />

                <TextField
                  label={"Vote Last"}
                  value={formState.voteLast ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      voteLast: Number(e.target.value)
                    })
                  }
                  fullWidth={true}
                  size={"small"}
                />

                <TextField
                  label={"Vote Key Dilution"}
                  value={formState.voteKeyDilution ?? ""}
                  type={"number"}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      voteKeyDilution: Number(e.target.value)
                    })
                  }
                  fullWidth={true}
                  size={"small"}
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
            <TextField
              label={"Asset Index"}
              value={formState.assetIndex}
              onChange={(e) =>
                setFormState({...formState, assetIndex: e.target.value})
              }
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Freeze Target"}
              value={formState.freezeTarget || ""}
              onChange={(e) =>
                setFormState({...formState, freezeTarget: e.target.value})
              }
              fullWidth={true}
              size={"small"}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formState.frozen || false}
                  onChange={(_e, checked) =>
                    setFormState({...formState, frozen: checked})
                  }
                />
              }
              label={formState.frozen ? "Freeze (true)" : "Unfreeze (false)"}
            />

            <TextField
              label={"Rekey To (optional)"}
              value={formState.rekeyTo}
              onChange={(e) => setFormState({...formState, rekeyTo: e.target.value})}
              fullWidth={true}
              size={"small"}
            />

            <TextField
              label={"Note"}
              value={formState.note}
              onChange={(e) => setFormState({...formState, note: e.target.value})}
              fullWidth={true}
              size={"small"}
              multiline={true}
              minRows={3}
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
            onChange={(e) => setTxnType(e.target.value as PeraTransactionType)}
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
            value={address}
            disabled={true}
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
              <Typography variant={"subtitle2"} sx={{mb: 1}}>
                {"Pending Transactions"}
              </Typography>
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
        <CreateTxnButton
          txnForm={formState}
          type={txnType}
          chain={chain}
          onResetForm={resetForm}
          onSetTransactions={handleSetTransactions}
        />

        <Button onClick={handleGroupTxn} variant={"contained"} fullWidth={true}>
          {"Create Group Txn with created transactions"}
        </Button>

        <Button onClick={signTxn} variant={"contained"} fullWidth={true}>
          {`Sign ${transactions.length} Transactions`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTxn;
