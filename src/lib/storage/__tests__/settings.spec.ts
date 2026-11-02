import { ChainType } from '@lib/algod/networks'
import { WALLET_CONNECT_VERSIONS } from '@lib/wallet/wcVersion'

import {
    getPersistedCompactMode,
    getPersistedNetwork,
    getPersistedPreferExtension,
    getPersistedWcVersion,
    persistCompactMode,
    persistNetwork,
    persistPreferExtension,
    persistWcVersion,
} from '../settings'
import { STORAGE_KEYS } from '../storageKeys'

describe('persisted settings', () => {
    beforeEach(() => localStorage.clear())

    describe('network', () => {
        it('defaults to TestNet', () => {
            expect(getPersistedNetwork()).toBe(ChainType.TestNet)
        })

        it('ignores an unknown stored value', () => {
            localStorage.setItem(STORAGE_KEYS.SELECTED_NETWORK, 'devnet')

            expect(getPersistedNetwork()).toBe(ChainType.TestNet)
        })

        it('round-trips a network', () => {
            persistNetwork(ChainType.MainNet)

            expect(getPersistedNetwork()).toBe(ChainType.MainNet)
        })
    })

    describe('compact mode', () => {
        it('defaults to off and round-trips', () => {
            expect(getPersistedCompactMode()).toBe(false)

            persistCompactMode(true)

            expect(getPersistedCompactMode()).toBe(true)
        })
    })

    describe('prefer extension', () => {
        it('defaults to on, matching the SDK', () => {
            expect(getPersistedPreferExtension()).toBe(true)
        })

        it('only an explicit "false" opts out', () => {
            persistPreferExtension(false)

            expect(getPersistedPreferExtension()).toBe(false)
        })
    })

    describe('WalletConnect version', () => {
        it('defaults to v1 when nothing or garbage is stored', () => {
            expect(getPersistedWcVersion()).toBe('v1')

            localStorage.setItem(STORAGE_KEYS.WALLET_CONNECT_VERSION, 'v3')

            expect(getPersistedWcVersion()).toBe('v1')
        })

        it('round-trips v2 under the legacy key', () => {
            persistWcVersion('v2')

            expect(localStorage.getItem('WalletConnectVersion')).toBe('v2')
            expect(getPersistedWcVersion()).toBe('v2')
        })

        it('lists both versions in display order', () => {
            expect(WALLET_CONNECT_VERSIONS).toEqual(['v1', 'v2'])
        })
    })
})
