import algosdk from 'algosdk'

import { apiGetTxnParams } from '@lib/algod/algod'

import { getAssetIndex, AssetTransactionType } from '../asset-indexes'
import { buildAssetTransfer } from '../builders/asset'
import { buildPayment } from '../builders/payment'
import { asAtomicGroup } from '../modifiers'
import { testAccounts } from '../test-accounts'
import type { Scenario } from '../types'

export const multiGroupMixedScenarios: Scenario[] = [
    {
        id: 'multi-atomic-and-non-atomic-pay',
        title: 'Sign atomic txn group + non-atomic single txns (only payment txns)',
        description:
            '3 groups: group 1 is an atomic 2-tx payment group, groups 2 and 3 are each a non-atomic single payment. Tests mixed-shape submission with only payment txns.',
        expected:
            'Wallet shows one popup containing all 3 groups: the 2-tx atomic group and the two single payments. All groups sign; the dApp submits them one by one and all land on TestNet.',
        category: 'multi-group-mixed',
        modifiers: [],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_003,
                note: 'txn 3',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'txn 4',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])

            return {
                transaction: [
                    [
                        { txn: txn1, message: 'This is a transaction message' },
                        { txn: txn2, message: 'This is a transaction message' },
                    ],
                    [{ txn: txn3 }],
                    [{ txn: txn4 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-and-non-atomic-mixed',
        title: 'Sign atomic txn group + non-atomic single txns (mixed pay/asset)',
        description:
            '3 groups: group 1 is an atomic 2-tx group (payment + asset opt-in); group 2 is a single non-atomic asset transfer from another sender (signers: []); group 3 is a single non-atomic payment.',
        expected:
            'Wallet shows one popup containing all 3 groups. Group 1 (atomic pay + opt-in) signs fully; group 2 returns unsigned (external sender); group 3 (payment) signs. The dApp signs group 2 with the bundled testAccounts[0] key and submits the groups one by one; the log notes the co-signed slot. Group 1 lands. testAccounts[0] holds none of the transfer asset (11711), so algod rejects group 2, group 3 is not sent, and the log names the group that landed.',
        category: 'multi-group-mixed',
        modifiers: [],
        requiresFixtures: ['asset'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)
            const optInAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.OptIn,
            )
            const transferAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.Transfer,
            )

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildAssetTransfer({
                sender: address,
                receiver: address,
                amount: 0,
                assetIndex: optInAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn3 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 10_000,
                assetIndex: transferAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'txn 4',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])

            return {
                transaction: [
                    [{ txn: txn1 }, { txn: txn2 }],
                    [
                        {
                            txn: txn3,
                            message: 'This is a transaction message',
                            signers: [],
                        },
                    ],
                    [{ txn: txn4 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-only-pay',
        title: 'Sign multiple atomic groups (only payment txns)',
        description:
            '2 atomic groups of 2 payment txns each. Tests multi-group submission with all payment txns.',
        expected:
            'Wallet shows one popup containing both groups, each a 2-tx atomic payment group. All 4 txns sign; the dApp submits both groups and they land on TestNet.',
        category: 'multi-group-mixed',
        modifiers: [],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'atomic group 1 txn 2',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_003,
                note: 'atomic group 2 txn 1',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })

            return {
                transaction: [
                    asAtomicGroup([txn1, txn2]),
                    asAtomicGroup([txn3, txn4]),
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-only-asset',
        title: 'Sign multiple atomic groups (only asset txns)',
        description:
            '2 atomic groups, each 2 asset txns: an opt-in by the connected account and an asset transfer from another sender (signers: []).',
        expected:
            'Wallet shows one popup containing both groups, each marking slot 2 as external. User partial-signs 1-of-2 per group (2 signatures total). The dApp signs each external slot with the bundled testAccounts[0] key and submits the groups one by one; the log notes the 2 co-signed slots. testAccounts[0] holds none of the transfer asset (11711), so algod rejects group 1 and group 2 is not sent.',
        category: 'multi-group-mixed',
        modifiers: [],
        requiresFixtures: ['asset'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)
            const optInAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.OptIn,
            )
            const transferAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.Transfer,
            )

            const txn1 = buildAssetTransfer({
                sender: address,
                receiver: address,
                amount: 0,
                assetIndex: optInAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn2 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 10_000,
                assetIndex: transferAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn3 = buildAssetTransfer({
                sender: address,
                receiver: address,
                amount: 0,
                assetIndex: optInAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn4 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 2000,
                assetIndex: transferAssetIndex,
                note: 'example note value',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])
            algosdk.assignGroupID([txn3, txn4])

            return {
                transaction: [
                    [{ txn: txn1 }, { txn: txn2, signers: [] }],
                    [{ txn: txn3 }, { txn: txn4, signers: [] }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-invalid-asset',
        title: 'Sign multiple atomic groups with an invalid asset id',
        description:
            '2 atomic groups: group 1 is (payment + asset transfer from testAccounts[0], marked signers: [], against the fabricated non-existent asset id 100); group 2 is a 2-tx payment group.',
        expected:
            "Wallet shows one popup containing both groups, with group 1's asset transfer marked external. User may sign the 3 wallet slots (asset id is well-formed); the dApp signs the external slot with the bundled testAccounts[0] key. On submit, algod rejects group 1 (asset does not exist), the dApp stops without submitting group 2, and the error says no earlier group was submitted.",
        category: 'multi-group-mixed',
        modifiers: ['invalid'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)
            const invalidAssetIndex = 100

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 2000,
                assetIndex: invalidAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_003,
                note: 'atomic group 2 txn 1',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])

            return {
                transaction: [
                    [{ txn: txn1 }, { txn: txn2, signers: [] }],
                    asAtomicGroup([txn3, txn4]),
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-mixed-1',
        title: 'Sign multiple atomic groups (mixed pay/asset variant 1)',
        description:
            '2 atomic groups: group 1 is (payment + asset transfer from another sender with signers: []); group 2 is (asset opt-in + payment).',
        expected:
            "Wallet shows one popup containing both groups. Group 1 is partial-signed (1-of-2, slot 2 external); group 2 is fully signed (2-of-2). The dApp signs group 1's external slot with the bundled testAccounts[0] key and submits the groups one by one; the log notes the co-signed slot. testAccounts[0] holds none of the transfer asset (11711), so algod rejects group 1 and group 2 is not sent.",
        category: 'multi-group-mixed',
        modifiers: [],
        requiresFixtures: ['asset'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)
            const optInAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.OptIn,
            )
            const transferAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.Transfer,
            )

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 10_000,
                assetIndex: transferAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn3 = buildAssetTransfer({
                sender: address,
                receiver: address,
                amount: 0,
                assetIndex: optInAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])
            algosdk.assignGroupID([txn3, txn4])

            return {
                transaction: [
                    [{ txn: txn1 }, { txn: txn2, signers: [] }],
                    [{ txn: txn3 }, { txn: txn4 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-mixed-2',
        title: 'Sign multiple atomic groups (mixed pay/asset variant 2)',
        description:
            '2 atomic groups: group 1 is a 2-tx payment group (fully signed by the connected account); group 2 is (asset transfer from another sender with signers: [] + asset opt-in).',
        expected:
            "Wallet shows one popup containing both groups. Group 1 is fully signed (2-of-2); group 2 is partial-signed (1-of-2, slot 1 external). The dApp signs group 2's external slot with the bundled testAccounts[0] key and submits the groups one by one; the log notes the co-signed slot. Group 1 lands; testAccounts[0] holds none of the transfer asset (11711), so algod rejects group 2.",
        category: 'multi-group-mixed',
        modifiers: [],
        requiresFixtures: ['asset'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)
            const optInAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.OptIn,
            )
            const transferAssetIndex = getAssetIndex(
                chain,
                AssetTransactionType.Transfer,
            )

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'atomic group 1 txn 2',
                suggestedParams,
            })
            const txn3 = buildAssetTransfer({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 2000,
                assetIndex: transferAssetIndex,
                note: 'example note value',
                suggestedParams,
            })
            const txn4 = buildAssetTransfer({
                sender: address,
                receiver: address,
                amount: 0,
                assetIndex: optInAssetIndex,
                note: 'example note value',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])
            algosdk.assignGroupID([txn3, txn4])

            return {
                transaction: [
                    [{ txn: txn1 }, { txn: txn2 }],
                    [{ txn: txn3, signers: [] }, { txn: txn4 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-groups-sign-only-2',
        title: 'Sign only 2 txns across multiple atomic groups',
        description:
            '2 atomic groups of 2 payment txns each. In each group, slot 1 is sent by another account (signers: []) and slot 2 is sent by the connected account.',
        expected:
            'Wallet shows one popup containing both groups and partial-signs 1-of-2 per group (slot 2 in each), producing 2 signatures total. The dApp signs slot 1 of each group with the bundled testAccounts[0] key and both groups land on submit; the log notes the 2 co-signed slots.',
        category: 'multi-group-mixed',
        modifiers: ['partial-sign'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)

            const txn1 = buildPayment({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 100_003,
                note: 'txn 3',
                suggestedParams,
            })
            const txn4 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_004,
                note: 'txn 4',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])
            algosdk.assignGroupID([txn3, txn4])

            return {
                transaction: [
                    [{ txn: txn1, signers: [] }, { txn: txn2 }],
                    [{ txn: txn3, signers: [] }, { txn: txn4 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-and-non-atomic-sign-only-2',
        title: 'Sign only 2 txns across atomic group + non-atomic single',
        description:
            '2 groups: group 1 is an atomic 2-tx payment group with slot 1 sent by another account (signers: []); group 2 is a non-atomic single payment from the connected account.',
        expected:
            "Wallet shows one popup containing both groups. Group 1 is partial-signed (1-of-2, slot 1 external); group 2 is fully signed. 2 signatures total. The dApp signs group 1's slot 1 with the bundled testAccounts[0] key and both groups land on submit; the log notes the co-signed slot.",
        category: 'multi-group-mixed',
        modifiers: ['partial-sign'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)

            const txn1 = buildPayment({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 100_001,
                note: 'atomic group 1 txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'atomic group 2 txn 2',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_003,
                note: 'txn 3',
                suggestedParams,
            })

            algosdk.assignGroupID([txn1, txn2])

            return {
                transaction: [
                    [{ txn: txn1, signers: [] }, { txn: txn2 }],
                    [{ txn: txn3 }],
                ],
            }
        },
    },
    {
        id: 'multi-atomic-and-single-no-sign-txn',
        title: 'Sign mixed groups where one group needs no wallet signature',
        description:
            '3 groups: group 1 is a single payment from the connected account; group 2 is a single payment from the connected account with a message; group 3 is a single payment from testAccounts[0] marked signers: [], so it holds nothing for the wallet to sign. Exercises the no-sig-needed edge in a mixed-shape submission.',
        expected:
            'Wallet shows one popup containing all 3 groups. Either it rejects the request because group 3 has no txn it can sign, or it signs groups 1 and 2 and returns null for group 3. In the second case the dApp signs group 3 with the bundled testAccounts[0] key and all three groups land on submit; the log notes the co-signed slot. // TODO: verify expected behavior in the wallet',
        category: 'multi-group-mixed',
        modifiers: ['invalid'],
        networks: ['testnet'],
        async build(chain, address) {
            const suggestedParams = await apiGetTxnParams(chain)

            const txn1 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_001,
                note: 'txn 1',
                suggestedParams,
            })
            const txn2 = buildPayment({
                sender: address,
                receiver: testAccounts[0].addr,
                amount: 100_002,
                note: 'txn 2',
                suggestedParams,
            })
            const txn3 = buildPayment({
                sender: testAccounts[0].addr,
                receiver: address,
                amount: 100_003,
                note: 'txn 3',
                suggestedParams,
            })

            return {
                transaction: [
                    [{ txn: txn1 }],
                    [{ txn: txn2, message: 'This is a transaction message' }],
                    [{ txn: txn3, signers: [] }],
                ],
            }
        },
    },
]
