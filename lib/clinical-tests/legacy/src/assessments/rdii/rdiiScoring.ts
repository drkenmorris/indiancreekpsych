// src/assessments/rdii/rdiiScoring.ts
import type {
  AssessmentItem,
  AssessmentResponse,
  Likert6,
  Subscale,
  Domain,
} from "./rdiiTypes";

/**
 * RDII scoring is criterion-referenced (0–100). A simple T-like display transform is
 * provided for consistency in UI; it is NOT normative.
 *
 * Hard requirements honored:
 * - Preserve Domain/Subscale unions from rdiiTypes.ts (no renames).
 * - Validity: keep VAL1/VAL2; VAL2 uses paired-contradiction inconsistency (no new items).
 * - verbatimModuleSyntax-safe (type-only imports).
 */

export type Polarity = "HEALTHY_HIGH" | "RISK_HIGH" | "VALIDITY";
export type SeverityBand = "LOW" | "MILD" | "MODERATE" | "HIGH";

export type Scaled = {
  score: number; // 0..100
  t: number; // 20..80 (display-only)
};

export type SubscaleScore = {
  mean: number;
  score: number; // 0..100
  answered: number;
  total: number;
  // for VAL2_INCONSISTENCY only
  pairsUsed?: number;
  pairsTotal?: number;
};

export type SubscaleReport = {
  title: string;
  score: number; // 0..100
  t: number;
  band: SeverityBand;
  polarity: Polarity;
  answered: number;
  total: number;
  narrative: string;
  bullets: string[];
};

export type IndexId = "REI" | "EPI" | "RVI";

export type IndexReport = {
  id: IndexId;
  title: string;
  score: number; // 0..100
  t: number;
  band: SeverityBand;
  narrative: string;
  bullets: string[];
  components: Array<{ subscale: Subscale; weight: number; score: number }>;
};

// Back-compat with earlier imports
export type IndexResult = IndexReport;

export type RDIIReport = {
  domain?: Domain;
  answeredItems: number;
  totalItems: number;
  subscales: Record<string, SubscaleReport>;
  indices: Partial<Record<IndexId, IndexReport>>;
  summary: string;
  validityFlags: string[];
};

function reverseLikert6(v: Likert6): Likert6 {
  return (7 - v) as Likert6;
}

function keyedValue(item: AssessmentItem, r: Likert6): Likert6 {
  return item.reverse ? reverseLikert6(r) : r;
}

/**
 * Polarity tells the report layer how to interpret higher scores.
 * - HEALTHY_HIGH: higher is better/healthier
 * - RISK_HIGH: higher is more toxic/risky
 * - VALIDITY: higher typically indicates a stronger flag
 */
export const SUBSCALE_POLARITY: Record<string, Polarity> = {
  I1_REGULATION_PATIENCE: "HEALTHY_HIGH",
  I2_KINDNESS: "HEALTHY_HIGH",
  I3_HUMILITY: "HEALTHY_HIGH",
  I4_HONOR_RESPECT: "HEALTHY_HIGH",
  I5_INTEGRITY_TRUTH: "HEALTHY_HIGH",
  I6_MERCY_NO_SCOREKEEPING: "HEALTHY_HIGH",
  I7_PROTECTIVE_LOYALTY: "HEALTHY_HIGH",
  I8_ENDURING_COMMITMENT: "HEALTHY_HIGH",
  II1_SECURE_BASE: "HEALTHY_HIGH",
  II2_ADMIRATION_FONDNESS: "HEALTHY_HIGH",
  II3_EMOTIONAL_INTIMACY: "HEALTHY_HIGH",
  II4_ENJOYMENT_FRIENDSHIP: "HEALTHY_HIGH",
  II5_SHARED_MEANING_TEAM: "HEALTHY_HIGH",
  II6_DEDICATION_WANT_TO: "HEALTHY_HIGH",
  II7_GROWTH_SUPPORT: "HEALTHY_HIGH",
  III1_TRAUMA_BONDING_INTERMITTENT: "RISK_HIGH",
  III2_ATTACHMENT_ANXIETY: "RISK_HIGH",
  III3_IDENTITY_FUSION: "RISK_HIGH",
  III4_FEAR_OBLIGATION_GUILT: "RISK_HIGH",
  III5_FINANCIAL_PRACTICAL_DEPENDENCY: "RISK_HIGH",
  III6_SOCIAL_FAMILY_PRESSURE_REPUTATION: "RISK_HIGH",
  III7_CHILDREN_PARENTING_TIES: "RISK_HIGH",
  III8_FEAR_INTIMIDATION_COERCIVE_CONTROL: "RISK_HIGH",
  III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS: "RISK_HIGH",
  IV1_CRITICISM: "RISK_HIGH",
  IV2_CONTEMPT: "RISK_HIGH",
  IV3_DEFENSIVENESS: "RISK_HIGH",
  IV4_STONEWALLING_WITHDRAWAL: "RISK_HIGH",
  IV5_REPAIR_FAILURE: "RISK_HIGH",
  IV6_SUCCESSFUL_REPAIR: "HEALTHY_HIGH",
  V1_PROCESS_NEGATIVE: "RISK_HIGH",
  V2_PROCESS_POSITIVE: "HEALTHY_HIGH",
  V3_PROCESS_FOCUSED: "HEALTHY_HIGH",
  VI1_POWER_EQUITY_RESPECT: "HEALTHY_HIGH",
  VI2_COERCIVE_CONTROL_MONITORING: "RISK_HIGH",
  VI3_SAFETY_VIOLATION_DISRESPECT: "RISK_HIGH",
  VI4_SAFETY_SUPPORT_PROTECTION: "HEALTHY_HIGH",
  VII1_HOPE_FOR_CHANGE: "HEALTHY_HIGH",
  VII2_EXIT_READINESS: "RISK_HIGH",
  VII3_ENTRAPMENT_CONSTRAINTS: "RISK_HIGH",
  VAL1_RESPONSE_STYLE: "VALIDITY",
  VAL2_INCONSISTENCY: "VALIDITY",
  VAL_VALIDITY: "VALIDITY",
  VAL1_VIRTUE_IDEALIZATION: "VALIDITY",
  VAL2_BLAME_RIGIDITY: "VALIDITY",
  VAL3_DISCLOSURE: "VALIDITY",
  VAL4_CARELESS_RANDOM: "VALIDITY",
};

export function bandFromScore(score0to100: number, polarity: Polarity): SeverityBand {
  if (!Number.isFinite(score0to100)) return "MILD";
  const s = Math.max(0, Math.min(100, score0to100));

  if (polarity === "HEALTHY_HIGH") {
    if (s >= 80) return "LOW";
    if (s >= 60) return "MILD";
    if (s >= 40) return "MODERATE";
    return "HIGH";
  }

  if (polarity === "RISK_HIGH") {
    if (s <= 20) return "LOW";
    if (s <= 40) return "MILD";
    if (s <= 60) return "MODERATE";
    return "HIGH";
  }

  // VALIDITY
  if (s <= 33) return "LOW";
  if (s <= 50) return "MILD";
  if (s <= 66) return "MODERATE";
  return "HIGH";
}

export function toScaled(score0to100: number): Scaled {
  const s = Math.max(0, Math.min(100, score0to100));
  // 0->20, 100->80 (simple display mapping)
  return { score: s, t: 20 + 0.6 * s };
}

function titleForSubscale(subscale: Subscale): string {
  // default titles are subscale IDs unless specialized below
  switch (subscale) {
    case "IV2_CONTEMPT":
      return "Contempt";
    case "IV5_REPAIR_FAILURE":
      return "Repair Failure";
    case "VAL1_RESPONSE_STYLE":
      return "Response Style";
    case "VAL2_INCONSISTENCY":
      return "Inconsistency";
    default:
      return subscale;
  }
}

function narrativeForSubscale(subscale: Subscale, scaled: Scaled): { title: string; bullets: string[] } {
  const polarity = SUBSCALE_POLARITY[subscale];
  const band = bandFromScore(scaled.score, polarity);

  const base = (title: string, bullets: string[]) => ({ title, bullets });

  switch (subscale) {
    case "IV2_CONTEMPT":
      return base("Contempt", [
        band === "HIGH"
          ? "Strong signals of contempt (mocking, sarcasm, disgust, name-calling, eye-rolling)."
          : "Contempt appears limited or well-contained.",
        "Contempt becomes especially destructive when it turns into a reflexive tone of disrespect.",
        "Focus: respectful complaint + softer startup + rapid repair attempts.",
      ]);

    case "IV5_REPAIR_FAILURE":
      return base("Repair Failure", [
        band === "HIGH"
          ? "Repair attempts are often missed, rejected, or escalated into further conflict."
          : "Repair attempts are usually noticed and have some effectiveness.",
        "Repair failure can look like: refusing to pause, continuing past exhaustion, or interpreting repair bids as manipulation.",
        "Focus: explicit repair phrases + time-outs with return plans + accepting small bids for reconnection.",
      ]);

    case "VAL2_INCONSISTENCY":
      return base("Inconsistency", [
        band === "HIGH"
          ? "Responses contain internal contradictions, suggesting confusion, carelessness, or unstable responding."
          : "Response pattern appears reasonably consistent.",
        "If elevated, interpret other scales cautiously and consider retest or item review.",
      ]);

    case "VAL1_RESPONSE_STYLE":
      return base("Response Style", [
        band === "HIGH"
          ? "Response style is highly extreme (many 1/6 choices). This can inflate or distort scale scores."
          : "Response style does not show strong extreme responding.",
        "If elevated, interpret other scales cautiously and consider re-taking with slower, more deliberate responding.",
      ]);

    default: {
      if (polarity === "HEALTHY_HIGH") {
        return base(titleForSubscale(subscale), [
          band === "HIGH"
            ? "This area looks underdeveloped or unreliable right now (low strength)."
            : "This area shows usable strengths.",
          "Interpretation is criterion-referenced (bands), not population norms yet.",
        ]);
      }

      if (polarity === "RISK_HIGH") {
        return base(titleForSubscale(subscale), [
          band === "HIGH"
            ? "This pattern appears frequent/intense and may be actively harming the relationship."
            : "This risk pattern looks limited or situational.",
          "Interpretation is criterion-referenced (bands), not population norms yet.",
        ]);
      }

      return base(titleForSubscale(subscale), [
        "Validity scale interpretation depends on thresholds and patterns across the validity set.",
      ]);
    }
  }
}

export function scoreSubscale(
  items: AssessmentItem[],
  responses: AssessmentResponse,
  subscale: Subscale
): SubscaleScore {
  const subItems = items.filter((i) => i.subscale === subscale);
  const values: number[] = [];

  for (const item of subItems) {
    const r = responses[item.id];
    if (!r) continue;
    values.push(keyedValue(item, r));
  }

  const answered = values.length;
  const total = subItems.length;

  if (answered === 0) return { mean: Number.NaN, score: Number.NaN, answered, total };

  const mean = values.reduce((a, b) => a + b, 0) / answered;
  const score = ((mean - 1) / 5) * 100;

  return { mean, score, answered, total };
}

/**
 * VAL2_INCONSISTENCY pairs are derived from the existing item bank WITHOUT adding items.
 * We look for subscales that have both forward and reverse items and pair one forward with one reverse.
 */
export function getDefaultInconsistencyPairs(items: AssessmentItem[], maxPairs = 14): Array<[number, number]> {
  const bySub: Record<string, AssessmentItem[]> = {};
  for (const it of items) {
    if (it.subscale.startsWith("VAL")) continue;
    (bySub[it.subscale] ||= []).push(it);
  }

  const pairs: Array<[number, number]> = [];
  for (const subscale of Object.keys(bySub)) {
    const subItems = bySub[subscale].slice().sort((a, b) => a.id - b.id);
    const forward = subItems.filter((i) => !i.reverse);
    const reverse = subItems.filter((i) => i.reverse);
    if (forward.length === 0 || reverse.length === 0) continue;

    const a = forward[0];
    const b = reverse[reverse.length - 1];
    if (a.id !== b.id) pairs.push([a.id, b.id]);
    if (pairs.length >= maxPairs) break;
  }
  return pairs;
}

function scoreInconsistency(
  items: AssessmentItem[],
  responses: AssessmentResponse,
  pairs: Array<[number, number]>
): SubscaleScore {
  const itemById = new Map<number, AssessmentItem>();
  for (const it of items) itemById.set(it.id, it);

  let pairsUsed = 0;
  let totalDiff = 0;

  for (const [aId, bId] of pairs) {
    const ra = responses[aId];
    const rb = responses[bId];
    if (!ra || !rb) continue;

    const ia = itemById.get(aId);
    const ib = itemById.get(bId);
    if (!ia || !ib) continue;

    const va = keyedValue(ia, ra);
    const vb = keyedValue(ib, rb);

    // In perfect contradiction pairs, keyed values should be close.
    const diff = Math.abs(va - vb); // 0..5
    totalDiff += diff;
    pairsUsed += 1;
  }

  const pairsTotal = pairs.length;
  if (pairsUsed === 0) {
    return {
      mean: Number.NaN,
      score: Number.NaN,
      answered: 0,
      total: pairsTotal,
      pairsUsed,
      pairsTotal,
    };
  }

  const meanDiff = totalDiff / pairsUsed; // 0..5
  // Convert to 0..100 where higher = more inconsistent
  const score = (meanDiff / 5) * 100;

  return {
    mean: meanDiff,
    score,
    answered: pairsUsed,
    total: pairsTotal,
    pairsUsed,
    pairsTotal,
  };
}

/**
 * VAL1_RESPONSE_STYLE: detects extreme responding (lots of 1s and 6s).
 * Returns 0..100, where higher = more extreme style.
 *
 * If explicit VAL1 items exist but were not answered (because they weren't shown),
 * we fall back to deriving response style from ALL answered non-validity items.
 */
function scoreResponseStyle(items: AssessmentItem[], responses: AssessmentResponse): SubscaleScore {
  const explicitItems = items.filter((i) => i.subscale === "VAL1_RESPONSE_STYLE");
  if (explicitItems.length > 0) {
    const explicit = scoreSubscale(items, responses, "VAL1_RESPONSE_STYLE");
    if (Number.isFinite(explicit.score) && explicit.answered > 0) return explicit;
  }

  let answered = 0;
  let extreme = 0;
  for (const it of items) {
    if (it.subscale.startsWith("VAL")) continue;
    const r = responses[it.id];
    if (!r) continue;
    answered += 1;
    if (r === 1 || r === 6) extreme += 1;
  }

  if (answered === 0) return { mean: Number.NaN, score: Number.NaN, answered: 0, total: 0 };

  const pctExtreme = extreme / answered; // 0..1
  return { mean: pctExtreme, score: pctExtreme * 100, answered, total: answered };
}

function buildIndex(
  id: IndexId,
  title: string,
  components: Array<{ subscale: Subscale; weight: number; score: number }>,
  bandPolarity: Polarity
): IndexReport {
  const totalW = components.reduce((a, c) => a + c.weight, 0) || 1;
  const weighted = components.reduce((a, c) => a + c.weight * c.score, 0) / totalW;
  const scaled = toScaled(weighted);

  const band = bandFromScore(scaled.score, bandPolarity);

  let narrative = "";
  const bullets: string[] = [];

  if (id === "REI") {
    narrative =
      band === "HIGH"
        ? "Entrapment indicators are strongly elevated: the relationship may feel hard to leave even when it is painful."
        : band === "MODERATE"
          ? "Entrapment indicators are present: some forces may be keeping the relationship stuck."
          : "Entrapment indicators look limited: leaving (if needed) may feel more feasible.";
    bullets.push(
      "High REI often reflects constraint + fear + dependency patterns (not a moral failing).",
      "Interventions: increase safety, restore autonomy, reduce coercion/pressure, expand practical options."
    );
  } else if (id === "EPI") {
    narrative =
      band === "HIGH"
        ? "Exit probability markers are elevated: the person may be nearing a decision point or actively preparing to leave."
        : band === "MODERATE"
          ? "Exit markers are mixed: some readiness exists, but ambivalence or barriers remain."
          : "Exit markers are low: the person is not currently oriented toward leaving.";
    bullets.push(
      "EPI is about readiness + feasibility signals, not a recommendation.",
      "If safety is compromised, prioritize a safety plan regardless of EPI."
    );
  } else {
    narrative =
      band === "HIGH"
        ? "Relational virtue/protective factors are strongly present and usable."
        : band === "MODERATE"
          ? "Relational virtue/protective factors are mixed and may depend on context."
          : "Relational virtue/protective factors look weak or inconsistent right now.";
    bullets.push(
      "RVI reflects integrity, respect, and repair capacity (protective factors).",
      "Strengthening RVI tends to reduce volatility and improve repair after conflict."
    );
  }

  return {
    id,
    title,
    score: scaled.score,
    t: scaled.t,
    band,
    narrative,
    bullets,
    components,
  };
}

export function buildRDIIReport(
  items: AssessmentItem[],
  responses: AssessmentResponse,
  opts?: { domain?: Domain }
): RDIIReport {
  const domain = opts?.domain;

  const scopedItems = domain ? items.filter((it) => it.domain === domain) : items;
  const isValidityDomain = domain === "VAL_VALIDITY";

  const completionItems = scopedItems.filter((it) =>
    isValidityDomain ? it.subscale.startsWith("VAL") : !it.subscale.startsWith("VAL")
  );

  const totalItems = completionItems.length;
  const answeredItems = completionItems.filter((it) => responses[it.id]).length;

  const allSubscales = Array.from(new Set(scopedItems.map((it) => it.subscale))) as Subscale[];

  const subscales: Record<string, SubscaleReport> = {};
  const validityFlags: string[] = [];

  // validity scales are always computed from the full item bank (not just scoped)
  const inconsistencyPairs = getDefaultInconsistencyPairs(items);
  const val1 = scoreResponseStyle(items, responses);
  const val2 = scoreInconsistency(items, responses, inconsistencyPairs);

  // Simple validity thresholds (tunable)
  if (Number.isFinite(val1.score) && val1.score >= 70) {
    validityFlags.push("Response style shows heavy extreme responding (many 1/6 choices).");
  }
  if (Number.isFinite(val2.score) && val2.score >= 60) {
    validityFlags.push("Responses show elevated internal inconsistency (paired contradictions).");
  }

  for (const ss of allSubscales) {
    if (ss === "VAL1_RESPONSE_STYLE" || ss === "VAL2_INCONSISTENCY") continue;

    const raw = scoreSubscale(scopedItems, responses, ss);
    const scaled = toScaled(raw.score);
    const polarity = SUBSCALE_POLARITY[ss];
    const band = bandFromScore(scaled.score, polarity);
    const narr = narrativeForSubscale(ss, scaled);

    subscales[ss] = {
      title: narr.title || titleForSubscale(ss),
      score: scaled.score,
      t: scaled.t,
      band,
      polarity,
      answered: raw.answered,
      total: raw.total,
      narrative: narr.bullets.join(" "),
      bullets: narr.bullets,
    };
  }

  // Include VAL1/VAL2 in full report + validity domain view
  if (!domain || isValidityDomain) {
    const scaled1 = toScaled(val1.score);
    const b1 = bandFromScore(scaled1.score, "VALIDITY");
    const n1 = narrativeForSubscale("VAL1_RESPONSE_STYLE", scaled1);
    subscales["VAL1_RESPONSE_STYLE"] = {
      title: n1.title,
      score: scaled1.score,
      t: scaled1.t,
      band: b1,
      polarity: "VALIDITY",
      answered: val1.answered,
      total: val1.total,
      narrative: n1.bullets.join(" "),
      bullets: n1.bullets,
    };

    const scaled2 = toScaled(val2.score);
    const b2 = bandFromScore(scaled2.score, "VALIDITY");
    const n2 = narrativeForSubscale("VAL2_INCONSISTENCY", scaled2);
    subscales["VAL2_INCONSISTENCY"] = {
      title: n2.title,
      score: scaled2.score,
      t: scaled2.t,
      band: b2,
      polarity: "VALIDITY",
      answered: val2.pairsUsed ?? 0,
      total: val2.pairsTotal ?? inconsistencyPairs.length,
      narrative: n2.bullets.join(" "),
      bullets: n2.bullets,
    };
  }

  // Composite indices only on full report (no domain slice)
  const indices: Partial<Record<IndexId, IndexReport>> = {};
  if (!domain) {
    const get = (ss: Subscale): number => (Number.isFinite(subscales[ss]?.score) ? subscales[ss]!.score : 0);

    const reiComponents = [
      { subscale: "III4_FEAR_OBLIGATION_GUILT" as Subscale, weight: 1, score: get("III4_FEAR_OBLIGATION_GUILT" as Subscale) },
      { subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY" as Subscale, weight: 1, score: get("III5_FINANCIAL_PRACTICAL_DEPENDENCY" as Subscale) },
      { subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION" as Subscale, weight: 1, score: get("III6_SOCIAL_FAMILY_PRESSURE_REPUTATION" as Subscale) },
      { subscale: "III7_CHILDREN_PARENTING_TIES" as Subscale, weight: 1, score: get("III7_CHILDREN_PARENTING_TIES" as Subscale) },
      { subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL" as Subscale, weight: 1.2, score: get("III8_FEAR_INTIMIDATION_COERCIVE_CONTROL" as Subscale) },
      { subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS" as Subscale, weight: 1, score: get("III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS" as Subscale) },
      { subscale: "VII3_ENTRAPMENT_CONSTRAINTS" as Subscale, weight: 1.2, score: get("VII3_ENTRAPMENT_CONSTRAINTS" as Subscale) },
      { subscale: "VI2_COERCIVE_CONTROL_MONITORING" as Subscale, weight: 1.1, score: get("VI2_COERCIVE_CONTROL_MONITORING" as Subscale) },
      { subscale: "VI3_SAFETY_VIOLATION_DISRESPECT" as Subscale, weight: 1.1, score: get("VI3_SAFETY_VIOLATION_DISRESPECT" as Subscale) },
    ];

    const epiComponents = [
      { subscale: "VII2_EXIT_READINESS" as Subscale, weight: 1.5, score: get("VII2_EXIT_READINESS" as Subscale) },
      { subscale: "V1_PROCESS_NEGATIVE" as Subscale, weight: 1, score: get("V1_PROCESS_NEGATIVE" as Subscale) },
      { subscale: "V2_PROCESS_POSITIVE" as Subscale, weight: 0.6, score: 100 - get("V2_PROCESS_POSITIVE" as Subscale) },
      { subscale: "II1_SECURE_BASE" as Subscale, weight: 0.5, score: 100 - get("II1_SECURE_BASE" as Subscale) },
      { subscale: "VI4_SAFETY_SUPPORT_PROTECTION" as Subscale, weight: 0.5, score: 100 - get("VI4_SAFETY_SUPPORT_PROTECTION" as Subscale) },
      { subscale: "I5_INTEGRITY_TRUTH" as Subscale, weight: 0.4, score: 100 - get("I5_INTEGRITY_TRUTH" as Subscale) },
    ];

    const rviComponents = [
      { subscale: "I1_REGULATION_PATIENCE" as Subscale, weight: 1, score: get("I1_REGULATION_PATIENCE" as Subscale) },
      { subscale: "I2_KINDNESS" as Subscale, weight: 1, score: get("I2_KINDNESS" as Subscale) },
      { subscale: "I3_HUMILITY" as Subscale, weight: 1, score: get("I3_HUMILITY" as Subscale) },
      { subscale: "I4_HONOR_RESPECT" as Subscale, weight: 1, score: get("I4_HONOR_RESPECT" as Subscale) },
      { subscale: "I5_INTEGRITY_TRUTH" as Subscale, weight: 1, score: get("I5_INTEGRITY_TRUTH" as Subscale) },
      { subscale: "IV6_SUCCESSFUL_REPAIR" as Subscale, weight: 1, score: get("IV6_SUCCESSFUL_REPAIR" as Subscale) },
      { subscale: "VI1_POWER_EQUITY_RESPECT" as Subscale, weight: 1, score: get("VI1_POWER_EQUITY_RESPECT" as Subscale) },
      { subscale: "VI4_SAFETY_SUPPORT_PROTECTION" as Subscale, weight: 1, score: get("VI4_SAFETY_SUPPORT_PROTECTION" as Subscale) },
      { subscale: "V2_PROCESS_POSITIVE" as Subscale, weight: 0.8, score: get("V2_PROCESS_POSITIVE" as Subscale) },
    ];

    indices.REI = buildIndex("REI", "Relationship Entrapment Index (REI)", reiComponents, "RISK_HIGH");
    indices.EPI = buildIndex("EPI", "Exit Probability Index (EPI)", epiComponents, "RISK_HIGH");
    indices.RVI = buildIndex("RVI", "Relational Virtue Index (RVI)", rviComponents, "HEALTHY_HIGH");
  }

  const summaryParts: string[] = [];
  if (indices.REI) summaryParts.push("REI: " + indices.REI.band + " (" + (Number.isFinite(indices.REI.score) ? indices.REI.score.toFixed(0) : "—") + "/100).");
  if (indices.EPI) summaryParts.push("EPI: " + indices.EPI.band + " (" + (Number.isFinite(indices.EPI.score) ? indices.EPI.score.toFixed(0) : "—") + "/100).");
  if (indices.RVI) summaryParts.push("RVI: " + indices.RVI.band + " (" + (Number.isFinite(indices.RVI.score) ? indices.RVI.score.toFixed(0) : "—") + "/100).");

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : domain
        ? "Domain snapshot view (criterion-referenced)."
        : "";

  return {
    domain,
    answeredItems,
    totalItems,
    subscales,
    indices,
    summary,
    validityFlags,
  };
}
