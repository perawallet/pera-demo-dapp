import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vitest/config";

export default defineConfig(({command}) => ({
  // GitHub Pages serves the app from /pera-demo-dapp/.
  base: command === "build" ? "/pera-demo-dapp/" : "/",
  // A self-signed cert keeps the dev server a secure context, so the clipboard
  // API and Pera Wallet's deep links work when opened from a phone on the LAN.
  plugins: [react(), basicSsl()],
  server: {host: true},
  preview: {host: true},
  build: {outDir: "build", sourcemap: true},
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"]
  }
}));
