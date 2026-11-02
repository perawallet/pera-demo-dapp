import { Alert, Snackbar } from '@mui/material'
import type { SnackbarCloseReason } from '@mui/material'

import { useToastStore } from './useToastStore'

/** Renders the current toast. Mount once, near the app root. */
export const ToastHost = () => {
    const toast = useToastStore(state => state.toast)
    const dismiss = useToastStore(state => state.dismiss)

    const handleClose = (_event: unknown, reason?: SnackbarCloseReason) => {
        if (reason !== 'clickaway') {
            dismiss()
        }
    }

    return (
        <Snackbar
            key={toast?.id}
            open={toast?.isOpen ?? false}
            autoHideDuration={toast?.timeout}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert
                onClose={() => dismiss()}
                severity={toast?.severity ?? 'info'}
                variant={'filled'}
                sx={{ width: '100%' }}
            >
                {toast?.message}
            </Alert>
        </Snackbar>
    )
}
