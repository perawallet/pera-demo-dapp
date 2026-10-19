import { buildDeeplink } from '../buildDeeplink'
import { DEEP_LINKS } from '../deeplinks'

const destination = (key: string) => {
    const found = DEEP_LINKS.find(d => d.key === key)

    if (!found) {
        throw new Error(`no deeplink ${key}`)
    }

    return found
}

describe('buildDeeplink', () => {
    it('prefixes relative templates with the link type base URL', () => {
        expect(
            buildDeeplink(destination('add-contact'), 'new', {
                address: 'ADDR',
                label: 'My friend',
            }),
        ).toEqual({
            url: 'perawallet://app/add-contact/?address=ADDR&label=My%20friend',
        })
    })

    it('uses the universal base for universal links', () => {
        expect(
            buildDeeplink(destination('add-contact'), 'universal', {
                address: 'ADDR',
            }),
        ).toEqual({
            url: 'https://perawallet.app/qr/perawallet/app/add-contact/?address=ADDR&label=',
        })
    })

    it('reports the first missing required field', () => {
        expect(buildDeeplink(destination('add-contact'), 'new', {})).toEqual({
            error: 'Missing required field: address',
        })
    })

    it('every destination has unique keys', () => {
        const keys = DEEP_LINKS.map(d => d.key)

        expect(new Set(keys).size).toBe(keys.length)
    })
})
