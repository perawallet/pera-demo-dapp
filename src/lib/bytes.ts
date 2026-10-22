const encoder = new TextEncoder()

// Copied into this realm's Uint8Array: under jsdom, TextEncoder returns Node's
// Uint8Array, which algosdk's `instanceof Uint8Array` checks reject.
export const utf8ToBytes = (text: string): Uint8Array =>
    new Uint8Array(encoder.encode(text))

/** Transaction notes are optional; an empty string means "no note". */
export const noteBytes = (note?: string): Uint8Array | undefined =>
    note ? utf8ToBytes(note) : undefined
