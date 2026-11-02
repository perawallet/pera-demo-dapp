import { createTheme } from '@mui/material/styles'

const PERA_YELLOW = '#FFEE55'
const PERA_INK = '#0F172A' // slate-900, reads cleanly on yellow

export const theme = createTheme({
    // A class on <html> rather than the media query, so the user can override
    // the system preference from the settings menu.
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
        light: {
            palette: {
                primary: { main: '#1f2937' }, // slate-800
                secondary: { main: '#7c3aed' }, // violet-600
                background: { default: '#f9fafb', paper: '#ffffff' },
            },
        },
        dark: {
            palette: {
                primary: { main: '#e5e7eb' }, // gray-200
                secondary: { main: '#a78bfa' }, // violet-400
                background: { default: '#0b1120', paper: '#111827' },
            },
        },
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
        h6: { fontWeight: 600, letterSpacing: -0.2 },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiAppBar: {
            defaultProps: { elevation: 1, color: 'default' },
            styleOverrides: {
                colorDefault: {
                    backgroundColor: PERA_YELLOW,
                    color: PERA_INK,
                },
            },
        },
    },
})
