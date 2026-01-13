import {PeraWalletConnect} from "@perawallet/connect";
import {ChainType} from "../algod/algod";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/pera-wallet/peraWalletTypes";

interface PeraConnectEventHandlers {
  onDisconnect: () => Promise<void>;
}

// Chain ID constants
const MAINNET_CHAIN_ID = 416001;
const TESTNET_CHAIN_ID = 416002;

interface PeraWalletConfig {
  compactMode?: boolean;
  chainId: typeof MAINNET_CHAIN_ID | typeof TESTNET_CHAIN_ID;
  singleAccount?: boolean;
}

class PeraWalletManager extends PeraWalletConnect {
  private config: PeraWalletConfig;
  private static instance: PeraWalletManager | null = null;

  private constructor(config: PeraWalletConfig) {
    super(config as any);
    this.config = config;
  }

  static getInstance(): PeraWalletManager {
    if (!PeraWalletManager.instance) {
      const isCompactMode = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE) === "true";
      const config: PeraWalletConfig = {
        compactMode: isCompactMode,
        chainId: TESTNET_CHAIN_ID, // Default to TestNet
        singleAccount: true
      };
      PeraWalletManager.instance = new PeraWalletManager(config);
    }
    return PeraWalletManager.instance;
  }

  static getChainId(chainType: ChainType): typeof MAINNET_CHAIN_ID | typeof TESTNET_CHAIN_ID {
    return chainType === ChainType.MainNet ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID;
  }

  updateConfig(options: {compactMode?: boolean; chainId?: PeraWalletConfig["chainId"]}): void {
    const hasChanges = 
      (options.compactMode !== undefined && options.compactMode !== this.config.compactMode) ||
      (options.chainId !== undefined && options.chainId !== this.config.chainId);

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
    this.connector?.on("disconnect", () => {
      // For some reason, when we pass the `disconnectAccount` directly as the callback, it doesn't work
      onDisconnect();
    });
  }
}

const peraWallet = PeraWalletManager.getInstance();

export {PeraWalletManager};
export default peraWallet;
