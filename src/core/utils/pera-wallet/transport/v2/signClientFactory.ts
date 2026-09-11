import type {WcClient, WcMetadata} from "./wcClient";

export const RELAY_URL = "wss://relay.walletconnect.com";

/** Production client. The dynamic import keeps the ESM package out of the
 *  initial bundle and out of Jest, which cannot parse it. */
export const createSignClient = async (opts: {
  projectId: string;
  metadata: WcMetadata;
}): Promise<WcClient> => {
  const {default: SignClient} = await import("@walletconnect/sign-client");
  const client = await SignClient.init({
    projectId: opts.projectId,
    relayUrl: RELAY_URL,
    metadata: opts.metadata
  });

  return client as unknown as WcClient;
};
