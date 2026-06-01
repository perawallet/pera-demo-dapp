import { render, screen } from "@testing-library/react";

jest.mock("../utils/pera-wallet/PeraWalletManager", () => ({
  __esModule: true,
  default: { isConnected: false, isInWebview: false }
}));

import { WalletProvider, useWallet } from "./WalletProvider";

const Probe = () => {
  const { protocol, isInWebview } = useWallet();
  return <div>protocol:{protocol}:webview:{String(isInWebview)}</div>;
};

describe("WalletProvider", () => {
  beforeEach(() => localStorage.clear());

  it("provides the default walletconnect protocol", () => {
    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );
    expect(screen.getByText(/protocol:walletconnect/)).toBeInTheDocument();
  });
});
