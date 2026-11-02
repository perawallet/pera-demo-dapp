import { useState } from 'react'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CheckIcon from '@mui/icons-material/Check'
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material'

import { notify } from '@components/toast/useToastStore'
import { errorMessage, shortenAddress } from '@lib/format/format'
import { useWalletSession } from '@modules/session/hooks/useWalletSession'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

/** The Connect button, or the active account chip and its menu. */
export const AccountMenu = () => {
    const { accounts, activeAddress, connect, disconnect, selectAccount } =
        useWalletSession()
    const wcVersion = useSettingsStore(state => state.wcVersion)
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)

    if (!activeAddress) {
        return (
            <Button
                variant={'contained'}
                color={'primary'}
                size={'small'}
                onClick={() => void connect()}
                endIcon={
                    wcVersion === 'v2' ? (
                        <Chip
                            label={'WC v2'}
                            size={'small'}
                            color={'secondary'}
                            sx={{ height: 18, fontSize: 10 }}
                        />
                    ) : undefined
                }
                sx={{ whiteSpace: 'nowrap' }}
            >
                {'Connect'}
            </Button>
        )
    }

    const closeAnd = (action: () => void) => () => {
        setAnchor(null)
        action()
    }

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(activeAddress)
            notify({ message: 'Address copied to clipboard' })
        } catch (error) {
            notify({ message: errorMessage(error), severity: 'error' })
        }
    }

    return (
        <>
            <Chip
                avatar={<Avatar>{activeAddress.charAt(0)}</Avatar>}
                label={
                    <Box
                        component={'span'}
                        sx={{ display: { xs: 'none', sm: 'inline' } }}
                    >
                        {shortenAddress(activeAddress)}
                    </Box>
                }
                aria-label={'Account menu'}
                onClick={e => setAnchor(e.currentTarget)}
                deleteIcon={
                    <ArrowDropDownIcon
                        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    />
                }
                onDelete={e =>
                    setAnchor((e.currentTarget as HTMLElement).parentElement)
                }
                sx={{
                    cursor: 'pointer',
                    '& .MuiChip-label': { px: { xs: 0, sm: 1 } },
                }}
            />
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
            >
                {accounts.length > 1 && [
                    <Box
                        key={'accounts-label'}
                        sx={{ px: 2, py: 0.5 }}
                    >
                        <Typography
                            variant={'caption'}
                            sx={{ color: 'text.secondary' }}
                        >
                            {`Connected accounts (${accounts.length})`}
                        </Typography>
                    </Box>,
                    ...accounts.map(address => (
                        <MenuItem
                            key={address}
                            selected={address === activeAddress}
                            onClick={closeAnd(() => selectAccount(address))}
                        >
                            <ListItemIcon>
                                {address === activeAddress && (
                                    <CheckIcon fontSize={'small'} />
                                )}
                            </ListItemIcon>
                            <ListItemText>
                                {shortenAddress(address)}
                            </ListItemText>
                        </MenuItem>
                    )),
                    <Divider key={'accounts-divider'} />,
                ]}
                <MenuItem onClick={closeAnd(() => void copyAddress())}>
                    {'Copy address'}
                </MenuItem>
                <MenuItem onClick={closeAnd(disconnect)}>
                    {'Disconnect'}
                </MenuItem>
            </Menu>
        </>
    )
}
