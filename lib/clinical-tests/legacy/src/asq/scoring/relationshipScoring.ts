// scoring/relationshipScoring.ts
import type {
  AssessmentItem,
  AssessmentResponse,
  Likert6,
  Subscale,
} from "../types/relationshipAssessment";

function reverseLikert6(v: Likert6): Likert6 {
  // 1<->6, 2<->5, 3<->4
  return (7 - v) as Likert6;
}

export function scoreSubscale(
  items: AssessmentItem[],
  responses: AssessmentResponse,
  subscale: Subscale
): { mean1to6: number; score0to100: number; answered: number; total: number } {
  const subItems = items.filter(i => i.subscale === subscale);
  const vals: number[] = [];

  for (const it of subItems) {
    const r = responses[it.id];
    if (!r) continue;
    const v = it.reverse ? reverseLikert6(r) : r;
    vals.push(v);
  }

  const answered = vals.length;
  const total = subItems.length;

  // Require at least 60% answered for a valid subscale score (adjust as desired)
  if (answered < Math.ceil(total * 0.6)) {
    return { mean1to6: NaN, score0to100: NaN, answered, total };
  }

  const mean1to6 = vals.reduce((a, b) => a + b, 0) / answered;

  // Convert 1..6 -> 0..100
  const score0to100 = ((mean1to6 - 1) / 5) * 100;

  return { mean1to6, score0to100, answered, total };
}