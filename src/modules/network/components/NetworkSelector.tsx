import { useState } from 'react'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { Box, Button, Divider, Menu, MenuItem, Typography } from '@mui/material'

import { ChainType, getNetworkConfig, NETWORK_ORDER } from '@lib/algod/networks'
import { useSettingsStore } from '@modules/settings/hooks/useSettingsStore'

import { CustomNetworkDialog } from './CustomNetworkDialog'

const PRESETS = NETWORK_ORDER.filter(id => id !== ChainType.Custom)

export const NetworkSelector = () => {
    const chain = useSettingsStore(state => state.chain)
    const setChain = useSettingsStore(state => state.setChain)
    const saveCustomNetwork = useSettingsStore(state => state.saveCustomNetwork)
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const [isDialogOpen, setDialogOpen] = useState(false)
    const config = getNetworkConfig(chain)

    const handleSelect = (selected: ChainType) => {
        setAnchor(null)

        if (selected === ChainType.Custom) {
            setDialogOpen(true)
            return
        }

        setChain(selected)
    }

    const hostCaption = config.algod.port
        ? `${config.algod.baseServer}:${config.algod.port}`
        : config.algod.baseServer

    return (
        <>
            <Button
                color={'inherit'}
                onClick={e => setAnchor(e.currentTarget)}
                endIcon={<ArrowDropDownIcon />}
                aria-label={`Select network, currently ${config.label}`}
                title={hostCaption}
                sx={{ px: { xs: 1, sm: 1.5 }, textTransform: 'none' }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}
                >
                    <Typography
                        variant={'body2'}
                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                    >
                        {config.label}
                    </Typography>
                    <Typography
                        variant={'caption'}
                        sx={{
                            display: { xs: 'none', sm: 'block' },
                            opacity: 0.7,
                            lineHeight: 1.2,
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {hostCaption}
                    </Typography>
                </Box>
            </Button>

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
            >
                {PRESETS.map(id => (
                    <MenuItem
                        key={id}
                        selected={id === chain}
                        onClick={() => handleSelect(id)}
                    >
                        {getNetworkConfig(id).label}
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem
                    selected={chain === ChainType.Custom}
                    onClick={() => handleSelect(ChainType.Custom)}
                >
                    {'Custom…'}
                </MenuItem>
            </Menu>

            {isDialogOpen && (
                <CustomNetworkDialog
                    isOpen={isDialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={settings => {
                        saveCustomNetwork(settings)
                        setDialogOpen(false)
                    }}
                />
            )}
        </>
    )
}
