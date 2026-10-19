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
        include: ['src/**/*.spec.{ts,tsx}'],
    },
})
