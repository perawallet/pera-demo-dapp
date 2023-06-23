import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";

import "./_create-txn.scss";

import {SignerTransaction} from "@perawallet/connect/dist/util/model/peraWalletModels";
import algosdk from "algosdk";
import {
  Button,
  Dropdown,
  DropdownOption,
  FormField,
  Input,
  List,
  ListItem,
  Textarea
} from "@hipo/react-ui-toolkit";
import {useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect";

import Modal from "../../../component/modal/Modal";
import {ChainType} from "../../../utils/algod/algod";
import CreateTxnButton from "./button/CreateTxnButton";

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
}

function CreateTxn({chain, address, isOpen, onClose, peraWallet}: CreateTxnModalProps) {
  const [transactions, setTransactions] = useState<SignerTransaction[]>([]);
  const [transactionDropdownOption, setTransactionDropdownOption] =
    useState<DropdownOption<"pay" | "axfer", any> | null>({
      id: "pay",
      title: "pay"
    });
  const [formState, setFormState] = useState<TxnForm>({
    address,
    toAddress: "",
    amount: "",
    note: "",
    assetIndex: "",
    rekeyTo: "",
    closeTo: "",
    transactionAmount: 1
  });

  return (
    <Modal
      customClassName={"create-txn"}
      contentLabel={"Create Txn Modal"}
      isOpen={isOpen}
      onClose={onClose}>
      <CloseIcon onClick={onClose} className={"modal__close"} width={24} height={24} />

      <h3 style={{marginBottom: "10px"}}>{"Create Transaction"}</h3>

      <FormField label={"Transaction Type"}>
        <Dropdown
          customClassName={"app__header__chain-select-dropdown"}
          role={"menu"}
          options={[
            {
              id: "pay",
              title: "pay"
            },
            {
              id: "axfer",
              title: "axfer"
            }
          ]}
          selectedOption={transactionDropdownOption}
          onSelect={(option) => {
            setTransactionDropdownOption(option);
          }}
          hasDeselectOption={false}
        />
      </FormField>

      <FormField label={"From Address"}>
        <Input
          value={address}
          name={"from"}
          isDisabled={true}
          onChange={() => console.log("a")}
        />
      </FormField>

      {renderForm()}

      <FormField label={"Transaction Amount (optional)"}>
        <Input
          value={formState.transactionAmount}
          name={"transactionAmount"}
          type={"number"}
          onChange={(e) =>
            setFormState({...formState, transactionAmount: Number(e.currentTarget.value)})
          }
        />
      </FormField>

      {transactions.length > 0 && (
        <List items={transactions}>
          {(item, _a, index) => (
            <ListItem>{`Txn ${(index || 0) + 1} type: ${item.txn.type}`}</ListItem>
          )}
        </List>
      )}

      <CreateTxnButton
        txnForm={formState}
        type={transactionDropdownOption!.id}
        chain={chain}
        onResetForm={resetForm}
        onSetTransactions={handleSetTransactions}
      />

      <Button
        onClick={handleGroupTxn}
        customClassName={
          "create-txn__cta"
        }>{`Create Group Txn with created transactions`}</Button>

      <Button
        onClick={signTxn}
        customClassName={
          "create-txn__cta"
        }>{`Sign ${transactions.length} Transactions`}</Button>
    </Modal>
  );

  function renderForm() {
    switch (transactionDropdownOption?.id) {
      case "pay":
        return (
          <>
            <FormField label={"To Address"}>
              <Input
                value={formState.toAddress}
                name={"to"}
                onChange={(e) =>
                  setFormState({...formState, toAddress: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Amount (on microAlgos)"}>
              <Input
                value={formState.amount}
                name={"amount"}
                onChange={(e) =>
                  setFormState({...formState, amount: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Rekey To"}>
              <Input
                value={formState.rekeyTo}
                name={"rekeyto"}
                onChange={(e) =>
                  setFormState({...formState, rekeyTo: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Close To"}>
              <Input
                value={formState.closeTo}
                name={"closeTo"}
                onChange={(e) =>
                  setFormState({...formState, closeTo: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Note"}>
              <Textarea
                value={formState.note}
                name={"note"}
                onChange={(e) =>
                  setFormState({...formState, note: e.currentTarget.value})
                }
              />
            </FormField>
          </>
        );

      case "axfer":
        return (
          <>
            <FormField label={"To Address"}>
              <Input
                value={formState.toAddress}
                name={"to"}
                onChange={(e) =>
                  setFormState({...formState, toAddress: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Asset Index"}>
              <Input
                value={formState.assetIndex}
                name={"assetIndex"}
                onChange={(e) =>
                  setFormState({...formState, assetIndex: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Amount (on microAlgos)"}>
              <Input
                value={formState.amount}
                name={"amount"}
                onChange={(e) =>
                  setFormState({...formState, amount: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Rekey To"}>
              <Input
                value={formState.rekeyTo}
                name={"rekeyto"}
                onChange={(e) =>
                  setFormState({...formState, rekeyTo: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Close To"}>
              <Input
                value={formState.closeTo}
                name={"closeTo"}
                onChange={(e) =>
                  setFormState({...formState, closeTo: e.currentTarget.value})
                }
              />
            </FormField>

            <FormField label={"Note"}>
              <Textarea
                value={formState.note}
                name={"note"}
                onChange={(e) =>
                  setFormState({...formState, note: e.currentTarget.value})
                }
              />
            </FormField>
          </>
        );
      default:
        return null;
    }
  }

  function handleSetTransactions(newTxns: SignerTransaction[]) {
    setTransactions([...transactions, ...newTxns]);
  }

  function handleGroupTxn() {
    try {
      algosdk.assignGroupID(transactions.map((toSign) => toSign.txn));
    } catch (error) {
      console.log(error);
    }
  }

  async function signTxn() {
    try {
      if (transactions.length === 0) {
        return;
      }

      const signedTransactions = await peraWallet.signTransaction([transactions]);

      console.log({signedTransactions});
    } catch (error) {
      console.log(error);
    }
  }

  function resetForm() {
    setFormState({
      ...formState,
      toAddress: "",
      amount: "",
      note: "",
      assetIndex: "",
      rekeyTo: "",
      closeTo: "",
      transactionAmount: 1
    });
  }
}

export default CreateTxn;
