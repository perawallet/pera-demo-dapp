import { useEffect } from 'react'

import { notify } from '@components/toast/useToastStore'
import { errorMessage } from '@lib/format/format'
import { isWcV2Error } from '@lib/wallet/transport/v2/WcV2Error'
import { wallet } from '@lib/wallet/walletInstance'

import { useSessionStore } from './useSessionStore'

const connectedMessage = (count: number) =>
    count > 1
        ? `Connected to Pera Wallet (${count} accounts)`
        : 'Connected to Pera Wallet'

/** Restores a persisted session and keeps the session store in step with the
 *  wallet. Mount once, at the app root. */
export const useWalletSessionSync = (): void => {
    useEffect(() => {
        const { setAccounts, clear } = useSessionStore.getState()
        const unsubscribe = wallet.onDisconnect(clear)

        wallet
            .reconnectSession()
            .then(accounts => {
                if (accounts.length > 0) {
                    setAccounts(accounts)
                    notify({ message: connectedMessage(accounts.length) })
                }
            })
            .catch((error: unknown) => console.error(error))

        return unsubscribe
    }, [])
}

export interface UseWalletSessionResult {
    accounts: string[]
    activeAddress: string | null
    isConnected: boolean
    connect: () => Promise<void>
    disconnect: () => void
    selectAccount: (address: string) => void
}

export const useWalletSession = (): UseWalletSessionResult => {
    const accounts = useSessionStore(state => state.accounts)
    const activeAddress = useSessionStore(state => state.activeAddress)
    const selectAccount = useSessionStore(state => state.selectAccount)

    const connect = async () => {
        try {
            const connected = await wallet.connect()

            if (connected.length === 0) {
                return
            }
            useSessionStore.getState().setAccounts(connected)
            notify({ message: connectedMessage(connected.length) })
        } catch (error) {
            if (isWcV2Error(error, 'MODAL_CLOSED')) {
                return
            }
            console.error(error)
            notify({ message: errorMessage(error), severity: 'error' })
        }
    }

    const disconnect = () => {
        wallet.disconnect().catch((error: unknown) => console.error(error))
        useSessionStore.getState().clear()
    }

    return {
        accounts,
        activeAddress,
        isConnected: activeAddress !== null,
        connect,
        disconnect,
        selectAccount,
    }
}
