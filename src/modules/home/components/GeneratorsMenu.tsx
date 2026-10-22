import { useState } from 'react'

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import BuildIcon from '@mui/icons-material/Build'
import { Box, Button, Menu, MenuItem } from '@mui/material'

interface GeneratorsMenuProps {
    isConnected: boolean
    onOpenUriGenerator: () => void
    onOpenDeeplinkGenerator: () => void
    onOpenCustomTxn: () => void
}

export const GeneratorsMenu = ({
    isConnected,
    onOpenUriGenerator,
    onOpenDeeplinkGenerator,
    onOpenCustomTxn,
}: GeneratorsMenuProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)

    const select = (open: () => void) => () => {
        setAnchor(null)
        open()
    }

    return (
        <>
            <Button
                color={'inherit'}
                aria-label={'Generators'}
                onClick={e => setAnchor(e.currentTarget)}
                endIcon={
                    <ArrowDropDownIcon
                        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    />
                }
                startIcon={
                    <BuildIcon
                        sx={{
                            display: { xs: 'inline-flex', sm: 'none' },
                            mr: -0.5,
                        }}
                    />
                }
                sx={{
                    minWidth: { xs: 40, sm: 'auto' },
                    px: { xs: 1, sm: 1.5 },
                }}
            >
                <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {'Generators'}
                </Box>
            </Button>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
            >
                <MenuItem onClick={select(onOpenUriGenerator)}>
                    {'ARC-90 URI Generator'}
                </MenuItem>
                <MenuItem onClick={select(onOpenDeeplinkGenerator)}>
                    {'Pera Deeplink Generator'}
                </MenuItem>
                <MenuItem
                    disabled={!isConnected}
                    onClick={select(onOpenCustomTxn)}
                >
                    {'Create Custom Transaction'}
                </MenuItem>
            </Menu>
        </>
    )
}
