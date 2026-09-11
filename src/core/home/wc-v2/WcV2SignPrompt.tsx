import {Button, Snackbar} from "@mui/material";

import {PERA_WC_DEEPLINK_SCHEME} from "../../utils/pera-wallet/transport/v2/V2Transport";

interface WcV2SignPromptProps {
  open: boolean;
}

/** Shown on touch devices while a v2 request is pending, so the tester can
 *  jump to the wallet the way the v1 SDK's redirect modal does. */
const WcV2SignPrompt = ({open}: WcV2SignPromptProps) => (
  <Snackbar
    open={open}
    anchorOrigin={{vertical: "bottom", horizontal: "center"}}
    message={"Approve the request in Pera Wallet"}
    action={
      <Button color={"inherit"} size={"small"} href={PERA_WC_DEEPLINK_SCHEME}>
        {"Open Pera Wallet"}
      </Button>
    }
  />
);

export default WcV2SignPrompt;
