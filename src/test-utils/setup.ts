import '@testing-library/jest-dom/vitest'

// Importing the real SDK starts loading its modal UI (Lottie on <canvas>),
// which jsdom cannot run. Tests only need its enums; the wallet itself is
// always injected as a fake.
vi.mock('@perawallet/connect', () => ({
    ScopeType: { UNKNOWN: -1, AUTH: 1 },
    PeraWalletConnect: class {},
}))

// jsdom has no prompt(); the setup scenario asks for an asset ID through it.
window.prompt = () => null
