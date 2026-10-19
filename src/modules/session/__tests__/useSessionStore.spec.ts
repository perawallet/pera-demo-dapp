import { useSessionStore } from '../hooks/useSessionStore'

describe('useSessionStore', () => {
    beforeEach(() => useSessionStore.getState().clear())

    it('activates the first account when a session starts', () => {
        useSessionStore.getState().setAccounts(['A', 'B'])

        expect(useSessionStore.getState()).toMatchObject({
            accounts: ['A', 'B'],
            activeAddress: 'A',
        })
    })

    it('switches only to accounts in the session', () => {
        useSessionStore.getState().setAccounts(['A', 'B'])

        useSessionStore.getState().selectAccount('B')
        useSessionStore.getState().selectAccount('Z')

        expect(useSessionStore.getState().activeAddress).toBe('B')
    })

    it('clears the session', () => {
        useSessionStore.getState().setAccounts(['A'])

        useSessionStore.getState().clear()

        expect(useSessionStore.getState()).toMatchObject({
            accounts: [],
            activeAddress: null,
        })
    })
})
