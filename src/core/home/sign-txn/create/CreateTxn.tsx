import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";

import "./_create-txn.scss";

import algosdk, {isValidAddress} from "algosdk";
import {
  Button,
  Dropdown,
  DropdownOption,
  FormField,
  Input,
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

      <Button
        onClick={
          signTxn
        }>{`Create ${transactionDropdownOption?.title} Transaction`}</Button>
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

            <FormField label={"Amount"}>
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

            <FormField label={"Amount"}>
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

  async function createPayTransaction() {
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

    return txn;
  }

  async function createAxferTransaction() {
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

    return txn;
  }

  async function signTxn() {
    try {
      if (!transactionDropdownOption) return;

      if (transactionDropdownOption.id === "pay") {
        const payTxn = await createPayTransaction();

        const signedTransactions = await peraWallet.signTransaction([[{txn: payTxn}]]);

        console.log(signedTransactions);
      } else if (transactionDropdownOption.id === "axfer") {
        const axferTxn = await createAxferTransaction();

        const signedTransactions = await peraWallet.signTransaction([[{txn: axferTxn}]]);

        console.log(signedTransactions);
      }
    } catch (error) {
      console.log(error);
    }
  }
}

export default CreateTxn;
