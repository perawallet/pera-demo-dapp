import type { Algodv2 } from 'algosdk'

import { ScopeType, type PeraWalletArc60SignData } from '@perawallet/connect'

import type { ChainType } from '@lib/algod/networks'
import {
    resolveArc60SignerForChain,
    type Arc60SignerLookup,
} from '@lib/wallet/arc60Signer'
import { summarizeEmptySignatures } from '@lib/wallet/emptySignature'
import type { WalletSigner } from '@lib/wallet/transport/WalletTransport'
import { clearOwnedAsset, setOwnedAsset } from '@scenarios/owned-asset'
import type { NumberedScenario } from '@scenarios/registry'

import { signAndSubmit, type SignAndSubmitResult } from './signAndSubmit'

export interface ScenarioRunContext {
    wallet: WalletSigner
    algod: Algodv2
    chain: ChainType
    accountAddress: string
    connectedAccounts: string[]
    resolveArc60Signer: Arc60SignerLookup
    log: (message: string) => void
}

/** Why a scenario cannot run right now, or null when it can. */
export const scenarioBlockReason = (
    scenario: Pick<NumberedScenario, 'minAccounts'>,
    connectedAccountCount: number,
): string | null =>
    scenario.minAccounts && connectedAccountCount < scenario.minAccounts
        ? `This scenario needs at least ${scenario.minAccounts} connected accounts (currently ${connectedAccountCount}). Reconnect and approve more accounts.`
        : null

export const describeSubmission = (
    title: string,
    { submittedGroups, partialSignGroups }: SignAndSubmitResult,
): string => {
    if (submittedGroups > 0 && partialSignGroups === 0) {
        return `Signed and sent: ${title}`
    }
    if (submittedGroups > 0) {
        return `Signed: ${title} — ${submittedGroups} group(s) submitted, ${partialSignGroups} group(s) skipped (unsigned slot whose sender isn't a known test account).`
    }
    if (partialSignGroups > 0) {
        return `Signed: ${title} — not submitted (an unsigned slot's sender isn't a known test account; algod would reject as incomplete group).`
    }

    return `Signed: ${title} (nothing to submit).`
}

/** Replaces the payload's `signer` with the account's resolved ARC-60 signer.
 *  A lookup failure propagates: proceeding with the account's own key is what
 *  makes a rekeyed account fail at the wallet. */
const withResolvedArc60Signer = async (
    payload: PeraWalletArc60SignData,
    ctx: ScenarioRunContext,
): Promise<PeraWalletArc60SignData> => {
    const outcome = await resolveArc60SignerForChain(
        ctx.chain,
        ctx.accountAddress,
        ctx.resolveArc60Signer,
    )

    if (outcome.status === 'unavailable') {
        ctx.log(outcome.reason)

        return payload
    }

    if (outcome.resolution.isRekeyed) {
        ctx.log(
            `${ctx.accountAddress} is rekeyed — signing ARC-60 as its auth address ${outcome.resolution.signerAddress}.`,
        )
    }

    return { ...payload, signer: outcome.resolution.signer }
}

const runTransactionScenario = async (
    scenario: NumberedScenario,
    ctx: ScenarioRunContext,
): Promise<void> => {
    const result = await scenario.build(
        ctx.chain,
        ctx.accountAddress,
        ctx.connectedAccounts,
    )

    if ('notice' in result) {
        ctx.log(result.notice)

        return
    }
    if (!('transaction' in result)) {
        throw new Error('kind mismatch: expected transaction')
    }

    const submission = await signAndSubmit({
        wallet: ctx.wallet,
        algod: ctx.algod,
        txnsToSign: result.transaction,
        transactionTimeout: result.transactionTimeout,
        captureAssetIndex: scenario.captureCreatedAsset,
    })
    const { submittedGroups, createdAssetIndex } = submission

    if (createdAssetIndex !== undefined) {
        setOwnedAsset(ctx.chain, ctx.accountAddress, createdAssetIndex)
        ctx.log(
            `Created test asset ${createdAssetIndex} and stored it for role scenarios.`,
        )
    } else if (scenario.captureCreatedAsset && submittedGroups > 0) {
        ctx.log(
            "Asset created, but the dApp timed out capturing its ID — find the new asset ID on an explorer and re-run 'Create test asset (setup)' entering that ID.",
        )
    }
    if (scenario.clearsOwnedAssetOnSuccess && submittedGroups > 0) {
        clearOwnedAsset(ctx.chain, ctx.accountAddress)
    }

    ctx.log(describeSubmission(scenario.title, submission))
}

/** Builds the scenario's request, sends it to the wallet and, for
 *  transactions, submits whatever came back fully signed. */
export const runScenario = async (
    scenario: NumberedScenario,
    ctx: ScenarioRunContext,
): Promise<void> => {
    switch (scenario.kind ?? 'txn') {
        case 'txn': {
            await runTransactionScenario(scenario, ctx)
            return
        }
        case 'arbitrary-data': {
            const result = await scenario.build(
                ctx.chain,
                ctx.accountAddress,
                ctx.connectedAccounts,
            )

            if (!('data' in result)) {
                throw new Error('kind mismatch: expected data')
            }

            const signedData = await ctx.wallet.signData(
                result.data,
                ctx.accountAddress,
                true,
            )

            ctx.log(`Arbitrary data signed: ${scenario.title}`)
            console.info({ scenario: scenario.id, signedData })
            return
        }
        case 'arc60': {
            const result = await scenario.build(
                ctx.chain,
                ctx.accountAddress,
                ctx.connectedAccounts,
            )

            if (!('payload' in result)) {
                throw new Error('kind mismatch: expected payload')
            }

            // ARC-60 carries no network, so who signs is settled here: a
            // rekeyed account names its auth address as `signer` while the SIWA
            // payload keeps the account as `account_address`.
            const payload = scenario.preservesArc60Signer
                ? result.payload
                : await withResolvedArc60Signer(result.payload, ctx)
            const signature = await ctx.wallet.signArc60Data(
                payload,
                { scope: ScopeType.AUTH, encoding: 'base64' },
                true,
            )

            ctx.log(`ARC-60 auth signed: ${scenario.title}`)
            console.info({ scenario: scenario.id, signature })
            return
        }
        case 'empty-signatures': {
            const emptySignatures = await ctx.wallet.getEmptySignatures(
                ctx.chain,
            )

            ctx.log(
                summarizeEmptySignatures(
                    emptySignatures,
                    ctx.connectedAccounts,
                ),
            )
            console.info({ scenario: scenario.id, emptySignatures })
        }
    }
}
