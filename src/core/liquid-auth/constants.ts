// src/core/liquid-auth/constants.ts

/** Public Nodely/Algonode STUN+TURN — same servers the Pera wallet and
 *  use-wallet's Liquid provider use. Replace TURN creds before any prod use. */
export const LIQUID_AUTH_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:global.turn.nodely.io:443"] },
  {
    urls: [
      "turn:global.turn.nodely.io:80?transport=tcp",
      "turns:global.turn.nodely.io:443?transport=tcp"
    ],
    username: process.env.REACT_APP_LIQUID_TURN_USERNAME || "liquid-auth",
    credential:
      process.env.REACT_APP_LIQUID_TURN_CREDENTIAL || "sqmcP4MiTKMT4TGEDSk9jgHY"
  }
];

export const LIQUID_AUTH_RTC_CONFIG: RTCConfiguration = {
  iceServers: LIQUID_AUTH_ICE_SERVERS,
  iceCandidatePoolSize: 10
};

export const DEFAULT_LIQUID_AUTH_URL =
  process.env.REACT_APP_LIQUID_AUTH_URL || "https://debug.liquidauth.com";

/** dApp's ARC-0027 provider id (any stable UUID; the wallet only checks it
 *  to ignore other providers' frames). */
export const LIQUID_AUTH_PROVIDER_ID = "pera-demo-dapp";

/** How long to wait for the WebRTC data channel to open after showing the QR. */
export const LIQUID_CONNECT_TIMEOUT_MS = 30_000;
/** How long to wait for a sign request's response over the data channel. */
export const LIQUID_REQUEST_TIMEOUT_MS = 60_000;
