// src/core/liquid-auth/QrConnectModal.tsx
import { Dialog, DialogTitle, DialogContent, Typography, Box } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import type { QrInfo } from "./LiquidAuthClient";

interface QrConnectModalProps {
  qrInfo: QrInfo | null;
  onClose: () => void;
}

const QrConnectModal = ({ qrInfo, onClose }: QrConnectModalProps) => (
  <Dialog open={Boolean(qrInfo)} onClose={onClose} maxWidth={"xs"} fullWidth={true}>
    <DialogTitle>{"Connect with Liquid Auth"}</DialogTitle>
    <DialogContent>
      <Box sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 2}}>
        {qrInfo ? <QRCodeSVG value={qrInfo.deepLink} size={256} /> : null}
        <Typography variant={"body2"} color={"text.secondary"} sx={{textAlign: "center"}}>
          {"Scan with the Pera wallet to authenticate. Keep this open until the wallet connects."}
        </Typography>
        {qrInfo ? (
          <Typography variant={"caption"} sx={{wordBreak: "break-all"}}>
            {`Request ID: ${qrInfo.requestId}`}
          </Typography>
        ) : null}
      </Box>
    </DialogContent>
  </Dialog>
);

export default QrConnectModal;
