import { useState } from 'react'

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    FormControlLabel,
    MenuItem,
    Select,
    Switch,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'

import { DialogHeader } from '@components/DialogHeader'
import { FormFields } from '@components/form/FormFields'

import type { UriNetwork } from '../builders'
import { buildUri, URI_FORMS, type UriFormValues } from '../uriForms'

const QR_SIZE = 240
const NETWORKS: UriNetwork[] = ['testnet', 'mainnet', 'betanet']

const emptyValues = (): Record<string, UriFormValues> =>
    Object.fromEntries(
        URI_FORMS.map(form => [
            form.id,
            Object.fromEntries(form.fields.map(f => [String(f.name), ''])),
        ]),
    )

interface UriGeneratorDialogProps {
    isOpen: boolean
    onClose: () => void
}

export const UriGeneratorDialog = ({
    isOpen,
    onClose,
}: UriGeneratorDialogProps) => {
    const [activeFormId, setActiveFormId] = useState(URI_FORMS[0].id)
    const [valuesByForm, setValuesByForm] = useState(emptyValues)
    const [isNetworkPrefixed, setNetworkPrefixed] = useState(false)
    const [network, setNetwork] = useState<UriNetwork>('testnet')

    const activeForm =
        URI_FORMS.find(form => form.id === activeFormId) ?? URI_FORMS[0]
    const values = valuesByForm[activeForm.id]
    const uri = buildUri(
        activeForm,
        values,
        isNetworkPrefixed ? network : undefined,
    )

    const updateValues = (changes: Partial<UriFormValues>) =>
        setValuesByForm(previous => ({
            ...previous,
            [activeForm.id]: {
                ...previous[activeForm.id],
                ...(changes as UriFormValues),
            },
        }))

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth={true}
            maxWidth={'md'}
        >
            <DialogHeader
                title={'URI Generator (ARC-90)'}
                onClose={onClose}
            />
            <DialogContent>
                <Tabs
                    value={activeForm.id}
                    onChange={(_event, id: string) => setActiveFormId(id)}
                    variant={'scrollable'}
                    scrollButtons={'auto'}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    {URI_FORMS.map(form => (
                        <Tab
                            key={form.id}
                            value={form.id}
                            label={form.label}
                        />
                    ))}
                </Tabs>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        py: 2,
                    }}
                >
                    <FormFields
                        fields={activeForm.fields}
                        values={values}
                        onChange={updateValues}
                    />
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        my: 2,
                    }}
                >
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isNetworkPrefixed}
                                onChange={event =>
                                    setNetworkPrefixed(event.target.checked)
                                }
                            />
                        }
                        label={'Include network prefix'}
                    />
                    {isNetworkPrefixed && (
                        <Select
                            size={'small'}
                            value={network}
                            onChange={event => setNetwork(event.target.value)}
                        >
                            {NETWORKS.map(option => (
                                <MenuItem
                                    key={option}
                                    value={option}
                                >
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    )}
                </Box>

                {uri && (
                    <Box
                        sx={{
                            mt: 3,
                            pt: 2,
                            borderTop: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Typography
                                component={'code'}
                                sx={{
                                    flex: 1,
                                    px: 1.5,
                                    py: 1,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1,
                                    fontSize: 12,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {uri}
                            </Typography>
                            <Button
                                onClick={() =>
                                    void navigator.clipboard.writeText(uri)
                                }
                                variant={'contained'}
                                size={'small'}
                            >
                                {'Copy'}
                            </Button>
                            <Button
                                component={'a'}
                                href={uri}
                                variant={'outlined'}
                                size={'small'}
                            >
                                {'Open'}
                            </Button>
                        </Box>
                        <QRCodeSVG
                            value={uri}
                            size={QR_SIZE}
                        />
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    )
}
