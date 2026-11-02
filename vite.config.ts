import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcDir = (dir: string) =>
    fileURLToPath(new URL(`./src/${dir}`, import.meta.url))

export default defineConfig({
    // GitHub Pages serves the app from /pera-demo-dapp/; dev and preview match it.
    base: '/pera-demo-dapp/',
    // A self-signed cert keeps the dev server a secure context, so the clipboard
    // API and Pera Wallet's deep links work when opened from a phone on the LAN.
    plugins: [react(), basicSsl()],
    resolve: {
        alias: {
            '@app': srcDir('app'),
            '@components': srcDir('components'),
            '@lib': srcDir('lib'),
            '@modules': srcDir('modules'),
            '@scenarios': srcDir('scenarios'),
            '@test-utils': srcDir('test-utils'),
        },
    },
    server: { host: true },
    preview: { host: true },
    build: {
        outDir: 'build',
        sourcemap: true,
        // The connect SDK alone (QR styling, Lottie) is ~1 MB unminified.
        chunkSizeWarningLimit: 1100,
        rolldownOptions: {
            output: {
                // Long-lived vendor chunks cache across app deploys.
                codeSplitting: {
                    groups: [
                        {
                            name: 'vendor-mui',
                            test: /node_modules[\\/]@(mui|emotion)[\\/]/,
                        },
                        {
                            name: 'vendor-react',
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                        },
                        {
                            name: 'vendor-algorand',
                            test: /node_modules[\\/](algosdk|@perawallet|@noble|tweetnacl)/,
                        },
                    ],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test-utils/setup.ts'],
        restoreMocks: true,
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['src/**/__tests__/**/*.spec.{ts,tsx}'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'integration',
                    include: ['src/__integration__/**/*.spec.{ts,tsx}'],
                    setupFiles: ['./src/test-utils/integrationSetup.ts'],
                    // Each flow renders the full scenario list under jsdom.
                    testTimeout: 20_000,
                },
            },
        ],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/__tests__/**',
                'src/__integration__/**',
                'src/test-utils/**',
                'src/main.tsx',
                'src/**/*.d.ts',
            ],
            reporter: ['text-summary', 'html', 'lcov'],
            // Ratchet: raise these as coverage grows, never lower them.
            thresholds: {
                statements: 94,
                branches: 82,
                functions: 92,
                lines: 94,
            },
        },
    },
})
