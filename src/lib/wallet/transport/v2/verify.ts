import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import algosdk from 'algosdk'

/*
 * `@perawallet/connect` verifies wallet signatures with private helpers. These
 * are the same two checks, reimplemented so the v2 transport can honour the
 * `verifySignature` flag the dApp already passes.
 */

/** Legacy `algo_signData`: the wallet signs `"MX" || data`. That is exactly
 *  what `algosdk.verifyBytes` checks. */
export const verifyLegacySignature = (
    data: Uint8Array,
    signature: Uint8Array,
    signerAddress: string,
): boolean => {
    try {
        return algosdk.verifyBytes(data, signature, signerAddress)
    } catch {
        return false
    }
}

/** ARC-60: the wallet signs `sha256(data) || sha256(authenticatorData)` with
 *  no domain prefix. */
export const verifyArc60Signature = (
    data: Uint8Array,
    authenticatorData: Uint8Array,
    signature: Uint8Array,
    signerAddress: string,
): boolean => {
    try {
        const { publicKey } = algosdk.decodeAddress(signerAddress)
        const toBeVerified = new Uint8Array([
            ...sha256(data),
            ...sha256(authenticatorData),
        ])

        return ed25519.verify(signature, toBeVerified, publicKey)
    } catch {
        return false
    }
}
