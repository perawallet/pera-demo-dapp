import { createSignClient, RELAY_URL } from '../signClientFactory'

const { init } = vi.hoisted(() => ({
    init: vi.fn(async () => ({ id: 'client' })),
}))

vi.mock('@walletconnect/sign-client', () => ({ default: { init } }))

describe('createSignClient', () => {
    it('initialises the SDK against the WalletConnect relay', async () => {
        const metadata = {
            name: 'Demo',
            description: '',
            url: 'https://demo.test',
            icons: [],
        }

        await expect(
            createSignClient({ projectId: 'abc', metadata }),
        ).resolves.toEqual({ id: 'client' })
        expect(init).toHaveBeenCalledWith({
            projectId: 'abc',
            relayUrl: RELAY_URL,
            metadata,
        })
    })
})
