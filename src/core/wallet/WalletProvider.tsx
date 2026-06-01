import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import peraWallet from "../utils/pera-wallet/PeraWalletManager";
import type { CommsProtocol, WalletConnector } from "./types";
import { PeraConnectConnector } from "./PeraConnectConnector";
import { LiquidAuthConnector } from "../liquid-auth/LiquidAuthConnector";
import { LiquidAuthClient, type QrInfo } from "../liquid-auth/LiquidAuthClient";
import { getCommsProtocol, setCommsProtocol, getLiquidAuthUrl } from "./walletStorage";

interface WalletContextValue {
  protocol: CommsProtocol;
  connector: WalletConnector;
  isInWebview: boolean;
  qrInfo: QrInfo | null;
  setQrInfo: (info: QrInfo | null) => void;
  switchProtocol: (protocol: CommsProtocol) => Promise<void>;
  /** Register a callback invoked when the wallet ends the session. */
  setOnDisconnect: (cb: () => void) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export const useWallet = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [protocol, setProtocol] = useState<CommsProtocol>(getCommsProtocol);
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);

  // Wallet-initiated disconnects route through this listener so consumers
  // (Home) can clear their connected-account state.
  const disconnectListener = useRef<() => void>(() => {});
  const setOnDisconnect = useCallback((cb: () => void) => {
    disconnectListener.current = cb;
  }, []);

  const peraConnector = useRef<PeraConnectConnector>(
    new PeraConnectConnector(peraWallet as never, async () => {
      disconnectListener.current();
    })
  );
  const liquidConnector = useRef<LiquidAuthConnector | null>(null);

  const buildLiquidConnector = useCallback((): LiquidAuthConnector => {
    const client = new LiquidAuthClient(getLiquidAuthUrl());
    const connector = new LiquidAuthConnector(client);
    connector.onQr((info) => setQrInfo(info));
    return connector;
  }, []);

  const connector: WalletConnector = useMemo(() => {
    if (protocol === "liquid-auth") {
      if (!liquidConnector.current) liquidConnector.current = buildLiquidConnector();
      return liquidConnector.current;
    }
    return peraConnector.current;
  }, [protocol, buildLiquidConnector]);

  const switchProtocol = useCallback(
    async (next: CommsProtocol) => {
      if (next === protocol) return;
      try {
        await connector.disconnect();
      } catch {
        /* ignore */
      }
      if (protocol === "liquid-auth") liquidConnector.current = null;
      setQrInfo(null);
      setCommsProtocol(next);
      setProtocol(next);
    },
    [protocol, connector]
  );

  const isInWebview = Boolean((peraWallet as unknown as { isInWebview?: boolean }).isInWebview);

  const value = useMemo(
    () => ({ protocol, connector, isInWebview, qrInfo, setQrInfo, switchProtocol, setOnDisconnect }),
    [protocol, connector, isInWebview, qrInfo, switchProtocol, setOnDisconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};
