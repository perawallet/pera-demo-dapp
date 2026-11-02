import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'

import ExtensionIcon from '@mui/icons-material/Extension'
import HistoryIcon from '@mui/icons-material/History'
import LinkIcon from '@mui/icons-material/Link'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SettingsIcon from '@mui/icons-material/Settings'
import {
    Box,
    Divider,
    FormControl,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Switch,
    Typography,
} from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { notify } from '@components/toast/useToastStore'
import { errorMessage } from '@lib/format/format'
import { wallet } from '@lib/wallet/walletInstance'
import {
    WALLET_CONNECT_VERSIONS,
    type WalletConnectVersion,
} from '@lib/wallet/wcVersion'
import { useSessionStore } from '@modules/session/hooks/useSessionStore'
import { useExtensionAvailability } from '@modules/settings/hooks/useExtensionAvailability'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

const stopPropagation = (e: MouseEvent) => e.stopPropagation()

/** A menu row hosting its own control, so clicks must not close the menu. */
const SettingRow = ({
    icon,
    children,
}: {
    icon: ReactNode
    children: ReactNode
}) => (
    <MenuItem
        onClick={stopPropagation}
        disableRipple={true}
    >
        <ListItemIcon>{icon}</ListItemIcon>
        {children}
    </MenuItem>
)

interface SettingsMenuProps {
    onOpenActivityLog: () => void
}

export const SettingsMenu = ({ onOpenActivityLog }: SettingsMenuProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const isExtensionAvailable = useExtensionAvailability()
    const {
        isCompactMode,
        shouldPreferExtension,
        wcVersion,
        setCompactMode,
        setPreferExtension,
        setWcVersion,
    } = useSettingsStore(
        useShallow(state => ({
            isCompactMode: state.isCompactMode,
            shouldPreferExtension: state.shouldPreferExtension,
            wcVersion: state.wcVersion,
            setCompactMode: state.setCompactMode,
            setPreferExtension: state.setPreferExtension,
            setWcVersion: state.setWcVersion,
        })),
    )

    const handleWcVersionChange = async (version: WalletConnectVersion) => {
        setAnchor(null)
        try {
            await setWcVersion(version)
            useSessionStore.getState().clear()
            notify({ message: `Switched to WalletConnect ${version}` })
        } catch (error) {
            notify({ message: errorMessage(error), severity: 'error' })
        }
    }

    return (
        <>
            <IconButton
                color={'inherit'}
                aria-label={'Settings'}
                onClick={e => setAnchor(e.currentTarget)}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
            >
                <MenuItem
                    onClick={() => {
                        setAnchor(null)
                        onOpenActivityLog()
                    }}
                >
                    <ListItemIcon>
                        <HistoryIcon fontSize={'small'} />
                    </ListItemIcon>
                    <ListItemText>{'Activity log'}</ListItemText>
                </MenuItem>
                <SettingRow icon={<SettingsIcon fontSize={'small'} />}>
                    <ListItemText>{'Compact connect mode'}</ListItemText>
                    <Switch
                        checked={isCompactMode}
                        onChange={(_e, checked) => setCompactMode(checked)}
                        size={'small'}
                        slotProps={{
                            input: { 'aria-label': 'Compact connect mode' },
                        }}
                    />
                </SettingRow>
                <SettingRow icon={<ExtensionIcon fontSize={'small'} />}>
                    <ListItemText
                        primary={'Prefer Pera extension'}
                        secondary={
                            isExtensionAvailable
                                ? 'window.pera detected'
                                : 'window.pera not detected'
                        }
                    />
                    <Switch
                        checked={shouldPreferExtension}
                        onChange={(_e, checked) => setPreferExtension(checked)}
                        size={'small'}
                        slotProps={{
                            input: { 'aria-label': 'Prefer Pera extension' },
                        }}
                    />
                </SettingRow>
                <SettingRow icon={<LinkIcon fontSize={'small'} />}>
                    <ListItemText>{'WalletConnect version'}</ListItemText>
                    <FormControl
                        size={'small'}
                        sx={{ ml: 2, minWidth: 72 }}
                    >
                        <Select
                            value={wcVersion}
                            inputProps={{
                                'aria-label': 'WalletConnect version',
                            }}
                            onChange={e =>
                                void handleWcVersionChange(e.target.value)
                            }
                        >
                            {WALLET_CONNECT_VERSIONS.map(version => (
                                <MenuItem
                                    key={version}
                                    value={version}
                                >
                                    {version}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </SettingRow>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography
                        variant={'caption'}
                        sx={{ color: 'text.secondary', display: 'block' }}
                    >
                        {'Connection'}
                    </Typography>
                    <Typography
                        variant={'body2'}
                        sx={{ wordBreak: 'break-all' }}
                    >
                        {wallet.describe() ?? 'Not connected'}
                    </Typography>
                </Box>
            </Menu>
        </>
    )
}
