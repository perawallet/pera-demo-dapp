import {Box, TextField} from "@mui/material";

import {buildAppQueryUri, type UriNetwork} from "../builders";

interface AppQueryFormProps {
  values: {
    appId: string;
  };
  network?: UriNetwork;
  onChange: (next: AppQueryFormProps["values"]) => void;
  onUriChange: (uri: string) => void;
}

const AppQueryForm = ({
  values,
  network,
  onChange,
  onUriChange
}: AppQueryFormProps) => {
  const set = <K extends keyof typeof values>(key: K, v: string) => {
    const next = {...values, [key]: v};

    onChange(next);
    onUriChange(next.appId ? buildAppQueryUri({appId: next.appId, network}) : "");
  };

  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
      <TextField
        label={"App ID (required)"}
        name={"appId"}
        value={values.appId}
        onChange={(e) => set("appId", e.target.value)}
        size={"small"}
        fullWidth={true}
      />
    </Box>
  );
};

export default AppQueryForm;
