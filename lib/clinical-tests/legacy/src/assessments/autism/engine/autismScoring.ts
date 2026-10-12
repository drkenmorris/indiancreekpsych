// src/assessments/autism/engine/autismScoring.ts

export type AutismAssessmentRole = "Parent" | "Teacher" | "Student";

export type AutismItemDomain =
  | "SOCIAL_COMMUNICATION"
  | "RESTRICTED_REPETITIVE_BEHAVIORS"
  | "SENSORY_PROCESSING"
  | "EXECUTIVE_FUNCTION"
  | "EMOTIONAL_REGULATION"
  | "VALIDITY";

export type AutismDomainId = AutismItemDomain;

export type AutismResponseOptionId = string;

export interface AutismResponseOption {
  id: AutismResponseOptionId;
  label: string;
  score: number; // numeric score for this option
}

export interface AutismItem {
  id: string;
  domain: AutismItemDomain;
  prompt?: string;
  text?: string;
  reverse?: boolean;
}

export interface AutismItemBank {
  id: string;
  rater: AutismAssessmentRole;
  version?: string;
  items: AutismItem[];
  responseOptions: AutismResponseOption[];
}

/**
 * Accepts either:
 * - numeric values (0..N) that refer to responseOptions index
 * - string values that match responseOptions[id]
 */
export type AutismRawResponseValue =
  | number
  | AutismResponseOptionId
  | null
  | undefined;

export type AutismRawResponseMap = Record<string, AutismRawResponseValue>;

export interface AutismDomainScore {
  id: AutismDomainId;
  label: string;
  rawScore: number;
  maxScore: number;
  completedItemCount: number;
  totalItemCount: number;
  mean: number | null;
}

export interface AutismAssessmentScore {
  totalItemCount: number;
  completedItemCount: number;
  rawScore: number;
  maxScore: number;
  mean: number | null;
  domains: AutismDomainScore[];
}

const labelForDomain = (d: AutismItemDomain): string => {
  switch (d) {
    case "SOCIAL_COMMUNICATION":
      return "Social Communication";
    case "RESTRICTED_REPETITIVE_BEHAVIORS":
      return "Restricted / Repetitive Behaviors";
    case "SENSORY_PROCESSING":
      return "Sensory Processing";
    case "EXECUTIVE_FUNCTION":
      return "Executive Function";
    case "EMOTIONAL_REGULATION":
      return "Emotional Regulation";
    case "VALIDITY":
      return "Validity / Reliability";
    default:
      return d;
  }
};

const resolveScore = (
  bank: AutismItemBank,
  v: AutismRawResponseValue
): number | null => {
  if (v === null || v === undefined) return null;

  if (typeof v === "number") {
    // treat as index into responseOptions
    const opt = bank.responseOptions[v];
    return typeof opt?.score === "number" ? opt.score : null;
  }

  // treat as option id
  const opt = bank.responseOptions.find((o) => o.id === v);
  return typeof opt?.score === "number" ? opt.score : null;
};

export function scoreAutismAssessment(
  bank: AutismItemBank,
  responses: AutismRawResponseMap
): AutismAssessmentScore {
  const byDomain = new Map<AutismItemDomain, AutismItem[]>();
  for (const it of bank.items) {
    const arr = byDomain.get(it.domain) ?? [];
    arr.push(it);
    byDomain.set(it.domain, arr);
  }

  let totalItemCount = bank.items.length;
  let completedItemCount = 0;
  let rawScore = 0;
  let maxScore = 0;

  const maxPerItem =
    bank.responseOptions.reduce((m, o) => Math.max(m, o.score), 0) ?? 0;

  const domains: AutismDomainScore[] = [];

  for (const [domain, items] of byDomain.entries()) {
    let dCompleted = 0;
    let dRaw = 0;
    let dMax = items.length * maxPerItem;

    for (const it of items) {
      const v = responses[it.id];
      const s = resolveScore(bank, v);
      if (s === null) continue;

      const scored = it.reverse ? maxPerItem - s : s;
      dCompleted += 1;
      dRaw += scored;
    }

    completedItemCount += dCompleted;
    rawScore += dRaw;
    maxScore += dMax;

    domains.push({
      id: domain,
      label: labelForDomain(domain),
      rawScore: dRaw,
      maxScore: dMax,
      completedItemCount: dCompleted,
      totalItemCount: items.length,
      mean: dCompleted > 0 ? dRaw / dCompleted : null,
    });
  }

  return {
    totalItemCount,
    completedItemCount,
    rawScore,
    maxScore,
    mean: completedItemCount > 0 ? rawScore / completedItemCount : null,
    domains,
  };
}
