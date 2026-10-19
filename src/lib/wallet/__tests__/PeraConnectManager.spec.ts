import { PeraConnectManager } from '../PeraConnectManager'

type Handler = () => void

/** Records every SDK instance so tests can see what was replaced. */
const { instances, FakePeraWalletConnect } = vi.hoisted(() => {
    const instances: InstanceType<typeof FakePeraWalletConnect>[] = []

    class FakePeraWalletConnect {
        options: Record<string, unknown>
        isConnected = false
        connector: { bridge: string } | null = null
        platform: string | null = null
        handlers = new Set<Handler>()
        connect = vi.fn(async () => {
            this.isConnected = true
            return ['ADDR']
        })
        reconnectSession = vi.fn(async () => ['ADDR'])
        disconnect = vi.fn(async () => {
            this.isConnected = false
        })
        dispose = vi.fn()
        isExtensionAvailable = vi.fn(async () => true)
        resolveArc60Signer = vi.fn(async () => ({ isRekeyed: false }))
        signTransaction = vi.fn(async () => [new Uint8Array([1])])
        signData = vi.fn(async () => [new Uint8Array([2])])
        signArc60Data = vi.fn(async () => ({}))
        getEmptySignatures = vi.fn(async () => ({}))

        constructor(options: Record<string, unknown>) {
            this.options = options
            instances.push(this)
        }

        on(_event: 'disconnect', handler: Handler) {
            this.handlers.add(handler)
            return () => this.handlers.delete(handler)
        }

        emitDisconnect() {
            this.handlers.forEach(handler => handler())
        }
    }

    return { instances, FakePeraWalletConnect }
})

vi.mock('@perawallet/connect', () => ({
    PeraWalletConnect: FakePeraWalletConnect,
}))

const OPTIONS = {
    compactMode: false,
    chainId: 416_002,
    shouldPreferExtension: true,
} as const

const latest = () => instances[instances.length - 1]

describe('PeraConnectManager', () => {
    beforeEach(() => {
        instances.length = 0
    })

    it('creates the SDK with multi-account approval enabled', () => {
        const manager = new PeraConnectManager(OPTIONS)

        expect(latest().options).toEqual({ ...OPTIONS, singleAccount: false })
        expect(manager.compactMode).toBe(false)
    })

    it('ignores config updates that change nothing', () => {
        const manager = new PeraConnectManager(OPTIONS)

        manager.updateConfig({ compactMode: false, chainId: undefined })

        expect(instances).toHaveLength(1)
    })

    it('replaces and disposes the SDK when an option changes', () => {
        const manager = new PeraConnectManager(OPTIONS)
        const first = latest()

        manager.updateConfig({ compactMode: true })

        expect(instances).toHaveLength(2)
        expect(first.dispose).toHaveBeenCalled()
        expect(latest().options).toMatchObject({ compactMode: true })
        expect(manager.compactMode).toBe(true)
    })

    it('ends a live session when the SDK is replaced and reports it', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        const onDisconnect = vi.fn()
        await manager.connectAndSetupEventHandlers({ onDisconnect })
        const first = latest()

        manager.updateConfig({ chainId: 416_001 })

        expect(first.disconnect).toHaveBeenCalled()
        expect(onDisconnect).toHaveBeenCalledTimes(1)
        // The discarded instance no longer reaches the app.
        first.emitDisconnect()
        expect(onDisconnect).toHaveBeenCalledTimes(1)
    })

    it('forwards SDK disconnect events after connecting', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        const onDisconnect = vi.fn()

        await expect(
            manager.connectAndSetupEventHandlers({ onDisconnect }),
        ).resolves.toEqual(['ADDR'])
        latest().emitDisconnect()

        expect(onDisconnect).toHaveBeenCalledTimes(1)
    })

    it('resolves with no accounts when the connect modal is closed', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        latest().connect.mockRejectedValueOnce({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })

        await expect(
            manager.connectAndSetupEventHandlers({ onDisconnect: vi.fn() }),
        ).resolves.toEqual([])
    })

    it('rethrows other connect failures', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        latest().connect.mockRejectedValueOnce(new Error('bridge down'))

        await expect(
            manager.connectAndSetupEventHandlers({ onDisconnect: vi.fn() }),
        ).rejects.toThrow('bridge down')
    })

    it('reports a session that dropped while being restored', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        const onDisconnect = vi.fn()

        await manager.reconnectSessionAndSetupEventHandlers({ onDisconnect })

        expect(onDisconnect).toHaveBeenCalledTimes(1)
    })

    it('delegates everything else to the current SDK instance', async () => {
        const manager = new PeraConnectManager(OPTIONS)
        const sdk = latest()

        await manager.signTransaction([], 'ADDR')
        await manager.signData([], 'ADDR', true)
        await manager.signArc60Data({} as never, {} as never, true)
        await manager.getEmptySignatures('testnet')
        await manager.resolveArc60Signer('ADDR')
        await manager.isExtensionAvailable()
        await manager.disconnect()

        expect(sdk.signTransaction).toHaveBeenCalledWith([], 'ADDR')
        expect(sdk.signData).toHaveBeenCalledWith([], 'ADDR', true)
        expect(sdk.signArc60Data).toHaveBeenCalled()
        expect(sdk.getEmptySignatures).toHaveBeenCalledWith('testnet')
        expect(sdk.resolveArc60Signer).toHaveBeenCalledWith('ADDR')
        expect(sdk.isExtensionAvailable).toHaveBeenCalled()
        expect(sdk.disconnect).toHaveBeenCalled()
        expect(manager.isConnected).toBe(false)
        expect(manager.connector).toBeNull()
        expect(manager.platform).toBeNull()
    })
})
