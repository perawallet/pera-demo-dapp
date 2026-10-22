import { useMemo, useState } from 'react'

import { Box } from '@mui/material'

import type { NumberedScenario } from '@scenarios/registry'
import type { ScenarioCategory } from '@scenarios/types'

import { CategoryFilter } from './CategoryFilter'
import { ScenarioCard } from './ScenarioCard'

interface ScenarioListProps {
    scenarios: NumberedScenario[]
    invokingId: string | null
    onInvoke: (scenario: NumberedScenario) => void
    disabledReason: (scenario: NumberedScenario) => string | undefined
}

export const ScenarioList = ({
    scenarios,
    invokingId,
    onInvoke,
    disabledReason,
}: ScenarioListProps) => {
    const [selectedCategories, setSelectedCategories] = useState<
        Set<ScenarioCategory>
    >(new Set())

    const availableCategories = useMemo(
        () => [...new Set(scenarios.map(s => s.category))],
        [scenarios],
    )

    const visible =
        selectedCategories.size === 0
            ? scenarios
            : scenarios.filter(s => selectedCategories.has(s.category))

    return (
        <Box>
            <CategoryFilter
                available={availableCategories}
                selected={selectedCategories}
                onChange={setSelectedCategories}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {visible.map(scenario => (
                    <ScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        onInvoke={onInvoke}
                        isInvoking={invokingId === scenario.id}
                        disabledReason={disabledReason(scenario)}
                    />
                ))}
            </Box>
        </Box>
    )
}
