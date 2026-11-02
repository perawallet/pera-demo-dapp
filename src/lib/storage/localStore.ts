// Storage can be missing or throw (private mode, blocked site data); the
// demo must still boot, so every access degrades to "nothing stored".

export const readItem = (key: string): string | null => {
    try {
        return globalThis.localStorage?.getItem(key) ?? null
    } catch {
        return null
    }
}

export const writeItem = (key: string, value: string): void => {
    try {
        globalThis.localStorage?.setItem(key, value)
    } catch {
        // Not persisted; the in-memory value still applies for this session.
    }
}

export const removeItem = (key: string): void => {
    try {
        globalThis.localStorage?.removeItem(key)
    } catch {
        // Nothing to clean up if storage is unavailable.
    }
}

export const listKeys = (): string[] => {
    try {
        return Object.keys(globalThis.localStorage ?? {})
    } catch {
        return []
    }
}

export const readJson = <T>(key: string): T | null => {
    const raw = readItem(key)

    if (raw === null) {
        return null
    }

    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}
