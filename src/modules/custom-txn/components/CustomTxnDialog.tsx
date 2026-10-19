import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    FormControlLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'

import type { SignerTransaction } from '@perawallet/connect'

import { DialogHeader } from '@components/DialogHeader'
import { FormFields } from '@components/form/FormFields'
import { shortenAddress } from '@lib/format/format'

import { ASSET_CONFIG_ACTIONS, fieldsFor, TXN_TYPE_OPTIONS } from '../fields'
import { useCustomTxnBuilder } from '../hooks/useCustomTxnBuilder'
import type { CustomTxnType } from '../types'

// Identical transactions queued within one round share a txID.
const queueRowKeys = (queue: SignerTransaction[]): string[] => {
    const seen = new Map<string, number>()

    return queue.map(({ txn }) => {
        const id = txn.txID()
        const occurrence = seen.get(id) ?? 0

        seen.set(id, occurrence + 1)

        return `${id}:${occurrence}`
    })
}

interface CustomTxnDialogProps {
    isOpen: boolean
    onClose: () => void
}

export const CustomTxnDialog = ({ isOpen, onClose }: CustomTxnDialogProps) => {
    const {
        sender,
        type,
        form,
        queue,
        shouldSubmit,
        isBusy,
        setType,
        updateForm,
        setShouldSubmit,
        addToQueue,
        groupQueue,
        clearQueue,
        signQueue,
    } = useCustomTxnBuilder()
    const rowKeys = queueRowKeys(queue)

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth={true}
            maxWidth={'md'}
        >
            <DialogHeader
                title={'Create custom transaction'}
                onClose={onClose}
            />

            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        pt: 1,
                    }}
                >
                    <TextField
                        select={true}
                        label={'Transaction type'}
                        value={type}
                        onChange={event =>
                            setType(event.target.value as CustomTxnType)
                        }
                        fullWidth={true}
                        size={'small'}
                    >
                        {TXN_TYPE_OPTIONS.map(option => (
                            <MenuItem
                                key={option.id}
                                value={option.id}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label={'Sender'}
                        value={sender ?? 'Not connected'}
                        disabled={true}
                        fullWidth={true}
                        size={'small'}
                    />

                    {type === 'acfg' && (
                        <Tabs
                            value={form.assetAction}
                            onChange={(_event, assetAction) =>
                                updateForm({ assetAction })
                            }
                            sx={{ borderBottom: 1, borderColor: 'divider' }}
                        >
                            {ASSET_CONFIG_ACTIONS.map(action => (
                                <Tab
                                    key={action.id}
                                    value={action.id}
                                    label={action.label}
                                />
                            ))}
                        </Tabs>
                    )}

                    <FormFields
                        fields={fieldsFor(type, form)}
                        values={form}
                        onChange={updateForm}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={shouldSubmit}
                                onChange={(_event, checked) =>
                                    setShouldSubmit(checked)
                                }
                            />
                        }
                        label={'Submit to the network after signing'}
                    />

                    {queue.length > 0 && (
                        <Box
                            sx={{
                                borderTop: 1,
                                borderColor: 'divider',
                                pt: 1,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography
                                    variant={'subtitle2'}
                                    sx={{ flexGrow: 1 }}
                                >
                                    {`Queued transactions (${queue.length})`}
                                </Typography>
                                <Button
                                    size={'small'}
                                    onClick={clearQueue}
                                    disabled={isBusy}
                                >
                                    {'Clear'}
                                </Button>
                            </Box>
                            <List dense={true}>
                                {queue.map(({ txn }, index) => (
                                    <ListItem
                                        key={rowKeys[index]}
                                        disablePadding={true}
                                    >
                                        <ListItemText
                                            primary={`${index + 1}. ${txn.type}`}
                                            secondary={`${shortenAddress(txn.txID(), 8, 8)}${txn.group ? ' · grouped' : ''}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 1,
                    p: 2,
                }}
            >
                <Button
                    onClick={() => void addToQueue()}
                    disabled={isBusy || !sender}
                    variant={'contained'}
                    fullWidth={true}
                    startIcon={
                        isBusy ? (
                            <CircularProgress
                                size={16}
                                color={'inherit'}
                            />
                        ) : undefined
                    }
                >
                    {`Add ${type} transaction`}
                </Button>
                <Button
                    onClick={groupQueue}
                    disabled={isBusy || queue.length < 2}
                    variant={'outlined'}
                    fullWidth={true}
                >
                    {'Group queued transactions'}
                </Button>
                <Button
                    onClick={() => void signQueue()}
                    disabled={isBusy || queue.length === 0}
                    variant={'contained'}
                    fullWidth={true}
                >
                    {`Sign ${queue.length} transactions`}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
