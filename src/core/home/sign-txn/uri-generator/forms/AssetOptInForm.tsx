import {Box, TextField} from "@mui/material";

import {buildAssetOptInUri, type UriNetwork} from "../builders";

interface AssetOptInFormProps {
  values: {
    address: string;
    assetId: string;
  };
  network?: UriNetwork;
  onChange: (next: AssetOptInFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const AssetOptInForm = ({
  values,
  network,
  onChange,
  onUriChange
}: AssetOptInFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);

    const isComplete = Boolean(next.address && next.assetId);

    onUriChange(
      isComplete
        ? buildAssetOptInUri({
            address: next.address,
            assetId: next.assetId,
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
    </Box>
  );
};

export default AssetOptInForm;
