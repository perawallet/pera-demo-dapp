import {useCallback, useEffect, useRef, useState} from "react";

import type {PairingUi} from "../../utils/pera-wallet/transport/WalletTransport";
import type {Wallet} from "../../utils/pera-wallet/wallet";

/** Registers a `PairingUi` with the wallet and exposes the state the
 *  dialog and prompt render from. Mount once, in Home. */
export const useWcPairingUi = (wallet: Pick<Wallet, "setPairingUi">) => {
  const [pairingUri, setPairingUri] = useState<string | null>(null);
  const [signPromptCount, setSignPromptCount] = useState(0);
  const onClosedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const ui: PairingUi = {
      openPairing: (uri, onClosed) => {
        onClosedRef.current = onClosed;
        setPairingUri(uri);
      },
      closePairing: () => {
        onClosedRef.current = null;
        setPairingUri(null);
      },
      showSignPrompt: () => {
        setSignPromptCount((n) => n + 1);
        return () => setSignPromptCount((n) => Math.max(0, n - 1));
      }
    };
    wallet.setPairingUi(ui);
  }, [wallet]);

  /** The user dismissed the dialog: tell the transport, then hide it. */
  const closePairing = useCallback(() => {
    onClosedRef.current?.();
    onClosedRef.current = null;
    setPairingUri(null);
  }, []);

  return {pairingUri, closePairing, isSignPromptOpen: signPromptCount > 0};
};
