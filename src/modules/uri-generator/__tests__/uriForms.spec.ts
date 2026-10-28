import { buildUri, URI_FORMS } from '../uriForms'

const ADDRESS = 'TESTADDRESS'

const formById = (id: string) => {
    const form = URI_FORMS.find(f => f.id === id)

    if (!form) {
        throw new Error(`no form ${id}`)
    }

    return form
}

describe('ARC-90 URI forms', () => {
    it('stays empty until every required field is filled', () => {
        const axfer = formById('axfer')

        expect(buildUri(axfer, { address: ADDRESS, assetId: '31566704' })).toBe(
            '',
        )
        expect(
            buildUri(axfer, {
                address: ADDRESS,
                assetId: '31566704',
                amount: '10',
            }),
        ).toBe(`algorand://${ADDRESS}?asset=31566704&amount=10`)
    })

    it('omits empty optional parameters and encodes the rest', () => {
        expect(
            buildUri(formById('algo'), {
                address: ADDRESS,
                amount: '',
                note: 'hello world',
            }),
        ).toBe(`algorand://${ADDRESS}?note=hello%20world`)
    })

    it('applies the network prefix when one is given', () => {
        expect(buildUri(formById('app-q'), { appId: '7' }, 'mainnet')).toBe(
            'algorand://net:mainnet/app/7',
        )
    })

    it('builds an opt-in as a zero-amount asset transfer', () => {
        expect(
            buildUri(formById('optin'), { address: ADDRESS, assetId: '5' }),
        ).toBe(`algorand://${ADDRESS}?asset=5&amount=0`)
    })

    it('tags key registrations with type=keyreg', () => {
        expect(
            buildUri(formById('keyreg'), { address: ADDRESS, votekd: '100' }),
        ).toBe(`algorand://${ADDRESS}?type=keyreg&votekd=100`)
    })
})
