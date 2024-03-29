import {ReactComponent as CloseIcon} from "../../../ui/icon/close.svg";
import * as arc60Schema from "../arc-60/arc60-schema.json";
import "./_create-arbitrary-data.scss";

import {PeraWalletConnect} from "@perawallet/connect";
import {Button, Dropdown, FormField, Input} from "@hipo/react-ui-toolkit";
import {canonicalize} from 'json-canonicalize'
import {useState} from "react";
import ReactJson from 'react-json-view';
import Ajv, {JSONSchemaType} from 'ajv';

import Modal from "../../../component/modal/Modal";
import {ARC60SchemaType} from "../arc-60/arc60Types";

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
            <Dropdown
              customClassName={"app__header__chain-select-dropdown"}
              role={"menu"}
              options={allowedDomains}
              selectedOption={formState.arc60Domain}
              onSelect={(option) => setFormState({...formState, arc60Domain: option!})}
              hasDeselectOption={false}
            />
          </FormField>

          <FormField label={"Scope"}>
            <Dropdown
              customClassName={"app__header__chain-select-dropdown"}
              role={"menu"}
              options={scopes}
              selectedOption={formState.metadata.scope}
              onSelect={(option) => setFormState({...formState, metadata: {...formState.metadata, scope: option!}})}
              hasDeselectOption={false}
            />
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
        onClick={signData}
        customClassName={
          "create-txn__cta"
        }>{`Sign arbitrary data`}
      </Button>
    </Modal>
  );

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

    const signatureBytes = peraWallet.signData(signArbitraryData, formState.metadata.message, address);

    return Promise.resolve(signatureBytes)

  }
}

export default CreateArbitraryData;