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

