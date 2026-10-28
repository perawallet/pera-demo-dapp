import type { FieldDefinition } from '@components/form/FormFields'

import {
    buildAlgoTransferUri,
    buildAppQueryUri,
    buildAssetOptInUri,
    buildAssetQueryUri,
    buildAssetTransferUri,
    buildKeyregUri,
    type UriNetwork,
} from './builders'

export type UriFormValues = Record<string, string>

export interface UriForm {
    id: string
    label: string
    fields: FieldDefinition<UriFormValues>[]
    /** Fields that must be filled before a URI is shown. */
    requiredFields: string[]
    build: (values: UriFormValues, network?: UriNetwork) => string
}

const text = (name: string, label: string): FieldDefinition<UriFormValues> => ({
    kind: 'text',
    name,
    label,
})

/** Empty fields are left out of the URI rather than sent as `key=`. */
const optional = (value: string | undefined) => value || undefined

export const URI_FORMS: UriForm[] = [
    {
        id: 'algo',
        label: 'ALGO Transfer',
        requiredFields: ['address'],
        fields: [
            text('address', 'Address (required)'),
            text('amount', 'Amount (µAlgo)'),
            text('note', 'Note'),
            text('xnote', 'xnote (encrypted note)'),
            text('label', 'Label'),
        ],
        build: (v, network) =>
            buildAlgoTransferUri({
                address: v.address,
                amount: optional(v.amount),
                note: optional(v.note),
                xnote: optional(v.xnote),
                label: optional(v.label),
                network,
            }),
    },
    {
        id: 'axfer',
        label: 'Asset Transfer',
        requiredFields: ['address', 'assetId', 'amount'],
        fields: [
            text('address', 'Address (required)'),
            text('assetId', 'Asset ID (required)'),
            text('amount', 'Amount (base units, required)'),
            text('note', 'Note'),
            text('xnote', 'xnote (encrypted note)'),
            text('label', 'Label'),
        ],
        build: (v, network) =>
            buildAssetTransferUri({
                address: v.address,
                assetId: v.assetId,
                amount: v.amount,
                note: optional(v.note),
                xnote: optional(v.xnote),
                label: optional(v.label),
                network,
            }),
    },
    {
        id: 'optin',
        label: 'Asset Opt-In',
        requiredFields: ['address', 'assetId'],
        fields: [
            text('address', 'Address (required)'),
            text('assetId', 'Asset ID (required)'),
        ],
        build: (v, network) =>
            buildAssetOptInUri({
                address: v.address,
                assetId: v.assetId,
                network,
            }),
    },
    {
        id: 'keyreg',
        label: 'Keyreg',
        requiredFields: ['address'],
        fields: [
            text('address', 'Address (required)'),
            text('votekey', 'Vote Key (votekey)'),
            text('selkey', 'Selection Key (selkey)'),
            text('sprfkey', 'State Proof Key (sprfkey)'),
            text('votefst', 'Vote First Round (votefst)'),
            text('votelst', 'Vote Last Round (votelst)'),
            text('votekd', 'Vote Key Dilution (votekd)'),
            text('fee', 'Fee'),
            text('note', 'Note'),
            text('xnote', 'xnote (encrypted note)'),
        ],
        build: (v, network) =>
            buildKeyregUri({
                address: v.address,
                votekey: optional(v.votekey),
                selkey: optional(v.selkey),
                sprfkey: optional(v.sprfkey),
                votefst: optional(v.votefst),
                votelst: optional(v.votelst),
                votekd: optional(v.votekd),
                fee: optional(v.fee),
                note: optional(v.note),
                xnote: optional(v.xnote),
                network,
            }),
    },
    {
        id: 'asset-q',
        label: 'Asset Query',
        requiredFields: ['assetId'],
        fields: [text('assetId', 'Asset ID (required)')],
        build: (v, network) =>
            buildAssetQueryUri({ assetId: v.assetId, network }),
    },
    {
        id: 'app-q',
        label: 'App Query',
        requiredFields: ['appId'],
        fields: [text('appId', 'App ID (required)')],
        build: (v, network) => buildAppQueryUri({ appId: v.appId, network }),
    },
]

/** The URI for a form's current values, or '' until its required fields are set. */
export const buildUri = (
    form: UriForm,
    values: UriFormValues,
    network?: UriNetwork,
): string =>
    form.requiredFields.every(field => values[field])
        ? form.build(values, network)
        : ''
