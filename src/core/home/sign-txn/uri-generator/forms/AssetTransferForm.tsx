import {Box, TextField} from "@mui/material";

import {buildAssetTransferUri, type UriNetwork} from "../builders";

interface AssetTransferFormProps {
  values: {
    address: string;
    assetId: string;
    amount: string;
    note: string;
    xnote: string;
    label: string;
  };
  network?: UriNetwork;
  onChange: (next: AssetTransferFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const AssetTransferForm = ({
  values,
  network,
  onChange,
  onUriChange
}: AssetTransferFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);

    const isComplete = Boolean(next.address && next.assetId && next.amount);

    onUriChange(
      isComplete
        ? buildAssetTransferUri({
            address: next.address,
            assetId: next.assetId,
            amount: next.amount,
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
        label={"Asset ID (required)"}
        name={"assetId"}
        value={values.assetId}
        onChange={(e) => set("assetId", e.target.value)}
        size={"small"}
        fullWidth={true}
      />

      <TextField
        label={"Amount (required)"}
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

export default AssetTransferForm;
