import { microalgosToAlgos } from 'algosdk'

/** `ABCD…WXYZ`: enough of an address to tell accounts apart in the UI. */
export const shortenAddress = (address: string, head = 4, tail = 4): string =>
    address.length <= head + tail
        ? address
        : `${address.slice(0, head)}…${address.slice(-tail)}`

const algoFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
})

/** `microAlgos` is in base units (1 ALGO = 1e6 µALGO). */
export const formatAlgos = (microAlgos: bigint | number): string =>
    `${algoFormatter.format(microalgosToAlgos(Number(microAlgos)))} ALGO`

export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)
