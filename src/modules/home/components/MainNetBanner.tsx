import { Box } from '@mui/material'

import { ChainType } from '@lib/algod/networks'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

export const MainNetBanner = () => {
    const chain = useSettingsStore(state => state.chain)

    if (chain !== ChainType.MainNet) {
        return null
    }

    return (
        <Box
            role={'alert'}
            sx={{
                bgcolor: '#fee2e2',
                color: '#991b1b',
                fontWeight: 600,
                textAlign: 'center',
                py: 1,
                px: 2,
            }}
        >
            {
                'You are using MainNet right now. Please be careful when sending transactions.'
            }
        </Box>
    )
}
