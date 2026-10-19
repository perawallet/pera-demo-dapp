import { useEffect, useState } from 'react'

import { peraConnect } from '@lib/wallet/walletInstance'

/** Whether the Pera extension injected `window.pera`. Checked once: the
 *  extension injects before page scripts run, so it cannot appear later. */
export const useExtensionAvailability = (): boolean => {
    const [isAvailable, setAvailable] = useState(false)

    useEffect(() => {
        let isCurrent = true

        peraConnect
            .isExtensionAvailable()
            .then(available => {
                if (isCurrent) {
                    setAvailable(available)
                }
            })
            .catch(() => setAvailable(false))

        return () => {
            isCurrent = false
        }
    }, [])

    return isAvailable
}
