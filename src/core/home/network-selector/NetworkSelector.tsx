import {useState} from "react";
import {Box, Button, Divider, Menu, MenuItem, Typography} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

import {ChainType} from "../../utils/algod/algod";
import {
  getCustomNetworkSettings,
  getNetworkConfig,
  NETWORK_ORDER,
  setCustomNetworkSettings,
  type CustomNetworkSettings
} from "../../utils/algod/networks";
import {clearCustomNetworkOwnedAssets} from "../../../scenarios/owned-asset";
import CustomNetworkDialog from "./CustomNetworkDialog";

interface NetworkSelectorProps {
  chain: ChainType;
  onChange: (chain: ChainType) => void;
}

const NetworkSelector = ({chain, onChange}: NetworkSelectorProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isDialogOpen, setDialogOpenState] = useState(false);
  const config = getNetworkConfig(chain);
  const presets = NETWORK_ORDER.filter((id) => id !== ChainType.Custom);

  const handleSelect = (selected: ChainType) => {
    setAnchor(null);

    if (selected === ChainType.Custom) {
      setDialogOpenState(true);
      return;
    }

    onChange(selected);
  };

  const handleSave = (settings: CustomNetworkSettings) => {
    const previous = getCustomNetworkSettings();
    const endpointChanged =
      previous.baseServer !== settings.baseServer ||
      String(previous.port) !== String(settings.port) ||
      previous.token !== settings.token;

    // A different node means any asset created on the previous one is gone.
    if (endpointChanged) {
      clearCustomNetworkOwnedAssets();
    }
    setCustomNetworkSettings(settings);
    setDialogOpenState(false);
    onChange(ChainType.Custom);
  };

  const hostCaption = config.algod.port
    ? `${config.algod.baseServer}:${config.algod.port}`
    : config.algod.baseServer;

  return (
    <>
      <Button
        color={"inherit"}
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        aria-label={`Select network, currently ${config.label}`}
        title={hostCaption}
        sx={{px: {xs: 1, sm: 1.5}, textTransform: "none"}}>
        <Box sx={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
          <Typography variant={"body2"} sx={{fontWeight: 600, lineHeight: 1.2}}>
            {config.label}
          </Typography>
          <Typography
            variant={"caption"}
            sx={{
              opacity: 0.7,
              lineHeight: 1.2,
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            {hostCaption}
          </Typography>
        </Box>
      </Button>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {presets.map((id) => (
          <MenuItem key={id} selected={id === chain} onClick={() => handleSelect(id)}>
            {getNetworkConfig(id).label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          selected={chain === ChainType.Custom}
          onClick={() => handleSelect(ChainType.Custom)}>
          {"Custom…"}
        </MenuItem>
      </Menu>

      {isDialogOpen && (
        <CustomNetworkDialog
          isOpen={isDialogOpen}
          onClose={() => setDialogOpenState(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default NetworkSelector;
