import {Box, TextField} from "@mui/material";

import {buildAlgoTransferUri, type UriNetwork} from "../builders";

interface AlgoTransferFormProps {
  values: {
    address: string;
    amount: string;
    note: string;
    xnote: string;
    label: string;
  };
  network?: UriNetwork;
  onChange: (next: AlgoTransferFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const AlgoTransferForm = ({
  values,
  network,
  onChange,
  onUriChange
}: AlgoTransferFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);
    onUriChange(
      next.address
        ? buildAlgoTransferUri({
            address: next.address,
            amount: next.amount || undefined,
            note: next.note || undefined,
            xnote: next.xnote || undefined,
            label: next.label || undefined,
            network
          })
        : ""
    );
  };

  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
      <TextField
        label={"Address (required)"}
        name={"address"}
        value={values.address}
        onChange={(e) => set("address", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Amount (µAlgo)"}
        name={"amount"}
        value={values.amount}
        onChange={(e) => set("amount", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Note"}
        name={"note"}
        value={values.note}
        onChange={(e) => set("note", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"xnote (encrypted note)"}
        name={"xnote"}
        value={values.xnote}
        onChange={(e) => set("xnote", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Label"}
        name={"label"}
        value={values.label}
        onChange={(e) => set("label", e.target.value)}
        size={"small"}
        fullWidth={true}
      />
    </Box>
  );
};

export default AlgoTransferForm;
