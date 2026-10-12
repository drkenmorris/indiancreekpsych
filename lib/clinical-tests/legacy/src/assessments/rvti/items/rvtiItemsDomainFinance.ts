import type { RvtiItemBase } from "../rvtiTypes";

export const rvtiItemsDomainFinance: RvtiItemBase[] = [
  // DIRECT (3)
  {
    id: "RVTI_FIN_D1",
    domain: "RVTI_FIN",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt: "In a committed relationship, major financial decisions should be made transparently and collaboratively.",
    tags: ["tier2", "direct", "position"],
  },
  {
    id: "RVTI_FIN_D2",
    domain: "RVTI_FIN",
    kind: "direct",
    scale: "IMPORTANCE_1_10",
    prompt: "How important is financial alignment and transparency in a long-term relationship?",
    tags: ["tier2", "direct", "importance"],
  },
  {
    id: "RVTI_FIN_D3",
    domain: "RVTI_FIN",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt:
      "If my partner had a very different philosophy about spending, saving, or financial transparency, it would feel like a serious threat to the relationship.",
    tags: ["tier2", "direct", "identityFusion"],
  },

  // Scenario A (2 followups): unplanned big purchase
  {
    id: "RVTI_FIN_SA_SEV",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner makes a major purchase (e.g., $3,000+) without consulting you, then says, “It’s my money; I don’t need permission.”\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_FIN_SA",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_FIN_SA_LIK",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_FIN_SA",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },

  // Scenario B (3 followups): secrecy/hidden account or debt
  {
    id: "RVTI_FIN_SB_SEV",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You discover your partner has been hiding a credit card, significant debt, or a separate account they never disclosed.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_FIN_SB",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_FIN_SB_LIK",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_FIN_SB",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },
  {
    id: "RVTI_FIN_SB_TIME",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt: "If this pattern continued (secrecy or hidden obligations), how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_FIN_SB",
    followupRole: "TIME",
    tags: ["tier2", "scenario", "time"],
  },

  // Scenario C (2 followups): risk tolerance mismatch (investing/gambling)
  {
    id: "RVTI_FIN_SC_SEV",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner repeatedly takes financial risks you consider reckless (e.g., high-risk trades, gambling, major speculative purchases), insisting the upside is worth it.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_FIN_SC",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_FIN_SC_LIK",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_FIN_SC",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },

  // Scenario D (3 followups): control/withholding access
  {
    id: "RVTI_FIN_SD_SEV",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner uses money to control choices (e.g., withholding access, threatening financial consequences, or making you justify normal expenses).\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_FIN_SD",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_FIN_SD_LIK",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_FIN_SD",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },
  {
    id: "RVTI_FIN_SD_TIME",
    domain: "RVTI_FIN",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt: "If this pattern continued (financial control or coercion), how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_FIN_SD",
    followupRole: "TIME",
    tags: ["tier2", "scenario", "time"],
  },
];