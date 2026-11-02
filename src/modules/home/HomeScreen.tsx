import { useState } from 'react'

import { Container } from '@mui/material'

import { AccountSummary } from '@modules/account/components/AccountSummary'
import { CustomTxnDialog } from '@modules/custom-txn/components/CustomTxnDialog'
import { DeeplinkDialog } from '@modules/deeplink/components/DeeplinkDialog'
import { ScenarioRunner } from '@modules/scenario-runner/components/ScenarioRunner'
import { UriGeneratorDialog } from '@modules/uri-generator/components/UriGeneratorDialog'
import { WalletConnectUi } from '@modules/wallet-connect/components/WalletConnectUi'

import { ActivityLogDrawer } from './components/ActivityLogDrawer'
import { AppHeader } from './components/AppHeader'
import { MainNetBanner } from './components/MainNetBanner'

type Panel = 'uri' | 'deeplink' | 'custom-txn' | 'activity-log'

export const HomeScreen = () => {
    const [openPanel, setOpenPanel] = useState<Panel | null>(null)

    const open = (panel: Panel) => () => setOpenPanel(panel)
    const close = () => setOpenPanel(null)

    return (
        <>
            <AppHeader
                onOpenUriGenerator={open('uri')}
                onOpenDeeplinkGenerator={open('deeplink')}
                onOpenCustomTxn={open('custom-txn')}
                onOpenActivityLog={open('activity-log')}
            />
            <MainNetBanner />

            <Container
                component={'main'}
                maxWidth={'lg'}
                sx={{ my: 3 }}
            >
                <AccountSummary />
                <ScenarioRunner />
            </Container>

            <UriGeneratorDialog
                isOpen={openPanel === 'uri'}
                onClose={close}
            />
            <DeeplinkDialog
                isOpen={openPanel === 'deeplink'}
                onClose={close}
            />
            <CustomTxnDialog
                isOpen={openPanel === 'custom-txn'}
                onClose={close}
            />
            <ActivityLogDrawer
                isOpen={openPanel === 'activity-log'}
                onClose={close}
            />
            <WalletConnectUi />
        </>
    )
}
