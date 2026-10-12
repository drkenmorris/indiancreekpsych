import type { AssessmentItem, AssessmentResponse, Likert6, Subscale, Domain } from "./rdiiTypes";

function reverseLikert6(v: Likert6): Likert6 {
  return (7 - v) as Likert6;
}

function keyedValue(item: AssessmentItem, r: Likert6): Likert6 {
  return item.reverse ? reverseLikert6(r) : r;
}

export type SubscaleScore = {
  mean: number;
  score: number; // 0..100 (more of the construct)
  answered: number;
  total: number;
  // for VAL2_INCONSISTENCY only
  pairsUsed?: number;
  pairsTotal?: number;
};

export type Polarity = "HEALTHY_HIGH" | "RISK_HIGH" | "VALIDITY";

/**
 * Polarity tells the report layer how to interpret higher scores.
 * - HEALTHY_HIGH: higher is better/healthier
 * - RISK_HIGH: higher is more toxic/risky
 * - VALIDITY: higher/lower is interpreted per scale
 */
export const SUBSCALE_POLARITY: Record<Subscale, Polarity> = {
  // Domain I (love virtues)
  I1_REGULATION_PATIENCE: "HEALTHY_HIGH",
  I2_KINDNESS: "HEALTHY_HIGH",
  I3_HUMILITY: "HEALTHY_HIGH",
  I4_HONOR_RESPECT: "HEALTHY_HIGH",
  I5_INTEGRITY_TRUTH: "HEALTHY_HIGH",
  I6_MERCY_NO_SCOREKEEPING: "HEALTHY_HIGH",
  I7_PROTECTIVE_LOYALTY: "HEALTHY_HIGH",
  I8_ENDURING_COMMITMENT: "HEALTHY_HIGH",

  // Domain II (positive bonding)
  II1_SECURE_BASE: "HEALTHY_HIGH",
  II2_ADMIRATION_FONDNESS: "HEALTHY_HIGH",
  II3_EMOTIONAL_INTIMACY: "HEALTHY_HIGH",
  II4_ENJOYMENT_FRIENDSHIP: "HEALTHY_HIGH",
  II5_SHARED_MEANING_TEAM: "HEALTHY_HIGH",
  II6_DEDICATION_WANT_TO: "HEALTHY_HIGH",
  II7_GROWTH_SUPPORT: "HEALTHY_HIGH",

  // Domain III (negative bonding)
  III1_TRAUMA_BONDING_INTERMITTENT: "RISK_HIGH",
  III2_ATTACHMENT_ANXIETY: "RISK_HIGH",
  III3_IDENTITY_FUSION: "RISK_HIGH",
  III4_FEAR_OBLIGATION_GUILT: "RISK_HIGH",
  III5_FINANCIAL_PRACTICAL_DEPENDENCY: "RISK_HIGH",
  III6_SOCIAL_FAMILY_PRESSURE_REPUTATION: "RISK_HIGH",
  III7_CHILDREN_PARENTING_TIES: "RISK_HIGH",
  III8_FEAR_INTIMIDATION_COERCIVE_CONTROL: "RISK_HIGH",
  III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS: "RISK_HIGH",

  // Domain IV (damage patterns)
  IV1_CRITICISM: "RISK_HIGH",
  IV2_CONTEMPT: "RISK_HIGH",
  IV3_DEFENSIVENESS: "RISK_HIGH",
  IV4_STONEWALLING_WITHDRAWAL: "RISK_HIGH",
  IV5_REPAIR_FAILURE: "RISK_HIGH",
  IV6_SUCCESSFUL_REPAIR: "HEALTHY_HIGH",

  // Domain V (process)
  V1_PROCESS_NEGATIVE: "RISK_HIGH",
  V2_PROCESS_POSITIVE: "HEALTHY_HIGH",
  V3_PROCESS_FOCUSED: "HEALTHY_HIGH",

  // Domain VI (safety/power)
  VI1_POWER_EQUITY_RESPECT: "HEALTHY_HIGH",
  VI2_COERCIVE_CONTROL_MONITORING: "RISK_HIGH",
  VI3_SAFETY_VIOLATION_DISRESPECT: "RISK_HIGH",
  VI4_SAFETY_SUPPORT_PROTECTION: "HEALTHY_HIGH",

  // Domain VII (hope/exit/entrapment)
  VII1_HOPE_FOR_CHANGE: "HEALTHY_HIGH",
  VII2_EXIT_READINESS: "RISK_HIGH", // higher = more ready to exit
  VII3_ENTRAPMENT_CONSTRAINTS: "RISK_HIGH",

  // Validity
  VAL1_RESPONSE_STYLE: "VALIDITY",
  VAL2_INCONSISTENCY: "VALIDITY",
  VAL_VALIDITY: "VALIDITY",
};

export type SeverityBand = "LOW" | "MILD" | "MODERATE" | "HIGH";

export function bandFromScore(score0to100: number, polarity: Polarity): SeverityBand {
  // Criterion-referenced (not normed) bands.
  // HEALTHY_HIGH: low score = concern; high score = strength
  // RISK_HIGH: high score = concern
  if (!Number.isFinite(score0to100)) return "MILD";

  if (polarity === "HEALTHY_HIGH") {
    if (score0to100 >= 80) return "LOW";
    if (score0to100 >= 60) return "MILD";
    if (score0to100 >= 40) return "MODERATE";
    return "HIGH";
  }

  if (polarity === "RISK_HIGH") {
    if (score0to100 <= 20) return "LOW";
    if (score0to100 <= 40) return "MILD";
    if (score0to100 <= 60) return "MODERATE";
    return "HIGH";
  }

  // VALIDITY: treat "HIGH" as strong flag by default
  if (score0to100 <= 33) return "LOW";
  if (score0to100 <= 50) return "MILD";
  if (score0to100 <= 66) return "MODERATE";
  return "HIGH";
}

export type ScaledResult = {
  score: number; // 0..100
  t: number; // 20..80 (criterion-referenced)
  z: number; // (t-50)/10
  percentile: number; // 1..99 (approx; criterion-referenced)
};

function erfApprox(x: number): number {
  // Abramowitz-Stegun approximation
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erfApprox(z / Math.SQRT2));
}

export function toScaled(score0to100: number): ScaledResult {
  const clipped = Math.max(0, Math.min(100, score0to100));
  const t = 20 + 0.6 * clipped; // 0->20, 100->80
  const z = (t - 50) / 10;
  const p = Math.round(Math.max(1, Math.min(99, normalCdf(z) * 100)));
  return { score: clipped, t, z, percentile: p };
}

export type NarrativeResult = {
  title: string;
  band: SeverityBand;
  bullets: string[];
};

export function narrativeForSubscale(subscale: Subscale, scaled: ScaledResult): NarrativeResult {
  const polarity = SUBSCALE_POLARITY[subscale];
  const band = bandFromScore(scaled.score, polarity);

  // A small, expandable narrative library. We can keep adding as you like.
  const base = (title: string, bullets: string[]): NarrativeResult => ({ title, band, bullets });

  switch (subscale) {
    case "IV2_CONTEMPT":
      return base("Contempt", [
        band === "HIGH"
          ? "Strong signals of contempt (mocking, sarcasm, disgust, name-calling, eye-rolling)."
          : "Contempt appears limited or well-contained.",
        "Contempt is one of the strongest predictors of relationship deterioration when it becomes habitual.",
        "Clinical focus: replace contempt with respectful complaint + repair attempts (tone, wording, timing).",
      ]);

    case "IV5_REPAIR_FAILURE":
      return base("Repair Failure", [
        band === "HIGH"
          ? "Repair attempts are often missed, rejected, or escalated into further conflict."
          : "Repair attempts are usually noticed and have some effectiveness.",
        "Repair failure can look like: refusing to pause, continuing to argue past exhaustion, or interpreting bids for repair as manipulation.",
        "Clinical focus: teach explicit repair phrases, time-outs with return plans, and acceptance of small bids for reconnection.",
      ]);

    case "VAL2_INCONSISTENCY":
      return base("Inconsistency", [
        band === "HIGH"
          ? "Responses contain many internal contradictions, suggesting carelessness, confusion, or unstable responding."
          : "Response pattern appears reasonably consistent.",
        "If inconsistency is elevated, interpret other scales cautiously and consider retest or review unclear items.",
      ]);

    default:
      // Generic narrative by polarity
      if (polarity === "HEALTHY_HIGH") {
        return base(subscale, [
          band === "HIGH"
            ? "This area looks underdeveloped or unreliable right now (low strength)."
            : "This area shows usable strengths.",
          "Interpretation here is criterion-referenced (bands), not population norms yet.",
        ]);
      }

      if (polarity === "RISK_HIGH") {
        return base(subscale, [
          band === "HIGH" ? "This pattern appears frequent/intense and may be actively harming the relationship." : "This risk pattern looks limited or situational.",
          "Interpretation here is criterion-referenced (bands), not population norms yet.",
        ]);
      }

      return base(subscale, ["Validity scale interpretation depends on thresholds and patterns across the validity set."]);
  }
}

export type ReportBar = {
  id: string;
  label: string;
  score: number; // 0..100
  t: number;
  z: number;
  percentile: number;
  band: SeverityBand;
  polarity: Polarity;
  answered: number;
  total: number;
};

export type RDIIReport = {
  totalItems: number;
  answeredItems: number;
  bars: ReportBar[]; // subscale bars (plus domain bars if requested)
  narratives: NarrativeResult[];
  validityFlags: string[];
};

/**
 * Default inconsistency pairs are built from the existing item bank WITHOUT adding items.
 * Strategy:
 * - For each non-validity subscale that has BOTH forward and reverse keyed items,
 *   pair the lowest-id forward item with the highest-id reverse item.
 */
export function getDefaultInconsistencyPairs(items: AssessmentItem[], maxPairs = 14): Array<[number, number]> {
  const bySub: Record<string, AssessmentItem[]> = {};
  for (const it of items) {
    if (it.subscale.startsWith("VAL")) continue;
    if (!bySub[it.subscale]) bySub[it.subscale] = [];
    bySub[it.subscale].push(it);
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

  return pairs.sort((p1, p2) => p1[0] - p2[0]);
}

export function scoreInconsistency(
  items: AssessmentItem[],
  responses: AssessmentResponse,
  pairs: Array<[number, number]> = getDefaultInconsistencyPairs(items)
): { meanDiff: number; score: number; pairsUsed: number; pairsTotal: number } {
  const itemById: Record<number, AssessmentItem> = {};
  for (const it of items) itemById[it.id] = it;

  const diffs: number[] = [];

  for (const [idA, idB] of pairs) {
    const itA = itemById[idA];
    const itB = itemById[idB];
    if (!itA || !itB) continue;

    const rA = responses[idA];
    const rB = responses[idB];
    if (!rA || !rB) continue;

    const vA = keyedValue(itA, rA);
    const vB = keyedValue(itB, rB);
    diffs.push(Math.abs(vA - vB));
  }

  const pairsTotal = pairs.length;
  const pairsUsed = diffs.length;

  if (pairsUsed === 0) return { meanDiff: NaN, score: NaN, pairsUsed, pairsTotal };

  const meanDiff = diffs.reduce((a, b) => a + b, 0) / pairsUsed; // 0..5
  const score = (meanDiff / 5) * 100; // higher = more inconsistent

  return { meanDiff, score, pairsUsed, pairsTotal };
}

export function scoreSubscale(items: AssessmentItem[], responses: AssessmentResponse, subscale: Subscale): SubscaleScore {
  if (subscale === "VAL2_INCONSISTENCY") {
    const s = scoreInconsistency(items, responses);
    return {
      mean: s.meanDiff,
      score: s.score,
      answered: s.pairsUsed,
      total: s.pairsTotal,
      pairsUsed: s.pairsUsed,
      pairsTotal: s.pairsTotal,
    };
  }

  const subItems = items.filter((i) => i.subscale === subscale);
  const values: number[] = [];

  for (const item of subItems) {
    const r = responses[item.id];
    if (!r) continue;
    values.push(keyedValue(item, r));
  }

  const answered = values.length;
  const total = subItems.length;
  if (answered === 0) return { mean: NaN, score: NaN, answered, total };

  const mean = values.reduce((a, b) => a + b, 0) / answered;
  const score = ((mean - 1) / 5) * 100;
  return { mean, score, answered, total };
}

export function listSubscales(items: AssessmentItem[], domain?: Domain): Subscale[] {
  const set = new Set<Subscale>();
  for (const it of items) {
    if (domain && it.domain !== domain) continue;
    set.add(it.subscale);
  }
  return Array.from(set);
}

export function buildRDIIReport(items: AssessmentItem[], responses: AssessmentResponse, opts?: { domain?: Domain }): RDIIReport {
  const domain = opts?.domain;
  const subscales = listSubscales(items, domain);

  const totalItems = domain ? items.filter((i) => i.domain === domain).length : items.length;
  const answeredItems = domain
    ? items.filter((i) => i.domain === domain && responses[i.id]).length
    : Object.keys(responses).length;

  const bars: ReportBar[] = [];
  const narratives: NarrativeResult[] = [];

  for (const ss of subscales) {
    const s = scoreSubscale(items, responses, ss);
    if (!Number.isFinite(s.score)) continue;

    const scaled = toScaled(s.score);
    const polarity = SUBSCALE_POLARITY[ss] ?? "HEALTHY_HIGH";
    const band = bandFromScore(scaled.score, polarity);

    bars.push({
      id: ss,
      label: ss,
      score: scaled.score,
      t: scaled.t,
      z: scaled.z,
      percentile: scaled.percentile,
      band,
      polarity,
      answered: s.answered,
      total: s.total,
    });

    narratives.push(narrativeForSubscale(ss, scaled));
  }

  // Simple validity flags (expand as desired)
  const validityFlags: string[] = [];
  const inc = bars.find((b) => b.id === "VAL2_INCONSISTENCY");
  if (inc && inc.score >= 66) validityFlags.push("High response inconsistency — interpret other scales cautiously.");

  return { totalItems, answeredItems, bars, narratives, validityFlags };
}
