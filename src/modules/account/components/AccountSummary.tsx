import { Box, Card, CardContent, Typography } from '@mui/material'

import { getNetworkConfig } from '@lib/algod/networks'
import { formatAlgos, shortenAddress } from '@lib/format/format'
import { getStoredPeraWalletDetails } from '@lib/storage/settings'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

import { useAccountInformationQuery } from '../hooks/useAccountInformationQuery'

export const AccountSummary = () => {
    const chain = useSettingsStore(state => state.chain)
    const { accountInformation } = useAccountInformationQuery()

    if (!accountInformation) {
        return null
    }

    const rows = [
        {
            label: 'Connected to',
            value: shortenAddress(accountInformation.address, 8, 4),
        },
        { label: 'Network', value: getNetworkConfig(chain).label },
        {
            label: 'Wallet type',
            value: getStoredPeraWalletDetails()?.type ?? '-',
        },
        { label: 'Balance', value: formatAlgos(accountInformation.amount) },
    ]

    return (
        <Card
            variant={'outlined'}
            sx={{ mb: 2 }}
        >
            <CardContent>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                        },
                        rowGap: 1,
                        columnGap: 3,
                    }}
                >
                    {rows.map(row => (
                        <Box
                            key={row.label}
                            sx={{ display: 'flex', gap: 1 }}
                        >
                            <Typography
                                variant={'body2'}
                                sx={{ fontWeight: 600, color: 'primary.main' }}
                            >
                                {`${row.label}:`}
                            </Typography>
                            <Typography variant={'body2'}>
                                {row.value}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    )
}
