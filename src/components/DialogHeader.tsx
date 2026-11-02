import CloseIcon from '@mui/icons-material/Close'
import { Box, DialogTitle, IconButton } from '@mui/material'

interface DialogHeaderProps {
    title: string
    onClose: () => void
}

export const DialogHeader = ({ title, onClose }: DialogHeaderProps) => (
    <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1 }}>{title}</Box>
        <IconButton
            onClick={onClose}
            aria-label={'close'}
        >
            <CloseIcon />
        </IconButton>
    </DialogTitle>
)
