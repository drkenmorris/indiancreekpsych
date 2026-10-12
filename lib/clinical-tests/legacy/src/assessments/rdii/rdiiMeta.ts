export const RDII_META = {
  instrument: "Relationship Dynamics and Integrity Inventory",
  acronym: "RDII",
  version: "0.1-dev",
  scale: {
    prompt: "How true is this statement in this relationship over time?",
    anchors: [
      "1 — Not true at all (Never)",
      "2 — Rarely true",
      "3 — Sometimes true",
      "4 — Often true",
      "5 — Very true",
      "6 — Almost always true",
    ],
  },
} as const;