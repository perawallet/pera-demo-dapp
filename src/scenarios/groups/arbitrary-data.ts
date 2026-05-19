import type { Scenario } from "../types";

export const arbitraryDataScenarios: Scenario[] = [
  {
    id: "arbitrary-data-single",
    title: "Sign single arbitrary data",
    description:
      "Signs a single 'timestamp' payload via `peraWallet.signData`. ARC-1 arbitrary-data flow.",
    expected:
      "Wallet shows the payload bytes and the 'Timestamp confirmation' message. User signs. `signData` returns a single 64-byte ed25519 signature over the payload.",
    category: "arbitrary-data",
    modifiers: [],
    networks: ["testnet", "mainnet"],
    kind: "arbitrary-data",
    async build(_chain, _address) {
      return {
        data: [
          {
            data: new Uint8Array(Buffer.from("timestamp")),
            message: "Timestamp confirmation"
          }
        ]
      };
    }
  },
  {
    id: "arbitrary-data-multiple",
    title: "Sign multiple arbitrary data",
    description:
      "Signs two payloads (timestamp + user agent) in one `signData` call.",
    expected:
      "Wallet shows both payloads with their respective messages in one popup. User signs. `signData` returns two 64-byte ed25519 signatures, one per payload.",
    category: "arbitrary-data",
    modifiers: [],
    networks: ["testnet", "mainnet"],
    kind: "arbitrary-data",
    async build(_chain, _address) {
      return {
        data: [
          {
            data: new Uint8Array(Buffer.from(`timestamp//${Date.now()}`)),
            message: "Timestamp confirmation"
          },
          {
            data: new Uint8Array(Buffer.from(`agent//${navigator.userAgent}`)),
            message: "User agent confirmation"
          }
        ]
      };
    }
  },
  {
    id: "arbitrary-data-non-ascii",
    title: "Sign single arbitrary data (non-ASCII payload)",
    description:
      "Regression for encoding bugs: payload contains UTF-8 multi-byte chars and an embedded NUL byte ('héllo\\0世界 🟢').",
    expected:
      "Wallet renders the payload without corrupting the multi-byte chars or truncating at the NUL. User signs. `signData` returns a 64-byte ed25519 signature over the exact UTF-8 bytes.",
    category: "arbitrary-data",
    modifiers: [],
    networks: ["testnet", "mainnet"],
    kind: "arbitrary-data",
    async build(_chain, _address) {
      const bytes = new Uint8Array(Buffer.from("héllo\0世界 🟢", "utf-8"));
      return {
        data: [
          { data: bytes, message: "Non-ASCII payload" }
        ]
      };
    }
  }
];
