import { create } from 'zustand'

interface SessionState {
    /** Session-approved accounts in wallet order. */
    accounts: string[]
    /** Drives the balance panel and single-signer scenarios. */
    activeAddress: string | null
    setAccounts: (accounts: string[]) => void
    selectAccount: (address: string) => void
    clear: () => void
}

export const useSessionStore = create<SessionState>()(set => ({
    accounts: [],
    activeAddress: null,
    setAccounts: accounts =>
        set({ accounts, activeAddress: accounts[0] ?? null }),
    selectAccount: address =>
        set(state =>
            state.accounts.includes(address)
                ? { activeAddress: address }
                : state,
        ),
    clear: () => set({ accounts: [], activeAddress: null }),
}))
