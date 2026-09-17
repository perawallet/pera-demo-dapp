import {PeraWalletConnect} from "@perawallet/connect";
import {ChainType} from "../algod/algod";
import {getNetworkConfig, type AlgorandChainId} from "../algod/networks";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/pera-wallet/peraWalletTypes";

interface PeraConnectEventHandlers {
  onDisconnect: () => Promise<void>;
}

/** The network the user last selected. Falls back to TestNet when absent or
 *  unrecognised, so a stale or hand-edited value cannot wedge the app. */
const getPersistedNetwork = (): ChainType => {
  const stored = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.SELECTED_NETWORK);

  return Object.values(ChainType).includes(stored as ChainType)
    ? (stored as ChainType)
    : ChainType.TestNet;
};

const persistNetwork = (chain: ChainType): void => {
  localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.SELECTED_NETWORK, chain);
};

/** Whether the connect modal should offer (and pre-select) the Pera browser
 *  extension when `window.pera` is present. Defaults to enabled — matching the
 *  SDK's own default — so only an explicit opt-out turns it off. */
const getPersistedPreferExtension = (): boolean =>
  localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.PREFER_EXTENSION) !== "false";

const persistPreferExtension = (shouldPrefer: boolean): void => {
  localStorage.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.PREFER_EXTENSION,
    String(shouldPrefer)
  );
};

interface PeraWalletConfig {
  compactMode?: boolean;
  chainId: AlgorandChainId;
  singleAccount?: boolean;
  /** Whether the connect modal lists "Connect with Pera Extension" first when
   *  the extension's `window.pera` provider is present. Passed through to the
   *  PeraWalletConnect constructor, which defaults it to `true`. */
  shouldPreferExtension?: boolean;
}

class PeraWalletManager extends PeraWalletConnect {
  private config: PeraWalletConfig;
  /** Tears down the previous `disconnect` subscription so repeated
   *  connect/reconnect calls leave a single handler behind. */
  private unsubscribeDisconnect: (() => void) | null = null;
  private static instance: PeraWalletManager | null = null;

  private constructor(config: PeraWalletConfig) {
    super(config);
    this.config = config;
  }

  static getInstance(): PeraWalletManager {
    if (!PeraWalletManager.instance) {
      const isCompactMode = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE) === "true";
      const shouldPreferExtension = getPersistedPreferExtension();
      const config: PeraWalletConfig = {
        compactMode: isCompactMode,
        chainId: getNetworkConfig(getPersistedNetwork()).chainId,
        // Allow selecting more than one account at connect time so the demo can
        // exercise multi-account approval and multi-signer requests.
        singleAccount: false,
        shouldPreferExtension
      };
      PeraWalletManager.instance = new PeraWalletManager(config);
    }
    return PeraWalletManager.instance;
  }

  static getChainId(chainType: ChainType): AlgorandChainId {
    return getNetworkConfig(chainType).chainId;
  }

  updateConfig(options: {
    compactMode?: boolean;
    chainId?: PeraWalletConfig["chainId"];
    shouldPreferExtension?: boolean;
  }): void {
    const hasChanges =
      (options.compactMode !== undefined && options.compactMode !== this.config.compactMode) ||
      (options.chainId !== undefined && options.chainId !== this.config.chainId) ||
      (options.shouldPreferExtension !== undefined &&
        options.shouldPreferExtension !== this.config.shouldPreferExtension);

    if (!hasChanges) {
      return;
    }

    // Store connection state before recreating
    const wasConnected = this.isConnected;

    // Disconnect if connected
    if (wasConnected) {
      this.disconnect();
    }

    // Update config
    if (options.compactMode !== undefined) {
      this.config.compactMode = options.compactMode;
    }
    if (options.chainId !== undefined) {
      this.config.chainId = options.chainId;
    }
    if (options.shouldPreferExtension !== undefined) {
      this.config.shouldPreferExtension = options.shouldPreferExtension;
    }

    // Create new instance with updated config and replace the singleton
    const newInstance = new PeraWalletManager(this.config);
    PeraWalletManager.instance = newInstance;
    
    // Update the exported singleton reference by reassigning properties
    // This ensures existing references to peraWalletManager continue to work
    Object.keys(newInstance).forEach(key => {
      (this as any)[key] = (newInstance as any)[key];
    });
    
    // Copy over prototype methods
    Object.setPrototypeOf(this, Object.getPrototypeOf(newInstance));
  }

  connectAndSetupEventHandlers(handlers: PeraConnectEventHandlers): Promise<string[]> {
    return new Promise((resolve, reject) => {
      super
        .connect()
        .then((data) => {
          this.setupEventHandlers(handlers);
          resolve(data);
        })
        .catch((error) => {
          // https://github.com/perawallet/connect/blob/main/src/util/PeraWalletConnectError.ts
          // Ignoring the modal closed errors
          if (error.data.type === "CONNECT_MODAL_CLOSED") {
            return;
          }
          reject(error);
        });
    });
  }

  reconnectSessionAndSetupEventHandlers(
    handlers: PeraConnectEventHandlers
  ): Promise<string[]> {
    const promise = super.reconnectSession();

    promise
      .then(() => {
        this.setupEventHandlers(handlers);

        // If the connector somehow disconnects (could be network issue), we reset the account data
        if (!this.isConnected) {
          handlers.onDisconnect();
        }
      })
      .catch((error) => {
        console.log(error.data);
      });

    return promise;
  }

  private setupEventHandlers({onDisconnect}: PeraConnectEventHandlers) {
    // The SDK's own `disconnect` event covers every transport: a killed
    // WalletConnect session on mobile and the user revoking this site from the
    // extension's Connections screen. Subscribing on the connector would miss
    // the extension entirely, since that path never builds one.
    this.unsubscribeDisconnect?.();
    this.unsubscribeDisconnect = this.on("disconnect", () => {
      // For some reason, when we pass the `disconnectAccount` directly as the callback, it doesn't work
      onDisconnect();
    });
  }
}

const peraWallet = PeraWalletManager.getInstance();

export {
  PeraWalletManager,
  getPersistedNetwork,
  persistNetwork,
  getPersistedPreferExtension,
  persistPreferExtension
};
export default peraWallet;
