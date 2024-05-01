import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";
import * as arc60Schema from "../arc-60/arc60-schema.json";
import "./_create-arbitrary-data.scss";

import {PeraWalletConnect} from "@perawallet/connect-beta";
import {Button, FormField, Input, List, Select, useToaster} from "@hipo/react-ui-toolkit";
import {canonicalize} from 'json-canonicalize'
import {useState} from "react";
import ReactJson from 'react-json-view';
import Ajv, {JSONSchemaType} from 'ajv';

import Modal from "../../../component/modal/Modal";
import {ARC60SchemaType} from "../arc-60/arc60Types";
import PeraToast from "../../../component/toast/PeraToast";

const ajv = new Ajv();
const forbiddenDomains = ["TX", "TG"];
const allowedDomains = [{id: "arc60", title: "ARC-60"}, {id: "perawallet", title: "PeraWallet"}];
const scopes = [{id: "msgsig", title: "MSGSIG"}, {id: "lsig", title: "LSIG"}];

interface CreateArbitraryDataProps {
  address: string;
  isOpen: boolean;
  onClose: VoidFunction;
  peraWallet: PeraWalletConnect;
}

function CreateArbitraryData({
  address,
  isOpen,
  onClose,
  peraWallet
}: CreateArbitraryDataProps) {
  const {display: displayToast} = useToaster();
  const [formState, setFormState] = useState({
    arc60Domain: allowedDomains[0],
    bytes: "",
    metadata: {
      scope: scopes[0],
      message: "",
      schema: canonicalize(arc60Schema),
    }
  });

  return (
    <Modal
      customClassName={"create-arbitrary-data"}
      contentLabel={"Create Arbitrary Modal"}
      isOpen={isOpen}
      onClose={onClose}>
      <CloseIcon onClick={onClose} className={"modal__close"} width={24} height={24} />

      <h3 style={{marginBottom: "30px"}}>{"Create and Sign Arbitrary Data in ARC-60 Standard"}</h3>

      <div className={"create-arbitrary-data-body"}>
        <form>
          <FormField label={"ARC60 Domain"}>
            <Select
              role={"menu"}
              options={allowedDomains}
              customClassName={"app__header__chain-select-dropdown"}
              onSelect={(option) => setFormState({...formState, arc60Domain: option!})}
              value={formState.arc60Domain}>
              <Select.Trigger>
                {formState.arc60Domain.title}
              </Select.Trigger>

              <Select.Content>
                <List items={allowedDomains}>
                  {(option) => (
                    <Select.Item option={option} as={"li"}>
                      {option.title}
                    </Select.Item>
                  )}
                </List>
              </Select.Content>
            </Select>
          </FormField>

          <FormField label={"Scope"}>
            <Select
              role={"menu"}
              options={scopes}
              customClassName={"app__header__chain-select-dropdown"}
              onSelect={(option) => setFormState({...formState, metadata: {...formState.metadata, scope: option!}})}
              value={formState.metadata.scope}>
              <Select.Trigger>
                {formState.metadata.scope.title}
              </Select.Trigger>

              <Select.Content>
                <List items={scopes}>
                  {(option) => (
                    <Select.Item option={option} as={"li"}>
                      {option.title}
                    </Select.Item>
                  )}
                </List>
              </Select.Content>
            </Select>
          </FormField>

          <FormField label={"Bytes (string)"}>
            <Input
              value={formState.bytes}
              name={"bytes"}
              onChange={(e) => setFormState({...formState, bytes: e.currentTarget.value})}
            />
          </FormField>


          <FormField label={"Message (string)"}>
            <Input
              value={formState.metadata.message}
              name={"message"}
              onChange={(e) => setFormState({...formState, metadata: {...formState.metadata, message: e.currentTarget.value}})}
            />
          </FormField>
        </form>

        <div>
          <h5>{"Arbitrary Data"}</h5>

          <ReactJson src={{
            ...formState,
            arc60domain: formState.arc60Domain.id,
            metadata: {
              ...formState.metadata,
              scope: formState.metadata.scope.id
            }
          }} name={null} />
        </div>
      </div>


      <Button
        onClick={handleSignDataClick}
        customClassName={
          "create-txn__cta"
        }>{`Sign arbitrary data`}
      </Button>
    </Modal>
  );

  async function handleSignDataClick() {
    try {
      await signData();

      handleSetLog("Arbitrary data signed successfully.")
    } catch (e) {
      handleSetLog("Arbitrary data signing failed. Please check your input.")
    }
  }

  function signData() {
    const data = {
      ARC60Domain: formState.arc60Domain.id,
      bytes: formState.bytes,
    }

    const parsedSchema: JSONSchemaType<ARC60SchemaType> = JSON.parse(formState.metadata.schema)
    const parsedData = JSON.parse(canonicalize(data))

    // Check for forbidden domain separators
    if (forbiddenDomains.includes(parsedData.ARC60Domain)) {
      throw new Error('Invalid input')
    }

    // Check domain separator consistency
    if (formState.metadata.scope.title === "MSGSIG" && !(allowedDomains.find((domain) => domain.id === parsedData.ARC60Domain))) {
      throw new Error('Invalid input')
    }

    // Validate the schema
    const validate = ajv.compile<ARC60SchemaType>(parsedSchema)
    const isValid = validate(parsedData)

    if (!isValid) {
      throw new Error('Invalid input')
    }

    // bytes cannot be a transaction
    // eslint-disable-next-line no-magic-numbers
    const tag = Buffer.from(parsedData.bytes.slice(0, 2)).toString();

    if (forbiddenDomains.includes(tag)) {
      throw new Error('Invalid input')
    }

    const signArbitraryData = new Uint8Array(Buffer.from(parsedData.ARC60Domain + parsedData.bytes));
    // const signatureBytes = nacl.sign(signArbitraryData, keypair.secretKey)

    const signatureBytes = peraWallet.signData(signArbitraryData, address, formState.metadata.message);

    return Promise.resolve(signatureBytes)

  }

  function handleSetLog(log: string) {
    displayToast({
      timeout: 10000,
      render() {
        return <PeraToast message={log} />;
      }
    });
  }
}

export default CreateArbitraryData;