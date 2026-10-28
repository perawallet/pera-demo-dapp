import { ChainType } from '@lib/algod/algod'

import { AssetTransactionType, getAssetIndex } from '../asset-indexes'
import { getAppIndex, MissingNetworkFixtureError } from '../network-fixtures'

describe('network fixtures', () => {
    it('returns the configured app index for MainNet and TestNet', () => {
        expect(getAppIndex(ChainType.MainNet)).toBe(305_162_725)
        expect(getAppIndex(ChainType.TestNet)).toBe(22_314_999)
    })

    it('returns the configured asset indexes for MainNet', () => {
        expect(
            getAssetIndex(ChainType.MainNet, AssetTransactionType.Transfer),
        ).toBe(604)
        expect(
            getAssetIndex(ChainType.MainNet, AssetTransactionType.OptIn),
        ).toBe(312_769)
        expect(
            getAssetIndex(ChainType.MainNet, AssetTransactionType.Close),
        ).toBe(672)
    })

    it('returns the configured asset indexes for TestNet', () => {
        expect(
            getAssetIndex(ChainType.TestNet, AssetTransactionType.Transfer),
        ).toBe(11_711)
        expect(
            getAssetIndex(ChainType.TestNet, AssetTransactionType.OptIn),
        ).toBe(135_270)
        expect(
            getAssetIndex(ChainType.TestNet, AssetTransactionType.Close),
        ).toBe(180_132)
    })

    it('throws instead of falling through to TestNet ids on LocalNet', () => {
        expect(() =>
            getAssetIndex(ChainType.LocalNet, AssetTransactionType.Transfer),
        ).toThrow(MissingNetworkFixtureError)
        expect(() => getAppIndex(ChainType.LocalNet)).toThrow(
            MissingNetworkFixtureError,
        )
    })

    it('throws for BetaNet and Custom too', () => {
        ;[ChainType.BetaNet, ChainType.Custom].forEach(chain => {
            expect(() => getAppIndex(chain)).toThrow(MissingNetworkFixtureError)
            expect(() =>
                getAssetIndex(chain, AssetTransactionType.OptIn),
            ).toThrow(MissingNetworkFixtureError)
        })
    })

    it('tags the error with which fixture was missing', () => {
        try {
            getAppIndex(ChainType.LocalNet)
            throw new Error('expected getAppIndex to throw')
        } catch (error) {
            expect((error as MissingNetworkFixtureError).fixture).toBe('app')
        }
    })
})
