import { useState } from 'react'

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    Link,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'

import { DialogHeader } from '@components/DialogHeader'

import {
    buildDeeplink,
    LINK_TYPES,
    type DeeplinkResult,
    type LinkType,
} from '../buildDeeplink'
import { DEEP_LINKS } from '../deeplinks'

const QR_CODE_SIZE = 200

interface DeeplinkDialogProps {
    isOpen: boolean
    onClose: () => void
}

export const DeeplinkDialog = ({ isOpen, onClose }: DeeplinkDialogProps) => {
    const [linkType, setLinkType] = useState<LinkType>('new')
    const [destinationKey, setDestinationKey] = useState('')
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [result, setResult] = useState<DeeplinkResult | null>(null)

    const destination = DEEP_LINKS.find(d => d.key === destinationKey)

    const handleDestinationChange = (key: string) => {
        setDestinationKey(key)
        setInputs({})
        setResult(null)
    }

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth={true}
            maxWidth={'md'}
        >
            <DialogHeader
                title={'Pera Deeplink Generator'}
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
                        label={'Link type'}
                        value={linkType}
                        onChange={e => setLinkType(e.target.value as LinkType)}
                        fullWidth={true}
                    >
                        {LINK_TYPES.map(type => (
                            <MenuItem
                                key={type.key}
                                value={type.key}
                            >
                                {type.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select={true}
                        label={'Destination'}
                        value={destinationKey}
                        onChange={e => handleDestinationChange(e.target.value)}
                        fullWidth={true}
                    >
                        <MenuItem value={''}>
                            <em>{'-- Select --'}</em>
                        </MenuItem>
                        {DEEP_LINKS.map(link => (
                            <MenuItem
                                key={link.key}
                                value={link.key}
                            >
                                {link.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    {destination?.params.map(param => (
                        <TextField
                            key={param.id}
                            name={param.id}
                            label={param.label || param.id}
                            required={param.required}
                            value={inputs[param.id] ?? ''}
                            onChange={e =>
                                setInputs(previous => ({
                                    ...previous,
                                    [param.id]: e.target.value,
                                }))
                            }
                            placeholder={param.id}
                            fullWidth={true}
                        />
                    ))}

                    <Button
                        onClick={() =>
                            destination &&
                            setResult(
                                buildDeeplink(destination, linkType, inputs),
                            )
                        }
                        disabled={!destination}
                        variant={'contained'}
                        fullWidth={true}
                    >
                        {'Generate'}
                    </Button>

                    {result && 'error' in result && (
                        <Alert severity={'error'}>{result.error}</Alert>
                    )}

                    {result && 'url' in result && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                mt: 1,
                            }}
                        >
                            <Typography
                                variant={'body2'}
                                sx={{ wordBreak: 'break-all' }}
                            >
                                <Link
                                    href={result.url}
                                    target={'_blank'}
                                    rel={'noopener noreferrer'}
                                >
                                    {result.url}
                                </Link>
                            </Typography>
                            <QRCodeSVG
                                value={result.url}
                                size={QR_CODE_SIZE}
                            />
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    )
}
