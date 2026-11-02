import { screen, within } from '@testing-library/react'

// Role queries compute accessibility for every node; scoping them to a small
// subtree keeps them fast next to the full scenario list.

export const header = () => {
    const element = document.querySelector('header')

    if (!element) {
        throw new Error('App header not rendered')
    }

    return within(element)
}

export const openMenu = async () => within(await screen.findByRole('menu'))

export const openDialog = async () => within(await screen.findByRole('dialog'))

/** The card for a scenario, located by its exact title. */
export const scenarioCard = (title: string) => {
    const card = screen.getByText(title).closest('.MuiAccordion-root')

    if (!(card instanceof HTMLElement)) {
        throw new Error(`No scenario card titled "${title}"`)
    }

    return within(card)
}
