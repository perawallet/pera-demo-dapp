import { AppBar, Box, Toolbar, Typography } from '@mui/material'

import { NetworkSelector } from '@modules/network/components/NetworkSelector'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'

import { AccountMenu } from './AccountMenu'
import { GeneratorsMenu } from './GeneratorsMenu'
import { SettingsMenu } from './SettingsMenu'

interface AppHeaderProps {
    onOpenUriGenerator: () => void
    onOpenDeeplinkGenerator: () => void
    onOpenCustomTxn: () => void
    onOpenActivityLog: () => void
}

export const AppHeader = ({
    onOpenUriGenerator,
    onOpenDeeplinkGenerator,
    onOpenCustomTxn,
    onOpenActivityLog,
}: AppHeaderProps) => {
    const isConnected = useSessionStore(state => state.activeAddress !== null)

    return (
        <AppBar position={'static'}>
            <Toolbar sx={{ gap: { xs: 0.5, sm: 1.5 } }}>
                <Box
                    component={'img'}
                    src={`${import.meta.env.BASE_URL}logo192.png`}
                    alt={'Pera'}
                    sx={{
                        height: 32,
                        width: 32,
                        mr: { xs: 0.5, sm: 1.5 },
                        borderRadius: 1,
                    }}
                />
                <Typography
                    variant={'h6'}
                    component={'h1'}
                    sx={{
                        fontWeight: 600,
                        display: { xs: 'none', md: 'block' },
                    }}
                >
                    {'Pera Demo dApp'}
                </Typography>

                <Box sx={{ flexGrow: 1 }} />

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 0.25, sm: 1.5 },
                    }}
                >
                    <NetworkSelector />
                    <GeneratorsMenu
                        isConnected={isConnected}
                        onOpenUriGenerator={onOpenUriGenerator}
                        onOpenDeeplinkGenerator={onOpenDeeplinkGenerator}
                        onOpenCustomTxn={onOpenCustomTxn}
                    />
                    <SettingsMenu onOpenActivityLog={onOpenActivityLog} />
                    <AccountMenu />
                </Box>
            </Toolbar>
        </AppBar>
    )
}
