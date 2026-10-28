import { useEffect, useState } from 'react'

import algosdk from 'algosdk'

import type { SignerTransaction } from '@perawallet/connect'

import { notify } from '@components/toast/useToastStore'
import { apiGetTxnParams, clientForChain } from '@lib/algod/algod'
import { getNetworkConfig } from '@lib/algod/networks'
import { errorMessage } from '@lib/format/format'
import { fetchAssets, isPeraApiAvailable } from '@lib/pera-api/peraApi'
import { wallet } from '@lib/wallet/walletInstance'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

import {
    buildCustomTransactions,
    groupTransactions,
    submissionBatches,
    transferCount,
} from '../buildCustomTxn'
import {
    EMPTY_CUSTOM_TXN_FORM,
    type CustomTxnForm,
    type CustomTxnType,
} from '../types'

const CONFIRMATION_WAIT_ROUNDS = 10

// Cleared after each queued transaction; the type-level choices persist.
const RESET_FIELDS: (keyof CustomTxnForm)[] = [
    'receiver',
    'amount',
    'note',
    'assetIndex',
    'rekeyTo',
    'closeTo',
    'freezeTarget',
]

export interface UseCustomTxnBuilderResult {
    sender: string | null
    type: CustomTxnType
    form: CustomTxnForm
    queue: SignerTransaction[]
    shouldSubmit: boolean
    isBusy: boolean
    setType: (type: CustomTxnType) => void
    updateForm: (changes: Partial<CustomTxnForm>) => void
    setShouldSubmit: (shouldSubmit: boolean) => void
    addToQueue: () => Promise<void>
    groupQueue: () => void
    clearQueue: () => void
    signQueue: () => Promise<void>
}

export const useCustomTxnBuilder = (): UseCustomTxnBuilderResult => {
    const chain = useSettingsStore(state => state.chain)
    const endpointRevision = useSettingsStore(state => state.endpointRevision)
    const sender = useSessionStore(state => state.activeAddress)
    const [type, setType] = useState<CustomTxnType>('pay')
    const [form, setForm] = useState<CustomTxnForm>(EMPTY_CUSTOM_TXN_FORM)
    const [queue, setQueue] = useState<SignerTransaction[]>([])
    const [shouldSubmit, setShouldSubmit] = useState(false)
    const [isBusy, setBusy] = useState(false)

    // Queued transactions carry this sender and network's genesis; signing them
    // after either changes would only produce a confusing wallet rejection.
    // `endpointRevision` covers a new Custom endpoint, which leaves `chain` as is.
    useEffect(() => setQueue([]), [sender, chain, endpointRevision])

    const updateForm = (changes: Partial<CustomTxnForm>) =>
        setForm(previous => ({ ...previous, ...changes }))

    const runBusy = async (task: () => Promise<void>) => {
        setBusy(true)
        try {
            await task()
        } catch (error) {
            console.error(error)
            notify({ message: errorMessage(error), severity: 'error' })
        } finally {
            setBusy(false)
        }
    }

    const addToQueue = () =>
        runBusy(async () => {
            if (!sender) {
                throw new Error('Connect a wallet first.')
            }

            const count = type === 'axfer' ? transferCount(form) : 1

            if (count > 1 && !isPeraApiAvailable(chain)) {
                throw new Error(
                    `Bulk asset transfers need the Pera API, which is unavailable on ${getNetworkConfig(chain).label}. Set the number of transactions to 1 and enter an asset index manually.`,
                )
            }

            const bulkAssetIds =
                count > 1
                    ? (await fetchAssets(chain, count)).map(a => a.asset_id)
                    : undefined
            const transactions = buildCustomTransactions(type, form, {
                sender,
                suggestedParams: await apiGetTxnParams(chain),
                bulkAssetIds,
            })

            // The sender or network can change while the params are in flight;
            // the queue was cleared then, so these must not land in it.
            if (
                useSessionStore.getState().activeAddress !== sender ||
                useSettingsStore.getState().endpointRevision !==
                    endpointRevision
            ) {
                return
            }

            setQueue(previous => [...previous, ...transactions])
            updateForm(
                Object.fromEntries(
                    RESET_FIELDS.map(key => [key, EMPTY_CUSTOM_TXN_FORM[key]]),
                ),
            )
        })

    const groupQueue = () => {
        try {
            setQueue(groupTransactions(queue))
            notify({ message: `Grouped ${queue.length} transactions.` })
        } catch (error) {
            notify({ message: errorMessage(error), severity: 'error' })
        }
    }

    const signQueue = () =>
        runBusy(async () => {
            if (queue.length === 0) {
                return
            }

            const signed = await wallet.signTransaction([queue])

            console.info({ signedTransactions: signed })

            if (!shouldSubmit) {
                notify({
                    message: `Signed ${signed.length} transactions.`,
                    severity: 'success',
                })
                return
            }

            const algod = clientForChain(chain)

            for (const batch of submissionBatches(queue, signed)) {
                await algod.sendRawTransaction(batch.bytes).do()
                await algosdk.waitForConfirmation(
                    algod,
                    batch.txId,
                    CONFIRMATION_WAIT_ROUNDS,
                )
            }

            setQueue([])
            notify({
                message: `Signed and confirmed ${signed.length} transactions.`,
                severity: 'success',
            })
        })

    return {
        sender,
        type,
        form,
        queue,
        shouldSubmit,
        isBusy,
        setType,
        updateForm,
        setShouldSubmit,
        addToQueue,
        groupQueue,
        clearQueue: () => setQueue([]),
        signQueue,
    }
}
