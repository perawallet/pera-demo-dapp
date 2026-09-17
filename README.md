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
address resolution is unreliable on those networks: `@perawallet/connect` can
only read accounts on MainNet and TestNet, and for an all-networks session its
legacy `signData` path resolves the auth address against MainNet regardless of
which node this dApp is pointed at. This is a known limitation of
`@perawallet/connect`, not a bug in this dApp.

Custom is always treated as TestNet-class for scenario filtering, so pointing
it at a MainNet node surfaces spend-real-ALGO scenarios **without** the red
MainNet banner. Double-check the host before running anything on a Custom
endpoint.

## ARC-60 and rekeyed accounts

An ARC-60 signature verifies against the `signer` key and Pera never
substitutes another one, so a **rekeyed** account cannot sign for itself: the
request has to name the account's on-chain auth address as `signer` while the
SIWA payload keeps the account as `account_address`. ARC-60 carries no network,
so the dApp resolves this before the wallet request — every ARC-60 scenario
runs `PeraWalletConnect.resolveArc60Signer()` and substitutes the result, and
the log names the auth address whenever an account turns out to be rekeyed.

`arc60-signer-mismatch` opts out (`preservesArc60Signer`), since an unresolved
signer is the thing it exists to test.

Resolution only happens on MainNet and TestNet. A rekey is per network and the
wallet checks it on whichever network it is connected to, which Pera Connect
cannot observe; a session pinned to MainNet's or TestNet's chain ID is only
served there, so the lookup agrees with the wallet. LocalNet and Custom sign
under the all-networks chain ID `4160` and BetaNet has no algod in the SDK, so
the scenarios log that the signer was left as-is rather than guess — a rekeyed
account's ARC-60 scenarios will be rejected by the wallet on those networks.
A failed auth-address lookup fails the scenario instead of quietly falling back
to the account's own key.

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



## Pera browser extension (`window.pera`)

When the Pera extension is installed it injects a provider at `window.pera`, and
`@perawallet/connect` uses it instead of WalletConnect: the connect modal lists
**Connect with Pera Extension** first and pre-selects it. This is no longer an
experimental opt-in — it is on by default, and the ⋮ menu's **Prefer Pera
extension** toggle turns it off (the modal then offers only the QR code and Pera
Web options). The toggle's caption reports whether `window.pera` was detected on
this page, and the **Connection** caption at the bottom of the menu names the
provider in place of a WalletConnect bridge URL while an extension session is
live.

Toggling it disconnects any live session, because the SDK has to be
reconstructed with the new option.

The SDK still accepts its old `experimental` option, but nothing is gated behind
it any more, so this dApp no longer passes it — that is why the ⋮ menu has a
**Prefer Pera extension** toggle where it used to have **Experimental
features**.
