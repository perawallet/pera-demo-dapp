import type { FieldDefinition } from '@components/form/FormFields'

import type { AssetConfigAction, CustomTxnForm, CustomTxnType } from './types'

type Field = FieldDefinition<CustomTxnForm>

const note: Field = { kind: 'multiline', name: 'note', label: 'Note' }
const rekeyTo: Field = {
    kind: 'text',
    name: 'rekeyTo',
    label: 'Rekey to (optional)',
}
const closeTo: Field = {
    kind: 'text',
    name: 'closeTo',
    label: 'Close remainder to (optional)',
}
const assetIndex: Field = {
    kind: 'number',
    name: 'assetIndex',
    label: 'Asset index',
}
const roles: Field[] = [
    { kind: 'text', name: 'manager', label: 'Manager' },
    { kind: 'text', name: 'reserve', label: 'Reserve' },
    { kind: 'text', name: 'freeze', label: 'Freeze' },
    { kind: 'text', name: 'clawback', label: 'Clawback' },
]

export const TXN_TYPE_OPTIONS: { id: CustomTxnType; label: string }[] = [
    { id: 'pay', label: 'pay — payment' },
    { id: 'axfer', label: 'axfer — asset transfer' },
    { id: 'keyreg', label: 'keyreg — key registration' },
    { id: 'acfg', label: 'acfg — asset config' },
    { id: 'afrz', label: 'afrz — asset freeze' },
]

export const ASSET_CONFIG_ACTIONS: { id: AssetConfigAction; label: string }[] =
    [
        { id: 'create', label: 'Create' },
        { id: 'modify', label: 'Modify' },
        { id: 'destroy', label: 'Destroy' },
    ]

const ONLINE_KEYREG_FIELDS: Field[] = [
    { kind: 'text', name: 'voteKey', label: 'Vote key (base64)' },
    { kind: 'text', name: 'selectionKey', label: 'Selection key (base64)' },
    { kind: 'text', name: 'stateProofKey', label: 'State proof key (base64)' },
    {
        kind: 'number',
        name: 'voteFirst',
        label: 'Vote first round',
        helperText: 'Defaults to the current first valid round',
    },
    {
        kind: 'number',
        name: 'voteLast',
        label: 'Vote last round',
        helperText: 'Defaults to the current last valid round',
    },
    { kind: 'number', name: 'voteKeyDilution', label: 'Vote key dilution' },
]

const ASSET_CONFIG_FIELDS: Record<AssetConfigAction, Field[]> = {
    create: [
        { kind: 'text', name: 'unitName', label: 'Unit name' },
        { kind: 'text', name: 'assetName', label: 'Asset name' },
        { kind: 'text', name: 'assetURL', label: 'Asset URL' },
        {
            kind: 'number',
            name: 'total',
            label: 'Total (base units)',
            helperText: 'Defaults to 1',
        },
        {
            kind: 'number',
            name: 'decimals',
            label: 'Decimals',
            helperText: 'Defaults to 0',
        },
        ...roles,
        { kind: 'switch', name: 'defaultFrozen', label: 'Default frozen' },
    ],
    modify: [assetIndex, ...roles],
    destroy: [assetIndex],
}

/** The inputs to show for a transaction type, given the current form. */
export const fieldsFor = (
    type: CustomTxnType,
    form: CustomTxnForm,
): Field[] => {
    switch (type) {
        case 'pay': {
            return [
                { kind: 'text', name: 'receiver', label: 'Receiver' },
                {
                    kind: 'number',
                    name: 'amount',
                    label: 'Amount (microAlgos)',
                },
                rekeyTo,
                closeTo,
                note,
            ]
        }
        case 'axfer': {
            return [
                { kind: 'text', name: 'receiver', label: 'Receiver' },
                assetIndex,
                {
                    kind: 'number',
                    name: 'amount',
                    label: 'Amount (base units)',
                },
                rekeyTo,
                closeTo,
                note,
                {
                    kind: 'number',
                    name: 'count',
                    label: 'Number of transactions',
                    helperText:
                        'Above 1, zero-amount transfers are built for assets fetched from the Pera API',
                },
            ]
        }
        case 'keyreg': {
            return [
                {
                    kind: 'switch',
                    name: 'isOnline',
                    label: isOnline =>
                        `${isOnline ? 'Online' : 'Offline'} key registration`,
                },
                rekeyTo,
                ...(form.isOnline ? ONLINE_KEYREG_FIELDS : []),
            ]
        }
        case 'acfg': {
            return ASSET_CONFIG_FIELDS[form.assetAction]
        }
        case 'afrz': {
            return [
                assetIndex,
                { kind: 'text', name: 'freezeTarget', label: 'Freeze target' },
                {
                    kind: 'switch',
                    name: 'frozen',
                    label: frozen =>
                        frozen ? 'Freeze (true)' : 'Unfreeze (false)',
                },
                rekeyTo,
                note,
            ]
        }
    }
}
