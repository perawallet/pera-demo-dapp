import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import {Alert, Snackbar} from "@mui/material";
import type {AlertColor} from "@mui/material";

export interface PeraToastOptions {
  message: React.ReactNode;
  severity?: AlertColor;
  timeout?: number;
}

export interface ToastHistoryEntry {
  id: number;
  message: React.ReactNode;
  severity: AlertColor;
  timestamp: number;
}

interface PeraToastContextValue {
  display: (options: PeraToastOptions) => void;
  history: ToastHistoryEntry[];
  clearHistory: () => void;
}

const DEFAULT_TIMEOUT = 6000;
const HISTORY_LIMIT = 200;

const PeraToastContext = createContext<PeraToastContextValue | undefined>(undefined);

interface ToastState extends PeraToastOptions {
  id: number;
  open: boolean;
}

export const PeraToastProvider = ({children}: {children: React.ReactNode}) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [history, setHistory] = useState<ToastHistoryEntry[]>([]);

  const display = useCallback((options: PeraToastOptions) => {
    const now = Date.now();

    setToast({
      id: now,
      open: true,
      severity: "info",
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      ...options
    });

    const entry: ToastHistoryEntry = {
      id: now,
      message: options.message,
      severity: options.severity ?? "info",
      timestamp: now
    };

    setHistory((prev) => {
      const next = [...prev, entry];

      return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const handleClose = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === "clickaway") return;
      setToast((prev) => (prev ? {...prev, open: false} : prev));
    },
    []
  );

  const value = useMemo<PeraToastContextValue>(
    () => ({display, history, clearHistory}),
    [display, history, clearHistory]
  );

  return (
    <PeraToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.id}
        open={toast?.open ?? false}
        autoHideDuration={toast?.timeout ?? DEFAULT_TIMEOUT}
        onClose={handleClose}
        anchorOrigin={{vertical: "bottom", horizontal: "right"}}>
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? "info"}
          variant={"filled"}
          sx={{width: "100%"}}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </PeraToastContext.Provider>
  );
};

export const usePeraToast = (): PeraToastContextValue => {
  const ctx = useContext(PeraToastContext);

  if (!ctx) {
    throw new Error("usePeraToast must be used within a PeraToastProvider");
  }

  return ctx;
};
