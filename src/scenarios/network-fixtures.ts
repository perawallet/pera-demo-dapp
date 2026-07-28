import {ChainType} from "../core/utils/algod/algod";
import {getNetworkConfig} from "../core/utils/algod/networks";

/** Thrown when a scenario needs an on-chain fixture the selected network does
 *  not provide. Scenarios should be annotated with `requiresFixtures` so the UI
 *  disables them up front; this is the backstop for one that was missed. */
export class MissingNetworkFixtureError extends Error {
  readonly fixture: "app" | "asset";

  constructor(fixture: "app" | "asset", networkLabel: string) {
    super(
      `No sample ${fixture} is configured for ${networkLabel}. This scenario cannot run on that network.`
    );
    this.name = "MissingNetworkFixtureError";
    this.fixture = fixture;
  }
}

export const getAppIndex = (chain: ChainType): number => {
  const {appIndex, label} = getNetworkConfig(chain);

  if (appIndex === undefined) {
    throw new MissingNetworkFixtureError("app", label);
  }

  return appIndex;
};
