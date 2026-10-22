import {
    PeraWalletConnect,
    type PeraWalletArbitraryData,
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type SignerTransaction,
    type SignMetadata,
} from '@perawallet/connect'

import type { AlgorandChainId } from '@lib/algod/networks'

import type { Arc60SignerResolution } from './arc60Signer'
import type { V1Manager, V1SessionHandlers } from './transport/V1Transport'

export interface PeraConnectOptions {
    compactMode: boolean
    chainId: AlgorandChainId
    /** Lists "Connect with Pera Extension" first when `window.pera` exists. */
    shouldPreferExtension: boolean
}

const CONNECT_MODAL_CLOSED = 'CONNECT_MODAL_CLOSED'

const isModalClosedError = (error: unknown): boolean =>
    (error as { data?: { type?: string } } | null)?.data?.type ===
    CONNECT_MODAL_CLOSED

const createConnect = (options: PeraConnectOptions): PeraWalletConnect =>
    new PeraWalletConnect({
        ...options,
        // Multi-account approval lets the demo exercise multi-signer requests.
        singleAccount: false,
    })

/**
 * Owns the `PeraWalletConnect` instance behind the v1 transport. The SDK reads
 * its options only in the constructor, so changing compact mode, chain ID or the
 * extension preference replaces the instance; holding it here (instead of
 * subclassing the SDK) lets that happen without mutating a live object.
 */
export class PeraConnectManager implements V1Manager {
    private options: PeraConnectOptions
    private connect: PeraWalletConnect
    private unsubscribeDisconnect: (() => void) | null = null
    private sessionHandlers: V1SessionHandlers | null = null

    constructor(options: PeraConnectOptions) {
        this.options = { ...options }
        this.connect = createConnect(this.options)
    }

    get isConnected(): boolean {
        return this.connect.isConnected
    }

    get connector(): { bridge: string } | null {
        return this.connect.connector
    }

    get platform(): V1Manager['platform'] {
        return this.connect.platform
    }

    get compactMode(): boolean {
        return this.options.compactMode
    }

    /** Rebuilds the SDK instance when an option changes. A live session is
     *  disconnected and reported as such, since it belongs to the instance
     *  being replaced and the new one cannot serve it. */
    updateConfig(changes: Partial<PeraConnectOptions>): void {
        const next = { ...this.options }

        for (const key of Object.keys(
            changes,
        ) as (keyof PeraConnectOptions)[]) {
            if (changes[key] !== undefined) {
                Object.assign(next, { [key]: changes[key] })
            }
        }

        const hasChanges = (
            Object.keys(next) as (keyof PeraConnectOptions)[]
        ).some(key => next[key] !== this.options[key])

        if (!hasChanges) {
            return
        }

        const previous = this.connect
        const handlers = this.sessionHandlers

        this.unsubscribeDisconnect?.()
        this.unsubscribeDisconnect = null
        this.sessionHandlers = null

        if (previous.isConnected) {
            previous.disconnect().catch(() => undefined)
            handlers?.onDisconnect()
        }
        previous.dispose()

        this.options = next
        this.connect = createConnect(next)
    }

    /** Resolves with no accounts when the user closes the connect modal. */
    async connectAndSetupEventHandlers(
        handlers: V1SessionHandlers,
    ): Promise<string[]> {
        try {
            const accounts = await this.connect.connect()

            this.subscribeToDisconnect(handlers)

            return accounts
        } catch (error) {
            if (isModalClosedError(error)) {
                return []
            }
            throw error
        }
    }

    async reconnectSessionAndSetupEventHandlers(
        handlers: V1SessionHandlers,
    ): Promise<string[]> {
        const accounts = await this.connect.reconnectSession()

        this.subscribeToDisconnect(handlers)

        // The bridge can drop the session while it is being restored. The
        // caller has not marked the session active yet, so returning its
        // accounts would show a dead session as connected.
        if (!this.connect.isConnected) {
            handlers.onDisconnect()

            return []
        }

        return accounts
    }

    disconnect(): Promise<void> {
        return this.connect.disconnect()
    }

    isExtensionAvailable(): Promise<boolean> {
        return this.connect.isExtensionAvailable()
    }

    /** Uses the session's chain ID, which tracks the selected network. */
    resolveArc60Signer(accountAddress: string): Promise<Arc60SignerResolution> {
        return this.connect.resolveArc60Signer(accountAddress)
    }

    signTransaction(
        groups: SignerTransaction[][],
        signerAddress?: string,
    ): Promise<Uint8Array[]> {
        return this.connect.signTransaction(groups, signerAddress)
    }

    signData(
        data: PeraWalletArbitraryData[],
        signer: string,
        verifySignature?: boolean,
    ): Promise<Uint8Array[]> {
        return this.connect.signData(data, signer, verifySignature)
    }

    signArc60Data(
        payload: PeraWalletArc60SignData,
        metadata: SignMetadata,
        verifySignature?: boolean,
    ): Promise<PeraWalletArc60SignDataResponse> {
        return this.connect.signArc60Data(payload, metadata, verifySignature)
    }

    getEmptySignatures(
        network?: 'mainnet' | 'testnet' | 'betanet',
    ): Promise<Record<string, string>> {
        return this.connect.getEmptySignatures(network)
    }

    // The SDK's own `disconnect` event covers every transport, including the
    // extension, which never builds a WalletConnect connector to listen on.
    private subscribeToDisconnect(handlers: V1SessionHandlers): void {
        this.unsubscribeDisconnect?.()
        this.sessionHandlers = handlers
        this.unsubscribeDisconnect = this.connect.on('disconnect', () =>
            handlers.onDisconnect(),
        )
    }
}
