import {Box, Chip} from "@mui/material";

import type {ScenarioCategory} from "../../../../scenarios/types";

interface CategoryFilterProps {
  available: ScenarioCategory[];
  selected: Set<ScenarioCategory>;
  onChange: (next: Set<ScenarioCategory>) => void;
}

const CategoryFilter = ({available, selected, onChange}: CategoryFilterProps) => {
  const toggle = (category: ScenarioCategory) => {
    const next = new Set(selected);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onChange(next);
  };

  const allSelected = selected.size === 0;

  return (
    <Box sx={{display: "flex", flexWrap: "wrap", gap: 1, mb: 2}}>
      <Chip
        label={"All"}
        clickable={true}
        onClick={() => onChange(new Set())}
        variant={allSelected ? "filled" : "outlined"}
        color={allSelected ? "primary" : "default"}
      />
      {available.map((c) => {
        const isSelected = selected.has(c);
        return (
          <Chip
            key={c}
            label={c}
            clickable={true}
            onClick={() => toggle(c)}
            variant={isSelected ? "filled" : "outlined"}
            color={isSelected ? "primary" : "default"}
          />
        );
      })}
    </Box>
  );
};

export default CategoryFilter;
