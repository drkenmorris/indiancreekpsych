// src/asq/teacherItems.ts

import type { InformantType } from "./parentItems";

export interface AsqTeacherItem {
  id: number;
  text: string;
  construct: string;
  informant: InformantType;
}

/**
 * Short-form teacher items – a compact set for school context.
 */
export const teacherItems: AsqTeacherItem[] = [
  {
    id: 1,
    text: "The student has difficulty understanding classroom jokes, sarcasm, or indirect instructions.",
    construct: "SCI_SC",
    informant: "teacher",
  },
  {
    id: 2,
    text: "The student prefers solitary activities over group work or peer interaction.",
    construct: "SCI_RS",
    informant: "teacher",
  },
  {
    id: 3,
    text: "The student becomes notably distressed when schedules or routines change.",
    construct: "RRB_INFLEX",
    informant: "teacher",
  },
  {
    id: 4,
    text: "The student appears unusually sensitive to noise, lights, or other classroom stimuli.",
    construct: "RRB_SENS",
    informant: "teacher",
  },
  {
    id: 5,
    text: "The student has ongoing difficulty organizing materials, assignments, or multi-step tasks.",
    construct: "EXEC_PO",
    informant: "teacher",
  },
];