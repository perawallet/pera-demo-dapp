import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { notify } from '@components/toast/useToastStore'
import { clientForChain } from '@lib/algod/algod'
import { getNetworkConfig } from '@lib/algod/networks'
import { errorMessage } from '@lib/format/format'
import { peraConnect, wallet } from '@lib/wallet/walletInstance'
import { accountInformationQueryKey } from '@modules/account/hooks/useAccountInformationQuery'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'
import { getOwnedAsset, scenarioNetworkForChain } from '@scenarios/owned-asset'
import { getScenarios, type NumberedScenario } from '@scenarios/registry'

import { runScenario, scenarioBlockReason } from '../runScenario'

// Scenario results can be long; give the tester time to read them.
const RESULT_TOAST_TIMEOUT_MS = 10_000

const log = (message: string) =>
    notify({ message, timeout: RESULT_TOAST_TIMEOUT_MS })

export interface UseScenarioRunnerResult {
    scenarios: NumberedScenario[]
    invokingId: string | null
    invoke: (scenario: NumberedScenario) => Promise<void>
    /** Why the scenario's Invoke button is disabled, if it is. */
    disabledReason: (scenario: NumberedScenario) => string | undefined
}

export const useScenarioRunner = (): UseScenarioRunnerResult => {
    const queryClient = useQueryClient()
    const chain = useSettingsStore(state => state.chain)
    const accounts = useSessionStore(state => state.accounts)
    const activeAddress = useSessionStore(state => state.activeAddress)
    const [invokingId, setInvokingId] = useState<string | null>(null)

    const scenarios = getScenarios(scenarioNetworkForChain(chain))
    const { label, appIndex, assetIds } = getNetworkConfig(chain)
    const availableFixtures = {
        app: appIndex !== undefined,
        asset: assetIds !== undefined,
    }
    const ownedAssetId = activeAddress
        ? getOwnedAsset(chain, activeAddress)
        : null

    const disabledReason = (scenario: NumberedScenario) => {
        if (scenario.minAccounts && accounts.length < scenario.minAccounts) {
            return `Connect ${scenario.minAccounts}+ accounts to run this`
        }
        if (scenario.requiresOwnedAsset && ownedAssetId === null) {
            return "Run 'Create test asset (setup)' first"
        }

        const missing = scenario.requiresFixtures?.find(
            fixture => !availableFixtures[fixture],
        )

        return missing
            ? `Not available on ${label} (no sample ${missing} configured)`
            : undefined
    }

    const invoke = async (scenario: NumberedScenario) => {
        if (!activeAddress) {
            log('Connect a wallet first to invoke scenarios.')
            return
        }

        const blockReason = scenarioBlockReason(scenario, accounts.length)

        if (blockReason) {
            log(blockReason)
            return
        }

        setInvokingId(scenario.id)
        try {
            await runScenario(scenario, {
                wallet,
                algod: clientForChain(chain),
                chain,
                accountAddress: activeAddress,
                connectedAccounts: accounts,
                resolveArc60Signer: address =>
                    peraConnect.resolveArc60Signer(address),
                log,
            })
        } catch (error) {
            console.error(error)
            notify({
                message: errorMessage(error),
                severity: 'error',
                timeout: RESULT_TOAST_TIMEOUT_MS,
            })
        } finally {
            setInvokingId(null)
            void queryClient.invalidateQueries({
                queryKey: accountInformationQueryKey,
            })
        }
    }

    return { scenarios, invokingId, invoke, disabledReason }
}
