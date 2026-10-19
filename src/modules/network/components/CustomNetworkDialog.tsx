import { useState } from 'react'

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material'
import algosdk from 'algosdk'

import {
    getCustomNetworkSettings,
    LOCALNET_DEFAULTS,
    type CustomNetworkSettings,
} from '@lib/algod/networks'

/** algod's genesis ID for Algorand MainNet. Used to surface a real-ALGO
 *  warning when Test connection resolves to it. */
const MAINNET_GENESIS_ID = 'mainnet-v1.0'

const isHttpUrl = (value: string): boolean => {
    try {
        const url = new URL(value)

        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

interface TestResult {
    severity: 'success' | 'warning' | 'error'
    message: string
}

// Builds a throwaway client rather than going through clientForChain, so the
// endpoint can be tested before it is saved.
const testConnection = async ({
    baseServer,
    port,
    token,
}: CustomNetworkSettings): Promise<TestResult> => {
    try {
        const params = await new algosdk.Algodv2(token, baseServer, port)
            .getTransactionParams()
            .do()

        return params.genesisID === MAINNET_GENESIS_ID
            ? {
                  severity: 'warning',
                  message: `Connected, but this is MAINNET (genesis ${params.genesisID}). Transactions here spend real ALGO.`,
              }
            : {
                  severity: 'success',
                  message: `Connected. Genesis ID: ${params.genesisID}`,
              }
    } catch (error) {
        return {
            severity: 'error',
            message: `${error instanceof Error ? error.message : error}`,
        }
    }
}

interface CustomNetworkDialogProps {
    isOpen: boolean
    onClose: VoidFunction
    onSave: (settings: CustomNetworkSettings) => void
}

export const CustomNetworkDialog = ({
    isOpen,
    onClose,
    onSave,
}: CustomNetworkDialogProps) => {
    const stored = getCustomNetworkSettings()
    const [baseServer, setBaseServer] = useState(
        stored.baseServer || LOCALNET_DEFAULTS.baseServer,
    )
    const [port, setPort] = useState(
        String(stored.port ?? LOCALNET_DEFAULTS.port),
    )
    const [token, setToken] = useState(stored.token || LOCALNET_DEFAULTS.token)
    const [testResult, setTestResult] = useState<TestResult | null>(null)
    const [isTesting, setTesting] = useState(false)

    const isBaseServerValid = isHttpUrl(baseServer)

    const settings = (): CustomNetworkSettings => ({
        baseServer: baseServer.trim(),
        port: port.trim(),
        token: token.trim(),
    })

    const handleTestConnection = async () => {
        setTesting(true)
        setTestResult(null)
        setTestResult(await testConnection(settings()))
        setTesting(false)
    }

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth={true}
            maxWidth={'sm'}
        >
            <DialogTitle>{'Custom network'}</DialogTitle>
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
                        label={'Algod URL'}
                        value={baseServer}
                        onChange={e => setBaseServer(e.target.value)}
                        error={!isBaseServerValid}
                        helperText={
                            isBaseServerValid
                                ? 'Include the scheme, e.g. http://localhost'
                                : 'Enter a valid URL including the scheme'
                        }
                        fullWidth={true}
                    />
                    <TextField
                        label={'Port'}
                        value={port}
                        onChange={e => setPort(e.target.value)}
                        helperText={"Leave blank for the URL's default port"}
                        fullWidth={true}
                    />
                    <TextField
                        label={'Algod token'}
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        helperText={"AlgoKit LocalNet uses 64 'a' characters"}
                        fullWidth={true}
                    />
                    {testResult && (
                        <Alert severity={testResult.severity}>
                            {testResult.message}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => void handleTestConnection()}
                    disabled={!isBaseServerValid || isTesting}
                >
                    {isTesting ? 'Testing…' : 'Test connection'}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={onClose}>{'Cancel'}</Button>
                <Button
                    variant={'contained'}
                    disabled={!isBaseServerValid}
                    onClick={() => onSave(settings())}
                >
                    {'Save and switch'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
