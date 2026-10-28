import { useScenarioRunner } from '../hooks/useScenarioRunner'
import { ScenarioList } from './ScenarioList'

export const ScenarioRunner = () => {
    const { scenarios, invokingId, invoke, disabledReason } =
        useScenarioRunner()

    return (
        <ScenarioList
            scenarios={scenarios}
            invokingId={invokingId}
            onInvoke={scenario => void invoke(scenario)}
            disabledReason={disabledReason}
        />
    )
}
