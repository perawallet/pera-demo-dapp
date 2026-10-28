import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
    Box,
    Button,
    Chip,
    Drawer,
    IconButton,
    List,
    ListItem,
    Typography,
    type ChipProps,
} from '@mui/material'

import {
    useToastStore,
    type ToastSeverity,
} from '@components/toast/useToastStore'

const SEVERITY_COLOR: Record<ToastSeverity, ChipProps['color']> = {
    error: 'error',
    warning: 'warning',
    success: 'success',
    info: 'default',
}

interface ActivityLogDrawerProps {
    isOpen: boolean
    onClose: () => void
}

/** Every toast shown this session, newest first. */
export const ActivityLogDrawer = ({
    isOpen,
    onClose,
}: ActivityLogDrawerProps) => {
    const history = useToastStore(state => state.history)
    const clearHistory = useToastStore(state => state.clearHistory)

    return (
        <Drawer
            anchor={'right'}
            open={isOpen}
            onClose={onClose}
        >
            <Box
                sx={{
                    width: { xs: '100vw', sm: 420 },
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                    }}
                >
                    <Typography
                        variant={'h6'}
                        sx={{ flexGrow: 1 }}
                    >
                        {'Activity log'}
                    </Typography>
                    <Button
                        size={'small'}
                        onClick={clearHistory}
                        disabled={history.length === 0}
                    >
                        {'Clear'}
                    </Button>
                    <IconButton
                        size={'small'}
                        onClick={onClose}
                        aria-label={'close'}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                {history.length === 0 ? (
                    <Typography
                        variant={'body2'}
                        sx={{ color: 'text.secondary', mt: 2 }}
                    >
                        {
                            'No activity yet. Toast messages will appear here as they fire.'
                        }
                    </Typography>
                ) : (
                    <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {history.toReversed().map(entry => (
                            <ListItem
                                key={entry.id}
                                divider={true}
                                sx={{
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    py: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.5,
                                    }}
                                >
                                    <Chip
                                        label={entry.severity}
                                        size={'small'}
                                        color={SEVERITY_COLOR[entry.severity]}
                                    />
                                    <Typography
                                        variant={'caption'}
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {new Date(
                                            entry.timestamp,
                                        ).toLocaleTimeString()}
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <IconButton
                                        size={'small'}
                                        aria-label={'Copy message'}
                                        onClick={() =>
                                            void navigator.clipboard.writeText(
                                                entry.message,
                                            )
                                        }
                                    >
                                        <ContentCopyIcon fontSize={'small'} />
                                    </IconButton>
                                </Box>
                                <Typography
                                    variant={'body2'}
                                    sx={{ wordBreak: 'break-word' }}
                                >
                                    {entry.message}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Drawer>
    )
}
