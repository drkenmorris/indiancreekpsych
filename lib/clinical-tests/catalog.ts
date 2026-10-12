/** Stable, server-safe routes for the DSM-aligned clinical prototype migration. */
export const clinicalDevScreenList = [
  ["level1", "DSM Level 1 — Domain Screener"],
  ["level2/neurodevelopmental", "DSM Level 2 — Neurodevelopmental"],
  ["level2/psychotic", "DSM Level 2 — Psychotic"],
  ["level2/bipolar", "DSM Level 2 — Bipolar"],
  ["level2/depression", "DSM Level 2 — Depression"],
  ["level2/anxiety", "DSM Level 2 — Anxiety"],
  ["level2/ocd", "DSM Level 2 — OCD"],
  ["level2/trauma", "DSM Level 2 — Trauma"],
  ["level2/dissociative", "DSM Level 2 — Dissociative"],
  ["level2/somatic", "DSM Level 2 — Somatic"],
  ["level2/eating", "DSM Level 2 — Eating"],
  ["level2/elimination", "DSM Level 2 — Elimination"],
  ["level2/sleep", "DSM Level 2 — Sleep"],
  ["level2/sexual-dysfunction", "DSM Level 2 — Sexual Dysfunction"],
  ["level2/gender-dysphoria", "DSM Level 2 — Gender-Related Distress"],
  ["level2/impulse-conduct", "DSM Level 2 — Impulse / Conduct"],
  ["level2/substance", "DSM Level 2 — Substance Use"],
  ["level2/neurocognitive", "DSM Level 2 — Neurocognitive"],
  ["level2/personality", "DSM Level 2 — Personality"],
  ["level2/paraphilic", "DSM Level 2 — Paraphilic"]
] as const;
export const allowedScreenKeys: string[] = clinicalDevScreenList.map(([key]) => key);
