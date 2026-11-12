import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import algosdk from 'algosdk'

import { utf8ToBytes } from '@lib/bytes'

import { verifyArc60Signature, verifyLegacySignature } from '../verify'

const account = algosdk.generateAccount()
const address = account.addr.toString()

describe('verifyLegacySignature', () => {
    it('accepts a signature produced by algosdk.signBytes (MX prefix)', () => {
        const data = new Uint8Array([1, 2, 3])
        const signature = algosdk.signBytes(data, account.sk)

        expect(verifyLegacySignature(data, signature, address)).toBe(true)
    })

    it('rejects a tampered message and a wrong signer', () => {
        const data = new Uint8Array([1, 2, 3])
        const signature = algosdk.signBytes(data, account.sk)
        const other = algosdk.generateAccount().addr.toString()

        expect(
            verifyLegacySignature(
                new Uint8Array([1, 2, 4]),
                signature,
                address,
            ),
        ).toBe(false)
        expect(verifyLegacySignature(data, signature, other)).toBe(false)
    })

    it('returns false instead of throwing on a malformed address', () => {
        expect(
            verifyLegacySignature(
                new Uint8Array([1]),
                new Uint8Array(64),
                'not-an-address',
            ),
        ).toBe(false)
    })
})

describe('noble primitives', () => {
    it('sha256 matches the FIPS 180-2 "abc" vector', () => {
        expect(algosdk.bytesToHex(sha256(utf8ToBytes('abc')))).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        )
    })

    it('ed25519 signs the same bytes as algosdk (tweetnacl)', () => {
        const data = utf8ToBytes('same bytes')
        const prefixed = new Uint8Array([...utf8ToBytes('MX'), ...data])

        expect(ed25519.sign(prefixed, account.sk.slice(0, 32))).toEqual(
            algosdk.signBytes(data, account.sk),
        )
    })
})

describe('verifyArc60Signature', () => {
    const data = utf8ToBytes('{"domain":"example.com"}')
    const authenticatorData = sha256(utf8ToBytes('example.com'))
    const message = new Uint8Array([
        ...sha256(data),
        ...sha256(authenticatorData),
    ])

    it('accepts ed25519 over sha256(data) || sha256(authenticatorData)', () => {
        const signature = ed25519.sign(message, account.sk.slice(0, 32))

        expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).toBe(true)
    })

    it('rejects a raw signature over data (no hashing)', () => {
        const signature = ed25519.sign(data, account.sk.slice(0, 32))

        expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).toBe(false)
    })

    it('rejects a wrong signer', () => {
        const signature = ed25519.sign(message, account.sk.slice(0, 32))
        const other = algosdk.generateAccount().addr.toString()

        expect(
            verifyArc60Signature(data, authenticatorData, signature, other),
        ).toBe(false)
    })
})
