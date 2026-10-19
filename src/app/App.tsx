import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'

import { ToastHost } from '@components/toast/ToastHost'
import { HomeScreen } from '@modules/home/HomeScreen'
import { useWalletSessionSync } from '@modules/session/hooks/useWalletSession'

import { queryClient } from './queryClient'
import { theme } from './theme'

export const App = () => {
    useWalletSessionSync()

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <HomeScreen />
                <ToastHost />
            </ThemeProvider>
        </QueryClientProvider>
    )
}
