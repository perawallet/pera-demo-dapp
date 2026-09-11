# Pera Wallet Example Demo dApp

- You can check live demo from [here](https://perawallet.github.io/pera-demo-dapp/)

## Networks

The network selector in the app bar offers five options: MainNet, TestNet, BetaNet,
LocalNet, and Custom (where you enter an algod URL, port, and token yourself).
There is no LocalNet-style preset for FNet — reach it through Custom instead, since
it has no single canonical public endpoint.

LocalNet assumes AlgoKit's defaults: `http://localhost:4001` with a token of 64
`a` characters. Bring one up with `algokit localnet start`, then use the Custom
dialog's **Test connection** button to verify it before saving.

**LocalNet requires importing a LocalNet account mnemonic into Pera Wallet.** The
three bundled accounts in `src/scenarios/test-accounts.ts` are not funded on a
fresh LocalNet, so most scenarios will fail until you fund accounts yourself.

Scenarios that depend on a pre-existing sample app or sample assets are
automatically disabled on BetaNet, LocalNet, and Custom, with the reason shown
on the card — those fixtures only exist on MainNet and TestNet.

LocalNet and Custom sign under wallet chain ID `4160` (network-agnostic). Rekey
address resolution is unreliable on those networks: `@perawallet/connect`'s
internal `getNetworkFromChainId()` falls back to `"mainnet"` for chain IDs it
doesn't recognize. This is a known limitation of `@perawallet/connect`, not a
bug in this dApp.

Custom is always treated as TestNet-class for scenario filtering, so pointing
it at a MainNet node surfaces spend-real-ALGO scenarios **without** the red
MainNet banner. Double-check the host before running anything on a Custom
endpoint.

## WalletConnect v2 (testing)

The dApp talks to Pera Wallet over WalletConnect v1 by default. To exercise the
mobile app's WalletConnect v2 support:

1. Create `.env.local` (gitignored) with a Reown / WalletConnect Cloud project ID:

   ```
   REACT_APP_REOWN_PROJECT_ID=<your project id>
   ```

2. Restart `pnpm start` (CRA reads env files at startup).
3. Open the ⋮ menu and set **WalletConnect version** to `v2`. The Connect button
   shows a `WC v2` chip while v2 is active. Switching versions disconnects any
   live session.
4. Press Connect: scan the QR code with Pera Wallet, or tap **Open Pera Wallet**
   on a phone.

v2 works on MainNet, TestNet and BetaNet only. LocalNet and Custom networks
have no CAIP-2 chain ID, so the mobile app cannot approve a session for them.
Without a project ID the v2 Connect button reports the missing variable and
makes no relay call. The published GitHub Pages build ships without a project
ID, so v2 works only in local builds unless the deploy workflow is given one —
and a project ID baked into a public bundle should be domain-restricted in the
Reown dashboard.

