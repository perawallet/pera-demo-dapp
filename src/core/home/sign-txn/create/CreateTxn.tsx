import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";

import "./_create-txn.scss";

import {SignerTransaction} from "@perawallet/connect/dist/util/model/peraWalletModels";
import algosdk, {isValidAddress} from "algosdk";
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
import {apiGetTxnParams, ChainType} from "../../../utils/algod/algod";

interface CreateTxnModalProps {
  chain: ChainType;
  address: string;
  isOpen: boolean;
  onClose: VoidFunction;
  peraWallet: PeraWalletConnect;
}

function CreateTxn({chain, address, isOpen, onClose, peraWallet}: CreateTxnModalProps) {
  const [transactions, setTransactions] = useState<SignerTransaction[]>([]);
  const [transactionDropdownOption, setTransactionDropdownOption] =
    useState<DropdownOption<"pay" | "axfer", any> | null>({
      id: "pay",
      title: "pay"
    });
  const [toAddress, setToAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [assetIndex, setAssetIndex] = useState<string>("");
  const [rekeyTo, setRekeyTo] = useState<string>("");
  const [closeTo, setCloseTo] = useState<string>("");

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

      {transactions.length > 0 && (
        <List items={transactions}>
          {(item, _a, index) => (
            <ListItem>{`Txn ${(index || 0) + 1} type: ${item.txn.type}`}</ListItem>
          )}
        </List>
      )}

      <Button
        onClick={handleCreateTransaction}
        customClassName={
          "create-txn__cta"
        }>{`Create ${transactionDropdownOption?.title} Transaction`}</Button>

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
                value={toAddress}
                name={"to"}
                onChange={(e) => setToAddress(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Amount (on microAlgos)"}>
              <Input
                value={amount}
                name={"amount"}
                onChange={(e) => setAmount(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Rekey To"}>
              <Input
                value={rekeyTo}
                name={"rekeyto"}
                onChange={(e) => setRekeyTo(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Close To"}>
              <Input
                value={closeTo}
                name={"closeTo"}
                onChange={(e) => setCloseTo(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Note"}>
              <Textarea
                value={note}
                name={"note"}
                onChange={(e) => setNote(e.currentTarget.value)}
              />
            </FormField>
          </>
        );

      case "axfer":
        return (
          <>
            <FormField label={"To Address"}>
              <Input
                value={toAddress}
                name={"to"}
                onChange={(e) => setToAddress(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Asset Index"}>
              <Input
                value={assetIndex}
                name={"assetIndex"}
                onChange={(e) => setAssetIndex(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Amount (on microAlgos)"}>
              <Input
                value={amount}
                name={"amount"}
                onChange={(e) => setAmount(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Rekey To"}>
              <Input
                value={rekeyTo}
                name={"rekeyto"}
                onChange={(e) => setRekeyTo(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Close To"}>
              <Input
                value={closeTo}
                name={"closeTo"}
                onChange={(e) => setCloseTo(e.currentTarget.value)}
              />
            </FormField>

            <FormField label={"Note"}>
              <Textarea
                value={note}
                name={"note"}
                onChange={(e) => setNote(e.currentTarget.value)}
              />
            </FormField>
          </>
        );
      default:
        return null;
    }
  }

  function handleGroupTxn() {
    try {
      algosdk.assignGroupID(transactions.map((toSign) => toSign.txn));
    } catch (error) {
      console.log(error);
    }
  }

  async function handleCreateTransaction() {
    if (transactionDropdownOption?.id === "pay") {
      await createPayTransaction();
    } else if (transactionDropdownOption?.id === "axfer") {
      await createAxferTransaction();
    }

    resetForm();
  }

  async function createPayTransaction() {
    try {
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

      setTransactions([...transactions, {txn}]);
    } catch (error) {
      console.log(error);
    }
  }

  async function createAxferTransaction() {
    try {
      const suggestedParams = await apiGetTxnParams(chain);

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: address,
        to: toAddress,
        amount: 0,
        assetIndex: Number(assetIndex),
        note: new Uint8Array(Buffer.from("example note value")),
        rekeyTo: isValidAddress(rekeyTo) ? rekeyTo : undefined,
        closeRemainderTo: isValidAddress(closeTo) ? closeTo : undefined,
        suggestedParams
      });

      setTransactions([...transactions, {txn}]);
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

      console.log(signedTransactions);
    } catch (error) {
      console.log(error);
    }
  }

  function resetForm() {
    setToAddress("");
    setAmount("");
    setRekeyTo("");
    setCloseTo("");
    setNote("");
    setAssetIndex("");
  }
}

export default CreateTxn;
