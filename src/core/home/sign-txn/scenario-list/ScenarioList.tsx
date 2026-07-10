import {useMemo, useState} from "react";
import {Box} from "@mui/material";

import ScenarioCard from "../scenario-card/ScenarioCard";
import CategoryFilter from "./CategoryFilter";
import type {ScenarioCategory} from "../../../../scenarios/types";
import type {NumberedScenario} from "../../../../scenarios/registry";

interface ScenarioListProps {
  scenarios: NumberedScenario[];
  onInvoke: (scenario: NumberedScenario) => void;
  invokingId: string | null;
  connectedAccountCount: number;
}

const ScenarioList = ({
  scenarios,
  onInvoke,
  invokingId,
  connectedAccountCount
}: ScenarioListProps) => {
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ScenarioCategory>
  >(new Set());

  const availableCategories = useMemo(() => {
    const set = new Set<ScenarioCategory>();
    scenarios.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [scenarios]);

  const visible =
    selectedCategories.size === 0
      ? scenarios
      : scenarios.filter((s) => selectedCategories.has(s.category));

  return (
    <Box>
      <CategoryFilter
        available={availableCategories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
      />
      <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
        {visible.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            onInvoke={onInvoke}
            isInvoking={invokingId === s.id}
            disabledReason={
              s.minAccounts && connectedAccountCount < s.minAccounts
                ? `Connect ${s.minAccounts}+ accounts to run this`
                : undefined
            }
          />
        ))}
      </Box>
    </Box>
  );
};

export default ScenarioList;
