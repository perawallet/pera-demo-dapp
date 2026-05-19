import {useState} from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {QRCodeSVG} from "qrcode.react";

import AlgoTransferForm from "./forms/AlgoTransferForm";
import AssetTransferForm from "./forms/AssetTransferForm";
import AssetOptInForm from "./forms/AssetOptInForm";
import KeyregForm from "./forms/KeyregForm";
import AssetQueryForm from "./forms/AssetQueryForm";
import AppQueryForm from "./forms/AppQueryForm";
import type {UriNetwork} from "./builders";

interface UriGeneratorProps {
  isOpen: boolean;
  onClose: VoidFunction;
}

const TABS = [
  {id: "algo", label: "ALGO Transfer"},
  {id: "axfer", label: "Asset Transfer"},
  {id: "optin", label: "Asset Opt-In"},
  {id: "keyreg", label: "Keyreg"},
  {id: "asset-q", label: "Asset Query"},
  {id: "app-q", label: "App Query"}
] as const;

const UriGenerator = ({isOpen, onClose}: UriGeneratorProps) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [useNetPrefix, setUseNetPrefix] = useState(false);
  const [network, setNetwork] = useState<UriNetwork | undefined>(undefined);
  const [uri, setUri] = useState("");

  const effectiveNetwork: UriNetwork | undefined = useNetPrefix
    ? network ?? "testnet"
    : undefined;

  const copy = async () => {
    if (!uri) return;
    await navigator.clipboard.writeText(uri);
  };

  const handleTabChange = (_e: React.SyntheticEvent, index: number) => {
    setActiveTabIndex(index);
    setUri("");
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={true} maxWidth={"md"}>
      <DialogTitle sx={{display: "flex", alignItems: "center"}}>
        <Box sx={{flexGrow: 1}}>{"URI Generator (ARC-90)"}</Box>
        <IconButton onClick={onClose} aria-label={"close"}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{borderBottom: 1, borderColor: "divider"}}>
          <Tabs
            value={activeTabIndex}
            onChange={handleTabChange}
            variant={"scrollable"}
            scrollButtons={"auto"}>
            {TABS.map((tab) => (
              <Tab key={tab.id} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {TABS.map((tab, index) => (
          <Box key={tab.id} hidden={activeTabIndex !== index} sx={{py: 2}}>
            {tab.id === "algo" && (
              <AlgoTransferFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
            {tab.id === "axfer" && (
              <AssetTransferFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
            {tab.id === "optin" && (
              <AssetOptInFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
            {tab.id === "keyreg" && (
              <KeyregFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
            {tab.id === "asset-q" && (
              <AssetQueryFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
            {tab.id === "app-q" && (
              <AppQueryFormWrapper network={effectiveNetwork} onUri={setUri} />
            )}
          </Box>
        ))}

        <Box sx={{display: "flex", alignItems: "center", gap: 2, my: 2}}>
          <FormControlLabel
            control={
              <Switch
                checked={useNetPrefix}
                onChange={(e) => setUseNetPrefix(e.target.checked)}
              />
            }
            label={"Include network prefix"}
          />
          {useNetPrefix && (
            <Select
              size={"small"}
              value={network ?? "testnet"}
              onChange={(e) => setNetwork(e.target.value as UriNetwork)}>
              <MenuItem value={"testnet"}>{"testnet"}</MenuItem>
              <MenuItem value={"mainnet"}>{"mainnet"}</MenuItem>
              <MenuItem value={"betanet"}>{"betanet"}</MenuItem>
            </Select>
          )}
        </Box>

        {uri && (
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: 1,
              borderColor: "divider"
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
                flexWrap: "wrap"
              }}>
              <Typography
                component={"code"}
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  fontSize: 12,
                  wordBreak: "break-all"
                }}>
                {uri}
              </Typography>
              <Button onClick={copy} variant={"contained"} size={"small"}>
                {"Copy"}
              </Button>
              <Button
                component={"a"}
                href={uri}
                variant={"outlined"}
                size={"small"}>
                {"Open"}
              </Button>
            </Box>
            <QRCodeSVG value={uri} size={240} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AlgoTransferFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({
    address: "",
    amount: "",
    note: "",
    xnote: "",
    label: ""
  });

  return (
    <AlgoTransferForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

const AssetTransferFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({
    address: "",
    assetId: "",
    amount: "",
    note: "",
    xnote: "",
    label: ""
  });

  return (
    <AssetTransferForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

const AssetOptInFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({address: "", assetId: ""});

  return (
    <AssetOptInForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

const KeyregFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({
    address: "",
    votekey: "",
    selkey: "",
    sprfkey: "",
    votefst: "",
    votelst: "",
    votekd: "",
    fee: "",
    note: "",
    xnote: ""
  });

  return (
    <KeyregForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

const AssetQueryFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({assetId: ""});

  return (
    <AssetQueryForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

const AppQueryFormWrapper = ({
  network,
  onUri
}: {
  network?: UriNetwork;
  onUri: (u: string) => void;
}) => {
  const [values, setValues] = useState({appId: ""});

  return (
    <AppQueryForm
      values={values}
      network={network}
      onChange={setValues}
      onUriChange={onUri}
    />
  );
};

export default UriGenerator;
