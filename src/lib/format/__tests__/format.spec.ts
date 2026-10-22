import { errorMessage, formatAlgos, shortenAddress } from '../format'

describe('shortenAddress', () => {
    it('keeps the head and tail of an address', () => {
        expect(shortenAddress('ABCDEFGHIJKLMNOP')).toBe('ABCD…MNOP')
    })

    it('honours custom lengths', () => {
        expect(shortenAddress('ABCDEFGHIJKLMNOP', 6, 2)).toBe('ABCDEF…OP')
    })

    it('leaves short strings untouched', () => {
        expect(shortenAddress('ABCDEFGH')).toBe('ABCDEFGH')
    })
})

describe('formatAlgos', () => {
    it('converts microAlgos to ALGO with at least two decimals', () => {
        expect(formatAlgos(1_500_000n)).toBe('1.50 ALGO')
        expect(formatAlgos(1_234_567_891)).toBe('1,234.567891 ALGO')
    })
})

describe('errorMessage', () => {
    it('reads Error messages and stringifies anything else', () => {
        expect(errorMessage(new Error('boom'))).toBe('boom')
        expect(errorMessage('plain')).toBe('plain')
    })
})
