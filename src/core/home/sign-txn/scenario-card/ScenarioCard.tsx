import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {MouseEvent} from "react";

import type {NumberedScenario} from "../../../../scenarios/registry";

interface ScenarioCardProps {
  scenario: NumberedScenario;
  onInvoke: (scenario: NumberedScenario) => void;
  isInvoking: boolean;
}

const ScenarioCard = ({scenario, onInvoke, isInvoking}: ScenarioCardProps) => {
  const handleInvokeClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Prevent the click from toggling the surrounding AccordionSummary
    e.stopPropagation();
    onInvoke(scenario);
  };

  return (
    <Accordion disableGutters={true} square={false}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          sx={{display: "flex", flexDirection: "column", gap: 0.5, width: "100%"}}>
          <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
            <Typography
              variant={"body2"}
              sx={{color: "text.secondary", minWidth: 32}}>
              {`${scenario.number}.`}
            </Typography>
            <Typography variant={"body1"} sx={{fontWeight: 500, flexGrow: 1}}>
              {scenario.title}
            </Typography>
            <Button
              variant={"contained"}
              size={"small"}
              disabled={isInvoking}
              onClick={handleInvokeClick}
              startIcon={
                isInvoking ? (
                  <CircularProgress size={16} color={"inherit"} />
                ) : undefined
              }
              sx={{flexShrink: 0}}>
              {isInvoking ? "Working..." : "Invoke"}
            </Button>
          </Box>
          <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.5}}>
            <Chip
              size={"small"}
              label={scenario.category}
              sx={{
                backgroundColor: "#fef9c3",
                color: "#713f12",
                fontWeight: 500,
                border: "none"
              }}
            />
            {scenario.modifiers.map((m) => (
              <Chip
                key={m}
                size={"small"}
                label={m}
                sx={{
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontWeight: 500,
                  border: "none"
                }}
              />
            ))}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{display: "flex", flexDirection: "column", gap: 1.5}}>
          <Box>
            <Typography
              variant={"caption"}
              sx={{
                display: "block",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
                fontWeight: 600,
                mb: 0.5
              }}>
              {"Description"}
            </Typography>
            <Typography variant={"body2"} sx={{whiteSpace: "pre-wrap"}}>
              {scenario.description}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant={"caption"}
              sx={{
                display: "block",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
                fontWeight: 600,
                mb: 0.5
              }}>
              {"Expected"}
            </Typography>
            <Typography variant={"body2"} sx={{whiteSpace: "pre-wrap"}}>
              {scenario.expected}
            </Typography>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default ScenarioCard;
