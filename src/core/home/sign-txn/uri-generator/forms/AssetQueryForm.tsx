import {Box, TextField} from "@mui/material";

import {buildAssetQueryUri, type UriNetwork} from "../builders";

interface AssetQueryFormProps {
  values: {
    assetId: string;
  };
  network?: UriNetwork;
  onChange: (next: AssetQueryFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const AssetQueryForm = ({
  values,
  network,
  onChange,
  onUriChange
}: AssetQueryFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);
    onUriChange(
      next.assetId ? buildAssetQueryUri({assetId: next.assetId, network}) : ""
    );
  };

  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
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

export default AssetQueryForm;
