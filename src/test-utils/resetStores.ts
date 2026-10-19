import { useToastStore } from '@components/toast/useToastStore'
import { ChainType } from '@lib/algod/networks'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

/** Zustand stores are module singletons; reset them between tests. */
export const resetStores = () => {
    localStorage.clear()
    useSessionStore.getState().clear()
    useToastStore.setState({ toast: null, history: [] })
    useSettingsStore.setState({
        chain: ChainType.TestNet,
        endpointRevision: 0,
        isCompactMode: false,
        shouldPreferExtension: true,
        wcVersion: 'v1',
    })
}
