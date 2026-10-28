import { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'
import type { modelsv2 } from 'algosdk'

import { notify } from '@components/toast/useToastStore'
import { clientForChain } from '@lib/algod/algod'
import { errorMessage } from '@lib/format/format'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

export const accountInformationQueryKey = ['account-information'] as const

export interface UseAccountInformationQueryResult {
    accountInformation: modelsv2.Account | null
}

/** Balance and state of the active account on the selected network. */
export const useAccountInformationQuery =
    (): UseAccountInformationQueryResult => {
        const chain = useSettingsStore(state => state.chain)
        const endpointRevision = useSettingsStore(
            state => state.endpointRevision,
        )
        const address = useSessionStore(state => state.activeAddress)

        const { data, error } = useQuery({
            queryKey: [
                ...accountInformationQueryKey,
                chain,
                endpointRevision,
                address,
            ],
            queryFn: () =>
                clientForChain(chain)
                    .accountInformation(address as string)
                    .do(),
            enabled: address !== null,
        })

        useEffect(() => {
            if (error) {
                notify({ message: errorMessage(error), severity: 'error' })
            }
        }, [error])

        return { accountInformation: address ? (data ?? null) : null }
    }
