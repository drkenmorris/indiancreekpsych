import type { CogTaskDefinition } from "../../engine/TaskRunner";

export const GO_NO_GO_TASK_DEFINITION: CogTaskDefinition = {
  id: "gonogo",
  title: "Go / No-Go",
  description: "Measures inhibitory control and commission errors.",
  estimatedDurationSec: 120,
};