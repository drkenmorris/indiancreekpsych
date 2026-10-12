// src/assessments/autism/engine/autismScoring.ts
//
// Canonical autism scoring + types used across Parent/Teacher/Self item banks and UI.
// v3-compatible: supports domains + optional facets + hybrid (domain default + item override) weighting.
// NOTE: This module MUST NOT import item-bank modules (avoids circular deps).

// -----------------------------
// Core Types
// -----------------------------

export type AutismAssessmentRole = "Student" | "Parent" | "Teacher" | "Clinician";

export type AutismItemDomain =
  | "SOCIAL_COMMUNICATION"
  | "RESTRICTED_REPETITIVE"
  | "SENSORY_PROCESSING"
  | "EMOTIONAL_REGULATION"
  | "EXECUTIVE_FUNCTION";

// Optional facet layer (can be expanded later without breaking old banks)
export type AutismFacet =
  | "SOCIAL_RECIPROCITY"
  | "NONVERBAL_COMMUNICATION"
  | "RELATIONSHIP_DEVELOPMENT"
  | "RESTRICTED_INTERESTS"
  | "INSISTENCE_SAMENESS"
  | "SENSORY_HYPER"
  | "SENSORY_HYPO"
  | "EMOTION_REGULATION"
  | "EXECUTIVE_ORGANIZATION"
  | "EXECUTIVE_FLEXIBILITY"
  | "GENERAL";

export type AutismResponseOptionId = string;

export interface AutismResponseOption {
  id: AutismResponseOptionId;
  label: string;
  /** Numeric score to add when this option is chosen (typically 0–4). */
  score: number;
}

/**
 * A single scored item.
 *
 * Back-compat: legacy banks may only provide {id, text, prompt, domain}.
 * v3+ additions (optional): facet/tier/weight/reverseKey/isScorable/validityTag.
 */
export interface AutismItem {
  id: string;
  domain: AutismItemDomain;
  text: string;
  /** UI-friendly alias (older components used "prompt"). */
  prompt?: string;

  // v3+ optional metadata
  facet?: AutismFacet;
  /** Tier is a discrete signal-strength bucket (1=low, 2=mid, 3=high). */
  tier?: 1 | 2 | 3;
  /** Weight override. If provided, it is multiplied against the domain default weight. */
  weight?: number;
  /** Reverse scoring: if true, score = (maxScore - score). */
  reverseKey?: boolean;
  /** If false, item is shown but excluded from scoring. Default true. */
  isScorable?: boolean;

  /** Optional tags for validity / attention checks / etc. */
  validityTag?: string;
}

export interface AutismItemBank {
  /** Required unique id for the bank */
  id: string;
  /** Who is rating (Student/Parent/Teacher/Clinician) */
  rater: AutismAssessmentRole;
  /** Optional semantic version for bank content */
  version?: string;
  items: AutismItem[];
  responseOptions: AutismResponseOption[];
}

/**
 * Raw response map:
 *  - key: itemId
 *  - value: response option ID (string) or null/undefined if missing
 */
export type AutismRawResponseMap = Record<string, AutismResponseOptionId | null | undefined>;

// -----------------------------
// Scoring Output Types
// -----------------------------

export type AutismSeverityBand = "LOW" | "MODERATE" | "HIGH";

/** One item after scoring. */
export interface AutismScoredItemResult {
  id: string;
  domain: AutismItemDomain;
  facet: AutismFacet;
  text: string;

  responseId: AutismResponseOptionId | null;
  responseLabel: string | null;

  rawScore: number | null;
  maxScore: number;

  reverseApplied: boolean;

  /** Domain default weight used (before item override) */
  domainWeight: number;

  /** Item-specific weight multiplier (defaults to 1) */
  itemWeight: number;

  /** Weighted score contribution for this item */
  weightedScore: number | null;
  weightedMaxScore: number;
}

export interface AutismDomainScore {
  domain: AutismItemDomain;
  label: string;

  answeredCount: number;
  totalCount: number;

  rawScore: number;
  maxScore: number;

  /** rawScore / maxScore (0–1). null if maxScore=0. */
  proportion: number | null;

  /** 0–100. null if maxScore=0. */
  percentOfMax: number | null;

  /** mean raw score per answered item (unweighted, 0–4). null if none answered. */
  mean: number | null;

  severity: AutismSeverityBand;
}

export interface AutismCompositeScore {
  id: "CORE" | "TOTAL";
  label: string;
  rawScore: number;
  maxScore: number;
  proportion: number | null;
  percentOfMax: number | null;
  severity: AutismSeverityBand;
}

export interface AutismScoreReport {
  role: AutismAssessmentRole;
  itemBankId: string;
  itemBankVersion: string | null;
  createdAt: string;

  completedItemCount: number;
  totalItemCount: number;

  domains: AutismDomainScore[];
  composites: AutismCompositeScore[];
  itemLevel: AutismScoredItemResult[];

  rawResponses: AutismRawResponseMap;
}

// -----------------------------
// Domain + Tier Weighting (Hybrid Model)
// -----------------------------

const DOMAIN_LABELS: Record<AutismItemDomain, string> = {
  SOCIAL_COMMUNICATION: "Social communication",
  RESTRICTED_REPETITIVE: "Restricted / repetitive behaviors",
  SENSORY_PROCESSING: "Sensory processing",
  EMOTIONAL_REGULATION: "Emotional regulation",
  EXECUTIVE_FUNCTION: "Executive functioning",
};

/**
 * Default domain weights (conservative):
 * - Social + RRB are core ASD signals -> slightly higher baseline.
 * - Sensory and regulation are meaningful but more transdiagnostic -> slightly lower baseline.
 * You can adjust later after norming.
 */
const DOMAIN_DEFAULT_WEIGHT: Record<AutismItemDomain, number> = {
  SOCIAL_COMMUNICATION: 1.15,
  RESTRICTED_REPETITIVE: 1.15,
  SENSORY_PROCESSING: 1.0,
  EMOTIONAL_REGULATION: 1.0,
  EXECUTIVE_FUNCTION: 1.0,
};

/** Tier multipliers (hybrid model). Keep conservative until norming. */
const TIER_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 1.15,
  3: 1.3,
};

// -----------------------------
// Helpers
// -----------------------------

function nowIso() {
  return new Date().toISOString();
}

function buildOptionLookup(bank: AutismItemBank) {
  const map = new Map<AutismResponseOptionId, AutismResponseOption>();
  for (const o of bank.responseOptions) map.set(o.id, o);
  return map;
}

function maxOptionScore(bank: AutismItemBank): number {
  let max = 0;
  for (const o of bank.responseOptions) {
    if (typeof o.score === "number" && o.score > max) max = o.score;
  }
  return max;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function severityFromProportion(p: number | null): AutismSeverityBand {
  if (p === null) return "LOW";
  // Provisional bands; refine after norming.
  if (p >= 0.67) return "HIGH";
  if (p >= 0.34) return "MODERATE";
  return "LOW";
}

function facetOrGeneral(item: AutismItem): AutismFacet {
  return item.facet ?? "GENERAL";
}

function itemWeightMultiplier(item: AutismItem): number {
  const base = typeof item.weight === "number" ? item.weight : 1;
  const tier = item.tier ? TIER_MULTIPLIER[item.tier] : 1;
  return base * tier;
}

// -----------------------------
// Primary scoring function
// -----------------------------

export function scoreAutismAssessment(params: {
  bank: AutismItemBank;
  responses: AutismRawResponseMap;
  /** If omitted, uses bank.rater */
  role?: AutismAssessmentRole;
  /** If true, returns only scored items in itemLevel */
  scoredOnly?: boolean;
}): AutismScoreReport {
  const { bank, responses, role, scoredOnly } = params;

  const optionLookup = buildOptionLookup(bank);
  const maxScore = maxOptionScore(bank);

  const totalItemCount = bank.items.length;

  // Domain accumulators
  const domainAcc = new Map<
    AutismItemDomain,
    { raw: number; max: number; answered: number; total: number; rawItemSum: number }
  >();

  for (const d of Object.keys(DOMAIN_LABELS) as AutismItemDomain[]) {
    domainAcc.set(d, { raw: 0, max: 0, answered: 0, total: 0, rawItemSum: 0 });
  }

  const itemLevel: AutismScoredItemResult[] = [];

  let completedItemCount = 0;

  for (const item of bank.items) {
    const isScorable = item.isScorable !== false;
    const responseId = responses[item.id] ?? null;

    // Track totals by domain for all items (even unscorable) so UI can show completeness by domain if needed
    const da = domainAcc.get(item.domain);
    if (da) da.total += 1;

    const option = responseId ? optionLookup.get(responseId) : undefined;

    const rawScore = option ? option.score : null;
    const reverseApplied = !!item.reverseKey && rawScore !== null;

    const rawScoreFinal =
      reverseApplied && rawScore !== null ? Math.max(0, maxScore - rawScore) : rawScore;

    const domainWeight = DOMAIN_DEFAULT_WEIGHT[item.domain] ?? 1;
    const itemWeight = itemWeightMultiplier(item);

    const weightedMaxScore = isScorable ? maxScore * domainWeight * itemWeight : 0;
    const weightedScore =
      isScorable && rawScoreFinal !== null ? rawScoreFinal * domainWeight * itemWeight : null;

    if (responseId !== null) completedItemCount += 1;

    const row: AutismScoredItemResult = {
      id: item.id,
      domain: item.domain,
      facet: facetOrGeneral(item),
      text: item.text,
      responseId,
      responseLabel: option?.label ?? null,
      rawScore: isScorable ? rawScoreFinal : null,
      maxScore,
      reverseApplied,
      domainWeight,
      itemWeight,
      weightedScore,
      weightedMaxScore,
    };

    if (!scoredOnly || isScorable) itemLevel.push(row);

    // Aggregate domain scores only for scorable items
    if (isScorable) {
      const a = domainAcc.get(item.domain);
      if (a) {
        a.max += maxScore * domainWeight * itemWeight;
        if (rawScoreFinal !== null) {
          a.raw += rawScoreFinal * domainWeight * itemWeight;
          a.answered += 1;
          a.rawItemSum += rawScoreFinal; // unweighted
        }
      }
    }
  }

  // Build domain scores
  const domains: AutismDomainScore[] = (Object.keys(DOMAIN_LABELS) as AutismItemDomain[]).map(
    (domain) => {
      const a = domainAcc.get(domain)!;
      const proportion = a.max > 0 ? clamp01(a.raw / a.max) : null;
      const percentOfMax = proportion === null ? null : Math.round(proportion * 1000) / 10; // 1 decimal
      const mean = a.answered > 0 ? a.rawItemSum / a.answered : null;

      return {
        domain,
        label: DOMAIN_LABELS[domain],
        answeredCount: a.answered,
        totalCount: a.total,
        rawScore: a.raw,
        maxScore: a.max,
        proportion,
        percentOfMax,
        mean,
        severity: severityFromProportion(proportion),
      };
    }
  );

  // Composites
  const coreDomains: AutismItemDomain[] = ["SOCIAL_COMMUNICATION", "RESTRICTED_REPETITIVE"];
  const core = domains.filter((d) => coreDomains.includes(d.domain));
  const total = domains;

  const coreRaw = core.reduce((s, d) => s + d.rawScore, 0);
  const coreMax = core.reduce((s, d) => s + d.maxScore, 0);
  const coreProp = coreMax > 0 ? clamp01(coreRaw / coreMax) : null;

  const totalRaw = total.reduce((s, d) => s + d.rawScore, 0);
  const totalMax = total.reduce((s, d) => s + d.maxScore, 0);
  const totalProp = totalMax > 0 ? clamp01(totalRaw / totalMax) : null;

  const composites: AutismCompositeScore[] = [
    {
      id: "CORE",
      label: "Core ASD domains",
      rawScore: coreRaw,
      maxScore: coreMax,
      proportion: coreProp,
      percentOfMax: coreProp === null ? null : Math.round(coreProp * 1000) / 10,
      severity: severityFromProportion(coreProp),
    },
    {
      id: "TOTAL",
      label: "Total (all domains)",
      rawScore: totalRaw,
      maxScore: totalMax,
      proportion: totalProp,
      percentOfMax: totalProp === null ? null : Math.round(totalProp * 1000) / 10,
      severity: severityFromProportion(totalProp),
    },
  ];

  return {
    role: role ?? bank.rater,
    itemBankId: bank.id,
    itemBankVersion: bank.version ?? null,
    createdAt: nowIso(),
    completedItemCount,
    totalItemCount,
    domains,
    composites,
    itemLevel,
    rawResponses: responses,
  };
}
