import { notify, useToastStore } from '../useToastStore'

describe('useToastStore', () => {
    beforeEach(() => useToastStore.setState({ toast: null, history: [] }))

    it('shows a toast with defaults and records it in the history', () => {
        notify({ message: 'Signed' })

        const { toast, history } = useToastStore.getState()

        expect(toast).toMatchObject({
            message: 'Signed',
            severity: 'info',
            isOpen: true,
        })
        expect(history).toHaveLength(1)
        expect(history[0]).toMatchObject({
            message: 'Signed',
            severity: 'info',
        })
    })

    it('dismisses the toast but keeps the history', () => {
        notify({ message: 'Signed', severity: 'success' })

        useToastStore.getState().dismiss()

        expect(useToastStore.getState().toast?.isOpen).toBe(false)
        expect(useToastStore.getState().history).toHaveLength(1)
    })

    it('caps the history at the most recent 200 entries', () => {
        for (let i = 0; i < 205; i++) {
            notify({ message: `#${i}` })
        }

        const { history } = useToastStore.getState()

        expect(history).toHaveLength(200)
        expect(history[0].message).toBe('#5')
    })

    it('clears the history', () => {
        notify({ message: 'Signed' })

        useToastStore.getState().clearHistory()

        expect(useToastStore.getState().history).toEqual([])
    })
})
