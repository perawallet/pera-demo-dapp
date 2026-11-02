import type { ReactElement, ReactNode } from 'react'

import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event'

import { theme } from '@app/theme'
import { ToastHost } from '@components/toast/ToastHost'

export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })

/** Renders inside the app's providers with a fresh query client. */
export const renderWithProviders = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => {
    const queryClient = createTestQueryClient()
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
                <ToastHost />
            </ThemeProvider>
        </QueryClientProvider>
    )

    return {
        user: userEvent.setup(),
        queryClient,
        ...render(ui, { wrapper: Wrapper, ...options }),
    }
}

/** user-event without per-event pointer-events checks, which walk computed
 *  styles and dominate run time on the full scenario list. */
export const setupUser = () =>
    userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never })
