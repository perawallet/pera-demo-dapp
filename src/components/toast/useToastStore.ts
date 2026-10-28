import type { AlertColor } from '@mui/material'
import { create } from 'zustand'

export type ToastSeverity = AlertColor

export interface ToastOptions {
    message: string
    severity?: ToastSeverity
    /** Auto-hide delay in ms. */
    timeout?: number
}

export interface ToastHistoryEntry {
    id: number
    message: string
    severity: ToastSeverity
    timestamp: number
}

interface ActiveToast extends Required<ToastOptions> {
    id: number
    isOpen: boolean
}

interface ToastState {
    toast: ActiveToast | null
    /** Every toast shown this session, oldest first; backs the activity log. */
    history: ToastHistoryEntry[]
    show: (options: ToastOptions) => void
    dismiss: () => void
    clearHistory: () => void
}

const DEFAULT_TIMEOUT_MS = 6000
const HISTORY_LIMIT = 200

let nextId = 0

export const useToastStore = create<ToastState>()(set => ({
    toast: null,
    history: [],
    show: ({ message, severity = 'info', timeout = DEFAULT_TIMEOUT_MS }) => {
        const id = ++nextId
        const timestamp = Date.now()

        set(state => ({
            toast: { id, message, severity, timeout, isOpen: true },
            history: [
                ...state.history,
                { id, message, severity, timestamp },
            ].slice(-HISTORY_LIMIT),
        }))
    },
    dismiss: () =>
        set(state =>
            state.toast ? { toast: { ...state.toast, isOpen: false } } : state,
        ),
    clearHistory: () => set({ history: [] }),
}))

/** Shows a toast from anywhere, including non-React code. */
export const notify = (options: ToastOptions): void =>
    useToastStore.getState().show(options)
