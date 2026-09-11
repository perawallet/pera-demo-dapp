import {useState} from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {QRCodeSVG} from "qrcode.react";

import {pairingDeepLink} from "../../utils/pera-wallet/transport/v2/V2Transport";

interface WcV2PairingDialogProps {
  uri: string | null;
  onClose: () => void;
}

const QR_SIZE = 240;
const COPY_FEEDBACK_TIMEOUT_MS = 1500;

const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;

const WcV2PairingDialog = ({uri, onClose}: WcV2PairingDialogProps) => {
  const [isCopied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT_MS);
    } catch {
      // Clipboard can be unavailable over http; the QR code still works.
    }
  };

  return (
    <Dialog open={Boolean(uri)} onClose={onClose} maxWidth={"xs"} fullWidth={true}>
      <DialogTitle sx={{display: "flex", alignItems: "center"}}>
        <Box sx={{flexGrow: 1}}>{"Connect with WalletConnect v2"}</Box>
        <IconButton onClick={onClose} aria-label={"close"}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 2}}>
        <Typography variant={"body2"} sx={{color: "text.secondary", textAlign: "center"}}>
          {"Scan with Pera Wallet, or open the app on this device."}
        </Typography>
        {uri && (
          <Box sx={{p: 2, bgcolor: "#fff", borderRadius: 2}}>
            <QRCodeSVG value={uri} size={QR_SIZE} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{justifyContent: "center", pb: 2, gap: 1}}>
        <Button onClick={handleCopy} variant={"outlined"}>
          {isCopied ? "Copied" : "Copy link"}
        </Button>
        {uri && isTouchDevice() && (
          <Button href={pairingDeepLink(uri)} variant={"contained"}>
            {"Open Pera Wallet"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WcV2PairingDialog;
