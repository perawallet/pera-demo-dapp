vi.mock('@lib/algod/algod', async importOriginal => ({
    ...(await importOriginal<typeof import('@lib/algod/algod')>()),
    apiGetTxnParams: vi.fn().mockResolvedValue({
        fee: 1000,
        minFee: 1000,
        firstValid: 1,
        lastValid: 1001,
        genesisID: 'testnet-v1.0',
        genesisHash: new Uint8Array(32),
        flatFee: false,
    }),
}))

import { ChainType } from '@lib/algod/algod'

import { testAccounts } from '../../test-accounts'
import { singleAppScenarios } from '../single-app'

const ADDRESS = testAccounts[1].addr.toString()

const buildApplicationCall = async (id: string) => {
    const scenario = singleAppScenarios.find(s => s.id === id)!
    const result = await scenario.build(ChainType.TestNet, ADDRESS, [ADDRESS])

    if (!('transaction' in result)) throw new Error('expected a txn')

    return result.transaction[0][0].txn.applicationCall!
}

const UPDATE_APPLICATION = 4
const DELETE_APPLICATION = 5

/** Runs the few TEAL v4 opcodes the update's approval program uses, so the
 *  test checks what the program allows rather than which bytes it has. */
const approves = (
    program: Uint8Array,
    {
        onCompletion,
        fromCreator,
    }: { onCompletion: number; fromCreator: boolean },
): boolean => {
    const stack: (bigint | string)[] = []
    const pop = () => {
        if (stack.length === 0) throw new Error('stack underflow')
        return stack.pop()!
    }
    const operand = () => {
        if (pc >= program.length) throw new Error('missing operand')
        return program[pc++]
    }
    let pc = 1

    while (pc < program.length) {
        const opcode = program[pc++]

        switch (opcode) {
            case 0x81: {
                const value = operand()
                if (value >= 0x80) throw new Error('multi-byte pushint')
                stack.push(BigInt(value))
                break
            }
            case 0x32: {
                if (operand() !== 0x09) throw new Error('unmodelled global')
                stack.push('creator')
                break
            }
            case 0x31: {
                const field = operand()
                if (field === 0x00)
                    stack.push(fromCreator ? 'creator' : 'other')
                else if (field === 0x19) stack.push(BigInt(onCompletion))
                else throw new Error('unmodelled txn field')
                break
            }
            case 0x12: {
                const b = pop()
                stack.push(pop() === b ? 1n : 0n)
                break
            }
            case 0x0f: {
                const b = pop()
                stack.push((pop() as bigint) >= (b as bigint) ? 1n : 0n)
                break
            }
            case 0x4d: {
                const condition = pop()
                const ifTrue = pop()
                const ifFalse = pop()
                stack.push(condition !== 0n ? ifTrue : ifFalse)
                break
            }
            case 0x43: {
                return pop() !== 0n
            }
            default: {
                throw new Error(`unmodelled opcode 0x${opcode.toString(16)}`)
            }
        }
    }

    throw new Error('program ended without return')
}

describe('single-appl-update', () => {
    // algod refuses to lower a clear program's version; the sample app's is v4.
    it('does not downgrade the clear program below v4', async () => {
        const { clearProgram } =
            await buildApplicationCall('single-appl-update')

        expect(clearProgram[0]).toBeGreaterThanOrEqual(4)
    })

    // Whether these bytes still match the sample app's on-chain program
    // cannot be checked offline.
    it('re-deploys the pinned sample-app approval program', async () => {
        const { approvalProgram } =
            await buildApplicationCall('single-appl-update')

        expect(Array.from(approvalProgram)).toEqual([
            0x04, 0x81, 0x01, 0x32, 0x09, 0x31, 0x00, 0x12, 0x31, 0x19, 0x81,
            0x04, 0x0f, 0x4d, 0x43,
        ])
    })

    // The TestNet sample app is shared: an update that approves everything
    // would let anyone delete it afterwards.
    it('re-deploys an approval program that keeps update and delete creator-only', async () => {
        const { approvalProgram } =
            await buildApplicationCall('single-appl-update')
        const verdicts = [0, 1, 2, UPDATE_APPLICATION, DELETE_APPLICATION].map(
            onCompletion => ({
                onCompletion,
                creator: approves(approvalProgram, {
                    onCompletion,
                    fromCreator: true,
                }),
                anyoneElse: approves(approvalProgram, {
                    onCompletion,
                    fromCreator: false,
                }),
            }),
        )

        expect(verdicts).toEqual([
            { onCompletion: 0, creator: true, anyoneElse: true },
            { onCompletion: 1, creator: true, anyoneElse: true },
            { onCompletion: 2, creator: true, anyoneElse: true },
            {
                onCompletion: UPDATE_APPLICATION,
                creator: true,
                anyoneElse: false,
            },
            {
                onCompletion: DELETE_APPLICATION,
                creator: true,
                anyoneElse: false,
            },
        ])
    })

    it('lets anyone delete under an approve-all program, so the check above can fail', () => {
        const approveAll = Uint8Array.from([4, 129, 1, 67])

        expect(
            approves(approveAll, {
                onCompletion: DELETE_APPLICATION,
                fromCreator: false,
            }),
        ).toBe(true)
    })

    it('leaves the create scenarios on their original programs', async () => {
        for (const id of [
            'single-appl-create',
            'single-appl-create-extra-page',
        ]) {
            const { approvalProgram, clearProgram } =
                await buildApplicationCall(id)

            expect(Array.from(approvalProgram)).toEqual([4, 129, 1, 67])
            expect(Array.from(clearProgram)).toEqual([3, 129, 1, 67])
        }
    })
})
