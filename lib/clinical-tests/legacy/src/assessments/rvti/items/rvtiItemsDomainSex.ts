import type { RvtiItemBase } from "../rvtiTypes";

export const rvtiItemsDomainSex: RvtiItemBase[] = [
  // DIRECT (3)
  {
    id: "RVTI_SEX_D1",
    domain: "RVTI_SEX",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt: "Sexual exclusivity is essential in a committed relationship.",
    tags: ["tier1", "direct", "position"],
  },
  {
    id: "RVTI_SEX_D2",
    domain: "RVTI_SEX",
    kind: "direct",
    scale: "IMPORTANCE_1_10",
    prompt:
      "How important is alignment about sexual exclusivity in a long-term relationship?",
    tags: ["tier1", "direct", "importance"],
  },
  {
    id: "RVTI_SEX_D3",
    domain: "RVTI_SEX",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt:
      "If my partner fundamentally disagreed with my standards about sexual exclusivity, it would feel like a violation of who I am.",
    tags: ["tier1", "direct", "identityFusion"],
  },

  // SCENARIO A (2 follow-ups)
  {
    id: "RVTI_SEX_SA_SEV",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner develops a close emotional connection with someone they find attractive and keeps it going privately, while insisting nothing physical has happened.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_SEX_SA",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_SEX_SA_LIK",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner develops a close emotional connection with someone they find attractive and keeps it going privately, while insisting nothing physical has happened.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_SEX_SA",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },

  // SCENARIO B (2 follow-ups)
  {
    id: "RVTI_SEX_SB_SEV",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You discover your partner regularly views explicit sexual content privately and says it has no impact on their commitment to you.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_SEX_SB",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_SEX_SB_LIK",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You discover your partner regularly views explicit sexual content privately and says it has no impact on their commitment to you.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_SEX_SB",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },

  // SCENARIO C (3 follow-ups)
  {
    id: "RVTI_SEX_SC_SEV",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You discover your partner has been secretly exchanging sexually explicit messages with someone online.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_SEX_SC",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_SEX_SC_LIK",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You discover your partner has been secretly exchanging sexually explicit messages with someone online.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_SEX_SC",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },
  {
    id: "RVTI_SEX_SC_TIME",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "Scenario: You discover your partner has been secretly exchanging sexually explicit messages with someone online.\n\nIf this pattern continued, how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_SEX_SC",
    followupRole: "TIME",
    tags: ["tier1", "scenario", "time"],
  },

  // SCENARIO D (3 follow-ups)
  {
    id: "RVTI_SEX_SD_SEV",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner admits to a one-time sexual encounter, expresses remorse, and wants reconciliation.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_SEX_SD",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_SEX_SD_LIK",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner admits to a one-time sexual encounter, expresses remorse, and wants reconciliation.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_SEX_SD",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },
  {
    id: "RVTI_SEX_SD_TIME",
    domain: "RVTI_SEX",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "Scenario: Your partner admits to a one-time sexual encounter, expresses remorse, and wants reconciliation.\n\nIf trust remained broken or this issue continued to affect the relationship, how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_SEX_SD",
    followupRole: "TIME",
    tags: ["tier1", "scenario", "time"],
  },
];