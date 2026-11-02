import type { DeeplinkDefinition, ParameterDefinition } from './deeplinks'

export type LinkType = 'new' | 'old' | 'universal'

export const LINK_TYPES: { key: LinkType; label: string }[] = [
    { key: 'new', label: 'New Style (after upgrade)' },
    { key: 'old', label: 'Old Style (previous app versions)' },
    { key: 'universal', label: 'Universal Link (web-based links)' },
]

const BASE_URL: Record<LinkType, string> = {
    new: 'perawallet://app/',
    old: 'perawallet://',
    universal: 'https://perawallet.app/qr/perawallet/app/',
}

export type DeeplinkResult = { url: string } | { error: string }

const hasScheme = (value: string) =>
    /:\/\//.test(value) || /^[a-zA-Z]+:/.test(value)

const substitute = (
    template: string,
    params: ParameterDefinition[],
    inputs: Record<string, string>,
): string =>
    params.reduce((out, param) => {
        const token = param.token || `$${param.id.toUpperCase()}`
        const value = encodeURIComponent(inputs[param.id] || '')
        // Also replace the bare TOKEN, which some templates use.
        const bare = token.startsWith('$') ? token.slice(1) : token

        return out.replaceAll(token, value).replaceAll(bare, value)
    }, template)

export const buildDeeplink = (
    destination: DeeplinkDefinition,
    linkType: LinkType,
    inputs: Record<string, string>,
): DeeplinkResult => {
    const template =
        destination.templates[linkType] ??
        destination.templates.universal ??
        destination.templates.new

    if (!template) {
        return {
            error: "This destination doesn't define a template for the selected link type.",
        }
    }

    const missing = destination.params.find(p => p.required && !inputs[p.id])

    if (missing) {
        return {
            error: `Missing required field: ${missing.label || missing.id}`,
        }
    }

    const pathOrUrl = substitute(template, destination.params, inputs)

    return {
        url: hasScheme(pathOrUrl)
            ? pathOrUrl
            : `${BASE_URL[linkType]}${pathOrUrl}`,
    }
}
