import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Balances change only when the user acts; scenarios invalidate
            // explicitly, so focus refetches would just add algod traffic.
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})
