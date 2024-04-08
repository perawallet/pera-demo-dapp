/* eslint-disable max-lines */
// import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";

import "./_create-txn.scss";

import {SignerTransaction} from "@perawallet/connect/dist/util/model/peraWalletModels";
import algosdk from "algosdk";
import {
  Button,
  Select,
  FormField,
  Input,
  List,
  ListItem,
  Switch,
  Tab,
  TabItem,
  Textarea
} from "@hipo/react-ui-toolkit";
import {useState} from "react";
import {PeraWalletConnect} from "@perawallet/connect";

import Modal from "../../../component/modal/Modal";
import {ChainType, clientForChain} from "../../../utils/algod/algod";
import CreateTxnButton from "./button/CreateTxnButton";
import {separateIntoChunks} from "../../../utils/array/arrayUtils";
import {ALGORAND_DEFAULT_TXN_WAIT_ROUNDS, TRANSACTION_IN_GROUP_LIMIT} from "../../../transaction/transactionConstants";
import {AssetTransactionType, PeraTransactionType} from "../../../transaction/transactionTypes";

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
}

const TXN_DROPDOWN_OPTIONS = [
  {
    id: "pay",
    title: "pay"
  },
  {
    id: "axfer",
    title: "axfer"
  },
  {
    id: "keyreg",
    title: "keyreg"
  },
  {
    id: "acfg",
    title: "acfg"
  }
];

const ASSET_TXN_TABS: TabItem[] = [
  {id: "create", content: "Create"},
  {id: "modify", content: "Modify"},
  {id: "destroy", content: "Destroy"}
]

function CreateTxn({chain, address, isOpen, onClose, peraWallet}: CreateTxnModalProps) {
  const [transactions, setTransactions] = useState<SignerTransaction[]>([]);
  const [transactionDropdownOption, setTransactionDropdownOption] =
    useState<{
      id: string;
      title: string;
    } | null>({
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
    transactionAmount: 1,
    assetTxnType: "create"
  });
  const [sendBlockchain, setSendBlockchain] = useState(false);

  return (
    <Modal
      customClassName={"create-txn"}
      contentLabel={"Create Txn Modal"}
      isOpen={isOpen}
      onClose={onClose}>
      {/* <CloseIcon onClick={onClose} className={"modal__close"} width={24} height={24} /> */}

      <h3 style={{marginBottom: "10px"}}>{"Create Transaction"}</h3>

      <FormField label={"Transaction Type"}>
        <Select
          role={"listbox"}
          options={TXN_DROPDOWN_OPTIONS}
          onSelect={(option) => {
            setTransactionDropdownOption(option);
          }}
          value={transactionDropdownOption}>
            <Select.Trigger>
              {transactionDropdownOption?.title}
            </Select.Trigger>
          </Select>

        {/* <Dropdown
          customClassName={"app__header__chain-select-dropdown"}
          role={"menu"}
          options={TXN_DROPDOWN_OPTIONS}
          selectedOption={transactionDropdownOption}
          
          hasDeselectOption={false}
        /> */}
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

      <FormField label={"Send Blockchain"}>
        <Switch onToggle={handleSendBlockchain} isToggledOn={sendBlockchain} />
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
        type={transactionDropdownOption!.id as PeraTransactionType}
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
          </>
        );

      case "keyreg":
        return (
          <>
            <FormField label={`${formState.isOnlineKeyregTxn ? "Online" : "Offline"} Keyreg Transaction`}>
              <Switch isToggledOn={formState.isOnlineKeyregTxn || false} onToggle={() => setFormState({...formState, isOnlineKeyregTxn: !formState.isOnlineKeyregTxn})} />
            </FormField>

            <FormField label={"Rekey To (optional)"}>
              <Input
                value={formState.rekeyTo}
                name={"rekeyto"}
                onChange={(e) =>
                  setFormState({...formState, rekeyTo: e.currentTarget.value})
                }
              />
            </FormField>

            {formState.isOnlineKeyregTxn && (
              <>
                <FormField label={"Vote Key"}>
                  <Input
                    value={formState.voteKey}
                    name={"voteKey"}
                    onChange={(e) =>
                      setFormState({...formState, voteKey: e.currentTarget.value})
                    }
                  />
                </FormField>

                <FormField label={"Selection Key"}>
                  <Input
                    value={formState.selectionKey}
                    name={"selectionKey"}
                    onChange={(e) =>
                      setFormState({...formState, selectionKey: e.currentTarget.value})
                    }
                  />
                </FormField>

                <FormField label={"State Proof Key"}>
                  <Input
                    value={formState.stateProofKey}
                    name={"stateProofKey"}
                    onChange={(e) =>
                      setFormState({...formState, stateProofKey: e.currentTarget.value})
                    }
                  />
                </FormField>

                <FormField label={"Vote First"}>
                  <Input
                    value={formState.voteFirst}
                    name={"voteFirst"}
                    type={"number"}
                    onChange={(e) =>
                      setFormState({...formState, voteFirst: Number(e.currentTarget.value)})
                    }
                  />
                </FormField>

                <FormField label={"Vote Last"}>
                  <Input
                    value={formState.voteLast}
                    name={"voteLast"}
                    type={"number"}
                    onChange={(e) =>
                      setFormState({...formState, voteLast: Number(e.currentTarget.value)})
                    }
                  />
                </FormField>

                <FormField label={"Vote Key Dilution"}>
                  <Input
                    value={formState.voteKeyDilution}
                    name={"voteKeyDilution"}
                    type={"number"}
                    onChange={(e) =>
                      setFormState({...formState, voteKeyDilution: Number(e.currentTarget.value)})
                    }
                  />
                </FormField>
              </>
            )}
          </>
        );

      case "acfg":
        return (
          <>
            <Tab items={ASSET_TXN_TABS} initialActiveTabIndex={0} customClassName={"create-txn__asset-tab"} onTabChange={handleAssetTabChange}>
              {getAssetTransactionForms()}
            </Tab>
          </>
        )

      default:
        return null;
    }
  }

  function handleAssetTabChange(index: number) {
    let txnType: AssetTransactionType = "create";

    if (index === 0) txnType = "create";
    else if (index === 1) txnType = "modify";
    else txnType = "destroy";

    setFormState({...formState, assetTxnType: txnType})
  }

  function getAssetTransactionForms() {
    const create = (
      <>
        <FormField label={"Unit Name"}>
          <Input
            value={formState.unitName}
            name={"unit"}
            onChange={(e) =>
              setFormState({...formState, unitName: e.currentTarget.value})
            }
          />
        </FormField>

        <FormField label={"Asset Name"}>
          <Input
            value={formState.assetName}
            name={"asset-name"}
            onChange={(e) =>
              setFormState({...formState, assetName: e.currentTarget.value})
            }
          />
        </FormField>

        <FormField label={"Manager"}>
          <Input
            value={formState.manager}
            name={"manager"}
            onChange={(e) =>
              setFormState({...formState, manager: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Reserve"}>
          <Input
            value={formState.reserve}
            name={"reserve"}
            onChange={(e) =>
              setFormState({...formState, reserve: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Freeze"}>
          <Input
            value={formState.freeze}
            name={"freeze"}
            onChange={(e) =>
              setFormState({...formState, freeze: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Clawback"}>
          <Input
            value={formState.clawback}
            name={"clawback"}
            onChange={(e) =>
              setFormState({...formState, clawback: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Asset URL"}>
          <Input
            value={formState.assetURL}
            name={"asset-url"}
            onChange={(e) =>
              setFormState({...formState, assetURL: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Total"}>
          <Input
            value={formState.total}
            type={"number"}
            name={"total"}
            onChange={(e) =>
              setFormState({...formState, total: Number(e.currentTarget.value)})
            }
          />
        </FormField>


        <FormField label={"Decimal"}>
          <Input
            value={formState.decimals}
            type={"number"}
            name={"decimals"}
            onChange={(e) =>
              setFormState({...formState, decimals: Number(e.currentTarget.value)})
            }
          />
        </FormField>

        <FormField label={"Default Frozen"}>
          <Switch isToggledOn={formState.defaultFrozen || false} onToggle={() => setFormState({...formState, defaultFrozen: !formState.defaultFrozen})} />
        </FormField>
      </>
    );

    const modify = (
      <>
        <FormField label={"Asset Index"}>
          <Input
            value={formState.assetIndex}
            name={"asset-index"}
            type={"number"}
            onChange={(e) =>
              setFormState({...formState, assetIndex: e.currentTarget.value})
            }
          />
        </FormField>

        <FormField label={"Manager"}>
          <Input
            value={formState.manager}
            name={"manager"}
            onChange={(e) =>
              setFormState({...formState, manager: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Reserve"}>
          <Input
            value={formState.reserve}
            name={"reserve"}
            onChange={(e) =>
              setFormState({...formState, reserve: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Freeze"}>
          <Input
            value={formState.freeze}
            name={"freeze"}
            onChange={(e) =>
              setFormState({...formState, freeze: e.currentTarget.value})
            }
          />
        </FormField>


        <FormField label={"Clawback"}>
          <Input
            value={formState.clawback}
            name={"clawback"}
            onChange={(e) =>
              setFormState({...formState, clawback: e.currentTarget.value})
            }
          />
        </FormField>
      </>
    );

    const destroy = (
      <>
        <FormField label={"Asset Index"}>
          <Input
            value={formState.assetIndex}
            name={"asset-index"}
            type={"number"}
            onChange={(e) =>
              setFormState({...formState, assetIndex: e.currentTarget.value})
            }
          />
        </FormField>
      </>
    );

    return [create, modify, destroy];
  }

  function handleSetTransactions(newTxns: SignerTransaction[]) {
    setTransactions([...transactions, ...newTxns]);
  }

  function handleGroupTxn() {
    try {
      const transactionChunks = separateIntoChunks(transactions, TRANSACTION_IN_GROUP_LIMIT);

      for (const transactionChunk of transactionChunks) {
        algosdk.assignGroupID(transactionChunk.map((toSign) => toSign.txn));
      }
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

      if (sendBlockchain) {
        for (const signedTransaction of signedTransactions) {
          await clientForChain(chain).sendRawTransaction(signedTransaction).do();
  
          await algosdk.waitForConfirmation(
            clientForChain(chain),
            transactions[0].txn.txID(),
            ALGORAND_DEFAULT_TXN_WAIT_ROUNDS
          );
        }

        console.log("Transactions sent to blockchain")
      }
    } catch (error) {
      console.log(error);
    }
  }

  function handleSendBlockchain() {
    setSendBlockchain(!sendBlockchain);
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
