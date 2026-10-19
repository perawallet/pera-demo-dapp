export type CustomTxnType = 'pay' | 'axfer' | 'keyreg' | 'acfg' | 'afrz'

export type AssetConfigAction = 'create' | 'modify' | 'destroy'

/** Raw form input. Numeric fields stay strings until the builder parses them,
 *  so an empty field means "not set" rather than 0. */
export interface CustomTxnForm {
    receiver: string
    /** Base units: microAlgos for pay, the asset's base unit for axfer. */
    amount: string
    note: string
    assetIndex: string
    rekeyTo: string
    closeTo: string
    /** axfer only: how many transfers to queue. Above 1, asset IDs come from
     *  the Pera API instead of `assetIndex`. */
    count: string

    isOnline: boolean
    voteKey: string
    selectionKey: string
    stateProofKey: string
    voteFirst: string
    voteLast: string
    voteKeyDilution: string

    assetAction: AssetConfigAction
    unitName: string
    assetName: string
    manager: string
    reserve: string
    freeze: string
    clawback: string
    assetURL: string
    total: string
    decimals: string
    defaultFrozen: boolean

    freezeTarget: string
    frozen: boolean
}

export const EMPTY_CUSTOM_TXN_FORM: CustomTxnForm = {
    receiver: '',
    amount: '',
    note: '',
    assetIndex: '',
    rekeyTo: '',
    closeTo: '',
    count: '1',
    isOnline: false,
    voteKey: '',
    selectionKey: '',
    stateProofKey: '',
    voteFirst: '',
    voteLast: '',
    voteKeyDilution: '',
    assetAction: 'create',
    unitName: '',
    assetName: '',
    manager: '',
    reserve: '',
    freeze: '',
    clawback: '',
    assetURL: '',
    total: '',
    decimals: '',
    defaultFrozen: false,
    freezeTarget: '',
    frozen: false,
}
