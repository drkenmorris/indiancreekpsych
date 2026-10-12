import type { RvtiItemBase } from "../rvtiTypes";

export const rvtiItemsDomainChildren: RvtiItemBase[] = [
  // DIRECT (3)
  {
    id: "RVTI_CHI_D1",
    domain: "RVTI_CHI",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt:
      "Partners in a serious long-term relationship should be broadly aligned about whether they want children and how they should be raised.",
    tags: ["tier1", "direct", "position"],
  },
  {
    id: "RVTI_CHI_D2",
    domain: "RVTI_CHI",
    kind: "direct",
    scale: "IMPORTANCE_1_10",
    prompt:
      "How important is alignment about children and parenting in a long-term relationship?",
    tags: ["tier1", "direct", "importance"],
  },
  {
    id: "RVTI_CHI_D3",
    domain: "RVTI_CHI",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt:
      "If my partner had very different views from mine about children or parenting, it would feel like a serious threat to the relationship.",
    tags: ["tier1", "direct", "identityFusion"],
  },

  // SCENARIO A (2 follow-ups): one wants children, the other does not
  {
    id: "RVTI_CHI_SA_SEV",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You strongly want children, but your partner tells you they do not want children and do not expect that to change.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_CHI_SA",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_CHI_SA_LIK",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You strongly want children, but your partner tells you they do not want children and do not expect that to change.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_CHI_SA",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },

  // SCENARIO B (3 follow-ups): major discipline/value mismatch
  {
    id: "RVTI_CHI_SB_SEV",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You and your partner agree to have children, but later discover you strongly disagree about discipline, consequences, structure, and what children need most.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_CHI_SB",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_CHI_SB_LIK",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You and your partner agree to have children, but later discover you strongly disagree about discipline, consequences, structure, and what children need most.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_CHI_SB",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },
  {
    id: "RVTI_CHI_SB_TIME",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "Scenario: You and your partner agree to have children, but later discover you strongly disagree about discipline, consequences, structure, and what children need most.\n\nIf this conflict continued, how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_CHI_SB",
    followupRole: "TIME",
    tags: ["tier1", "scenario", "time"],
  },

  // SCENARIO C (2 follow-ups): disagreement over education / developmental priorities
  {
    id: "RVTI_CHI_SC_SEV",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You and your partner sharply disagree about schooling, developmental support, or the kind of environment children should be raised in.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_CHI_SC",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_CHI_SC_LIK",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: You and your partner sharply disagree about schooling, developmental support, or the kind of environment children should be raised in.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_CHI_SC",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },

  // SCENARIO D (3 follow-ups): partner undermines parenting decisions
  {
    id: "RVTI_CHI_SD_SEV",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: After becoming parents, your partner repeatedly undermines your parenting decisions in front of the child and refuses to present a united front.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_CHI_SD",
    followupRole: "SEVERITY",
    tags: ["tier1", "scenario", "severity"],
  },
  {
    id: "RVTI_CHI_SD_LIK",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: After becoming parents, your partner repeatedly undermines your parenting decisions in front of the child and refuses to present a united front.\n\nHow likely would this make you to end the relationship?",
    stemId: "RVTI_CHI_SD",
    followupRole: "LIKELIHOOD",
    tags: ["tier1", "scenario", "likelihood"],
  },
  {
    id: "RVTI_CHI_SD_TIME",
    domain: "RVTI_CHI",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "Scenario: After becoming parents, your partner repeatedly undermines your parenting decisions in front of the child and refuses to present a united front.\n\nIf this pattern continued, how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_CHI_SD",
    followupRole: "TIME",
    tags: ["tier1", "scenario", "time"],
  },
];