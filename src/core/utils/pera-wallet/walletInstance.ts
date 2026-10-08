import {clientForChain} from "../algod/algod";
import peraWallet, {getPersistedNetwork} from "./PeraWalletManager";
import {V1Transport} from "./transport/V1Transport";
import {normalizeProjectId} from "./transport/v2/projectId";
import {createSignClient} from "./transport/v2/signClientFactory";
import {V2Transport} from "./transport/v2/V2Transport";
import {createWallet} from "./wallet";
import {getPersistedWcVersion, persistWcVersion} from "./wcVersion";

const wallet = createWallet({
  initialVersion: getPersistedWcVersion(),
  initialChain: getPersistedNetwork(),
  createV1: () => new V1Transport(peraWallet),
  createV2: (chain, ui) =>
    new V2Transport({
      getProjectId: () => normalizeProjectId(process.env.REACT_APP_REOWN_PROJECT_ID),
      initialChain: chain,
      createClient: createSignClient,
      ui,
      resolveAuthAddr: async (signer, chain) => {
        const info = await clientForChain(chain).accountInformation(signer).do();

        return info.authAddr ? info.authAddr.toString() : null;
      }
    }),
  persistVersion: persistWcVersion
});

export type {Wallet} from "./wallet";

export default wallet;
