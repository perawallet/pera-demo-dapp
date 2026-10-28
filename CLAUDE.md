# Pera Demo dApp

Vite + React 19 + MUI test bench for Pera Connect: every signing flow the wallet supports is a scenario a tester can invoke. **Always use `pnpm`.**

```sh
pnpm dev                  # https://localhost:5173/pera-demo-dapp/ (self-signed cert, LAN-reachable)
pnpm test:unit <path>     # while iterating
pnpm check                # typecheck, lint, type-aware lint, format check, full test run
pnpm build                # before finishing a change that touches config or dependencies
```

## Layout

| Path               | Holds                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `src/lib/`         | Framework-free code: algod + network presets, wallet transports (WC v1 via connect, WC v2), Pera API, storage |
| `src/modules/<m>/` | One feature each. Components in `components/`, hooks in `hooks/`, pure logic beside them                      |
| `src/components/`  | Shared UI only                                                                                                |
| `src/scenarios/`   | The scenario catalogue; `registry.ts` fixes their order and numbering                                         |
| `src/app/`         | Providers, theme, query client                                                                                |

`lib` never imports from `modules`. Import through the aliases (`@lib/…`, `@modules/…`); relative imports stay inside one module. `oxfmt` sorts imports into React, third-party, `@perawallet`, aliases, relative.

## State

- Zustand for app state: `useSettingsStore` (network, connect options, WC version), `useSessionStore` (accounts), `useToastStore` (toasts + activity log). Store actions persist the setting and push it into the wallet singletons in `@lib/wallet/walletInstance`.
- TanStack Query for algod reads. Key on `endpointRevision` as well as `chain`: saving a new Custom endpoint leaves `chain` unchanged.
- Logic with branches goes in a hook or a pure function next to the component, not in the component body.

## Conventions

- Named exports only. `type` imports inline (`import { type X }`).
- Amounts stay in base units (microAlgos / asset base units); say which in names or comments.
- No global `Buffer`: use `@lib/bytes` or `import { Buffer } from 'buffer'`.
- Comments explain why, never what. No ticket numbers or change narration.

## Adding a scenario

Add it to the matching file in `src/scenarios/groups/`; ids are permanent. Set `requiresFixtures`, `minAccounts` or `requiresOwnedAsset` instead of failing at build time, so the UI can disable it with a reason. `src/scenarios/__tests__/` checks id uniqueness and that fixture annotations match what each build needs.

## Testing

- Unit specs: colocated `__tests__/*.spec.ts(x)`. Test hooks, builders and stores; avoid snapshot and style assertions.
- Integration specs: `src/__integration__/`, run against `@test-utils/fakeWallet` and `@test-utils/fakeAlgod` (wired in `src/test-utils/integrationSetup.ts`). Query inside `header()`, `scenarioCard()` or `openDialog()` from `@test-utils/appQueries`; unscoped role queries over the full scenario list are slow.
- `@perawallet/connect` is stubbed globally in tests (its import starts a canvas animation jsdom cannot run).
- Coverage thresholds in `vite.config.ts` only go up.
