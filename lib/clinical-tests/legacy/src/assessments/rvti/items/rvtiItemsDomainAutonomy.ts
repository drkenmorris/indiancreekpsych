import type { RvtiItemBase } from "../rvtiTypes";

export const rvtiItemsDomainAutonomy: RvtiItemBase[] = [
  // DIRECT (3)
  {
    id: "RVTI_AUT_D1",
    domain: "RVTI_AUT",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt: "In a committed relationship, partners should respect each other's need for personal space and independence.",
    tags: ["tier2", "direct", "position"],
  },
  {
    id: "RVTI_AUT_D2",
    domain: "RVTI_AUT",
    kind: "direct",
    scale: "IMPORTANCE_1_10",
    prompt: "How important is alignment about closeness vs independence in a long-term relationship?",
    tags: ["tier2", "direct", "importance"],
  },
  {
    id: "RVTI_AUT_D3",
    domain: "RVTI_AUT",
    kind: "direct",
    scale: "LIKERT_1_7",
    prompt:
      "If my partner needed a very different level of closeness or independence than I do, it would feel like an ongoing threat to the relationship.",
    tags: ["tier2", "direct", "identityFusion"],
  },

  // Scenario A (2 followups): partner demands constant access
  {
    id: "RVTI_AUT_SA_SEV",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner expects frequent check-ins and gets upset if you don’t respond quickly, saying it proves you don’t care.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_AUT_SA",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_AUT_SA_LIK",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_AUT_SA",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },

  // Scenario B (3 followups): chronic emotional distance / withdrawal
  {
    id: "RVTI_AUT_SB_SEV",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner consistently withdraws when you want connection (quiet, unavailable, distracted), and says they “just need space” most of the time.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_AUT_SB",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_AUT_SB_LIK",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_AUT_SB",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },
  {
    id: "RVTI_AUT_SB_TIME",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "If this pattern continued (frequent withdrawal or emotional distance), how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_AUT_SB",
    followupRole: "TIME",
    tags: ["tier2", "scenario", "time"],
  },

  // Scenario C (2 followups): privacy boundaries
  {
    id: "RVTI_AUT_SC_SEV",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner insists that in a committed relationship there should be no privacy (e.g., expects full access to your phone, accounts, and messages at any time).\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_AUT_SC",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_AUT_SC_LIK",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_AUT_SC",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },

  // Scenario D (3 followups): autonomy restriction / guilt-control
  {
    id: "RVTI_AUT_SD_SEV",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt:
      "Scenario: Your partner discourages independent time (friends, hobbies, solo downtime) and uses guilt or anger when you choose to do things without them.\n\nHow emotionally disturbing would this feel to you?",
    stemId: "RVTI_AUT_SD",
    followupRole: "SEVERITY",
    tags: ["tier2", "scenario", "severity"],
  },
  {
    id: "RVTI_AUT_SD_LIK",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "LIKERT_1_7",
    prompt: "How likely would this make you to end the relationship?",
    stemId: "RVTI_AUT_SD",
    followupRole: "LIKELIHOOD",
    tags: ["tier2", "scenario", "likelihood"],
  },
  {
    id: "RVTI_AUT_SD_TIME",
    domain: "RVTI_AUT",
    kind: "scenario_followup",
    scale: "TIME_TOLERANCE",
    prompt:
      "If this pattern continued (guilt, anger, or restrictions around independence), how long could you tolerate it before ending the relationship?",
    stemId: "RVTI_AUT_SD",
    followupRole: "TIME",
    tags: ["tier2", "scenario", "time"],
  },
];