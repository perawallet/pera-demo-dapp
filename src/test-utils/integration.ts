import { queryClient } from '@app/queryClient'

import { fakeAlgod } from './fakeAlgod'
import { testWallet } from './fakeWallet'
import { TEST_ADDRESSES } from './fixtures'
import { resetStores } from './resetStores'

/** Runs before every integration spec (see integrationSetup.ts). */
export const resetIntegrationState = async () => {
    resetStores()
    queryClient.clear()
    vi.clearAllMocks()

    await testWallet.wallet.setVersion('v1')
    for (const transport of Object.values(testWallet.transports)) {
        await transport.disconnect()
        transport.nextAccounts = [...TEST_ADDRESSES]
        transport.restoredAccounts = []
    }

    fakeAlgod.balance = 12_345_678n
    fakeAlgod.sent.length = 0
}
