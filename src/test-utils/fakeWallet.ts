import algosdk from 'algosdk'

import type { SignerTransaction } from '@perawallet/connect'

import type {
    PairingUi,
    WalletTransport,
} from '@lib/wallet/transport/WalletTransport'
import { createWallet } from '@lib/wallet/wallet'
import type { WalletConnectVersion } from '@lib/wallet/wcVersion'

import { TEST_ADDRESSES } from './fixtures'

/** A scriptable transport: tests set `nextAccounts`/`restoredAccounts` and
 *  assert on the `vi.fn` spies. Signing returns one byte array per slot the
 *  wallet is asked to sign, as a real format-2 wallet does. */
export const createFakeTransport = (version: WalletConnectVersion) => {
    const disconnectHandlers = new Set<() => void>()
    let accounts: string[] = []

    const transport = {
        version,
        nextAccounts: [...TEST_ADDRESSES],
        restoredAccounts: [] as string[],
        get isConnected() {
            return accounts.length > 0
        },
        get accounts() {
            return accounts
        },
        connect: vi.fn(async () => {
            accounts = transport.nextAccounts
            return accounts
        }),
        reconnectSession: vi.fn(async () => {
            accounts = transport.restoredAccounts
            return accounts
        }),
        disconnect: vi.fn(async () => {
            accounts = []
        }),
        signTransaction: vi.fn(async (groups: SignerTransaction[][]) =>
            groups
                .flat()
                .filter(slot => slot.signers?.length !== 0)
                .map((_, i) => new Uint8Array([i])),
        ),
        signData: vi.fn(async () => [new Uint8Array([1])]),
        signArc60Data: vi.fn(async () => ({
            signature: new Uint8Array([1]),
        })) as unknown as WalletTransport['signArc60Data'],
        getEmptySignatures: vi.fn(async () => ({})),
        onDisconnect: (handler: () => void) => {
            disconnectHandlers.add(handler)
            return () => disconnectHandlers.delete(handler)
        },
        describe: vi.fn(() => (accounts.length ? 'https://bridge.test' : null)),
        setChain: vi.fn(),
        /** Simulates the wallet ending the session (e.g. from the phone). */
        endSession: () => {
            accounts = []
            disconnectHandlers.forEach(handler => handler())
        },
    }

    return transport satisfies WalletTransport
}

export type FakeTransport = ReturnType<typeof createFakeTransport>

/** The real `createWallet` dispatcher over fake v1/v2 transports, plus a fake
 *  for the v1 SDK owner. Mirrors what `@lib/wallet/walletInstance` exports. */
export const createTestWallet = () => {
    const transports = {
        v1: createFakeTransport('v1'),
        v2: createFakeTransport('v2'),
    }
    let pairingUi: PairingUi | null = null

    const wallet = createWallet({
        initialVersion: 'v1',
        initialChain: 'testnet' as never,
        createV1: () => transports.v1,
        createV2: (_chain, ui) => {
            pairingUi = ui
            return transports.v2
        },
        persistVersion: vi.fn(),
    })

    const peraConnect = {
        updateConfig: vi.fn(),
        isExtensionAvailable: vi.fn(async () => true),
        resolveArc60Signer: vi.fn(async (address: string) => ({
            signerAddress: address,
            signer: algosdk.decodeAddress(address).publicKey,
            isRekeyed: false,
        })),
    }

    return {
        wallet,
        peraConnect,
        transports,
        get pairingUi() {
            return pairingUi
        },
    }
}

export const testWallet = createTestWallet()
