import { wallet } from '@lib/wallet/walletInstance'

import { useWcPairingUi } from '../hooks/useWcPairingUi'
import { WcV2PairingDialog } from './WcV2PairingDialog'
import { WcV2SignPrompt } from './WcV2SignPrompt'

/** The pairing dialog and sign prompt the v2 transport drives. v1 renders its
 *  own modal inside the connect SDK. */
export const WalletConnectUi = () => {
    const { pairingUri, closePairing, isSignPromptOpen } =
        useWcPairingUi(wallet)

    return (
        <>
            <WcV2PairingDialog
                uri={pairingUri}
                onClose={closePairing}
            />
            <WcV2SignPrompt open={isSignPromptOpen} />
        </>
    )
}
