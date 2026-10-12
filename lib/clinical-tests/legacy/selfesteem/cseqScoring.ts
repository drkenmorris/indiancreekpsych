// src/selfesteem/cseqScoring.ts

import { SELF_ESTEEM_LIKERT_ITEMS } from "./selfEsteemItemBank";

export type LikertValue = 0 | 1 | 2 | 3;

export type CseqResponse = {
  likert: Record<number, LikertValue>;
  forcedChoice?: Record<string, "A" | "B">;
};

export type CseqScaleScore = {
  id: string;
  label: string;
  nAnswered: number;
  nItems: number;
  mean0to3: number | null; // 0..3
  pct0to100: number | null; // 0..100
  band: "Low" | "Mixed" | "Healthy" | "Unknown";
};

export type CseqValidity = {
  flags: string[];
  lieMean: number | null;
  fakingBadMean: number | null;
  infrequencyMean: number | null;
  disclosureHoldBack: number | null; // item 110
  disclosureGuessing: number | null; // item 113
};

export type CseqProfile = {
  name: string;
  summary: string;
  risks: string[];
  strengths: string[];
};

export type CseqReport = {
  scoredAtISO: string;
  scales: CseqScaleScore[];
  detractors: CseqScaleScore[];
  contributors: CseqScaleScore[];
  validity: CseqValidity;
  profile: CseqProfile;
  composite: {
    globalMean0to3: number | null;
    globalPct: number | null;
  };
};

function mean(nums: number[]): number | null {
  const arr = nums.filter((x) => Number.isFinite(x));
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function bandFromPct(pct: number | null): "Low" | "Mixed" | "Healthy" | "Unknown" {
  if (pct == null) return "Unknown";
  if (pct < 40) return "Low";
  if (pct < 70) return "Mixed";
  return "Healthy";
}

function scoreRange(likert: Record<number, LikertValue>, start: number, end: number): { values: number[]; nItems: number } {
  const values: number[] = [];
  for (let id = start; id <= end; id++) {
    const v = likert[id];
    if (v !== undefined) values.push(v);
  }
  return { values, nItems: end - start + 1 };
}

function mkScale(
  id: string,
  label: string,
  values: number[],
  nItems: number,
  opts?: { invert?: boolean }
): CseqScaleScore {
  const m = mean(values);
  const pct = m == null ? null : Math.round((m / 3) * 100);
  const finalPct = opts?.invert && pct != null ? 100 - pct : pct;
  const finalMean = opts?.invert && m != null ? Number((3 - m).toFixed(2)) : m == null ? null : Number(m.toFixed(2));
  return {
    id,
    label,
    nAnswered: values.length,
    nItems,
    mean0to3: finalMean,
    pct0to100: finalPct,
    band: bandFromPct(finalPct),
  };
}

export function scoreCseq(resp: CseqResponse): CseqReport {
  const likert = resp.likert ?? {};

  // Global composite across ALL likert items (1..138) that exist in the bank
  const bankIds = SELF_ESTEEM_LIKERT_ITEMS.map((it) => it.id);
  const globalVals = bankIds.map((id) => likert[id]).filter((v) => v !== undefined) as number[];
  const globalMean = mean(globalVals);
  const globalPct = globalMean == null ? null : Math.round((globalMean / 3) * 100);

  // Core builders (v1 mapping by item blocks)
  const sA = scoreRange(likert, 1, 8);
  const sB = scoreRange(likert, 9, 16);
  const sC = scoreRange(likert, 17, 24);
  const sD = scoreRange(likert, 25, 32);
  const sE = scoreRange(likert, 33, 40);
  const sF = scoreRange(likert, 41, 48);
  const sG = scoreRange(likert, 49, 56);
  const sH = scoreRange(likert, 57, 64);
  const sI = scoreRange(likert, 65, 72);

  const coreScales: CseqScaleScore[] = [
    mkScale("CORE_WORTH", "Intrinsic Self-Worth", sA.values, sA.nItems),
    mkScale("CORE_ACCEPT", "Self-Acceptance & Compassion", sB.values, sB.nItems),
    mkScale("CORE_CONF", "Self-Confidence", sC.values, sC.nItems),
    mkScale("CORE_BOUND", "Self-Respect & Boundaries", sD.values, sD.nItems),
    mkScale("CORE_AGENCY", "Agency & Self-Efficacy", sE.values, sE.nItems),
    mkScale("CORE_VALID", "Internal Validation", sF.values, sF.nItems),
    mkScale("CORE_REPAIR", "Shame Resilience & Repair", sG.values, sG.nItems),
    mkScale("CORE_RECEIVE", "Receiving & Reciprocity", sH.values, sH.nItems),
    mkScale("CORE_REST", "Rest, Deservedness & Meaning", sI.values, sI.nItems),
  ];

  // Detractors (higher raw = more threat; invert for "protective" display if desired)
  const dJ = scoreRange(likert, 73, 78);
  const dK = scoreRange(likert, 79, 84);
  const dL = scoreRange(likert, 85, 90);

  const detractors: CseqScaleScore[] = [
    mkScale("DET_CONTINGENT", "Contingent Worth / Approval Dependence", dJ.values, dJ.nItems, { invert: true }),
    mkScale("DET_PERF", "Perfectionism / Failure Collapse", dK.values, dK.nItems, { invert: true }),
    mkScale("DET_COMPARE", "Comparison / Helplessness / Self-Betrayal", dL.values, dL.nItems, { invert: true }),
  ];

  // Contributors / Corollaries additions (v1)
  const cMoral = scoreRange(likert, 115, 120);
  const cBody = scoreRange(likert, 121, 126);
  const cStability = scoreRange(likert, 127, 132);
  const cEnvy = scoreRange(likert, 133, 138);

  const contributors: CseqScaleScore[] = [
    mkScale("COR_MORAL", "Moral Repair Capacity", cMoral.values, cMoral.nItems),
    mkScale("COR_BODY", "Body-Based Worth", cBody.values, cBody.nItems),
    mkScale("COR_STABLE", "Worth Stability Under Stress", cStability.values, cStability.nItems),
    mkScale("COR_ENVY", "Envy/Resentment Resilience", cEnvy.values, cEnvy.nItems),
  ];

  // Validity (simple v1 heuristics)
  const lie = scoreRange(likert, 91, 96);
  const fbad = scoreRange(likert, 97, 102);
  const inf = scoreRange(likert, 103, 108);
  const item110 = likert[110];
  const item113 = likert[113];

  const lieMean = mean(lie.values);
  const fakingBadMean = mean(fbad.values);
  const infrequencyMean = mean(inf.values);

  const flags: string[] = [];
  if (lieMean != null && lieMean >= 2.4) flags.push("Possible impression management (Lie scale elevated).");
  if (fakingBadMean != null && fakingBadMean >= 2.4) flags.push("Possible negative impression (Faking-bad elevated).");
  if (infrequencyMean != null && infrequencyMean >= 1.6) flags.push("Possible random/unusual responding (Infrequency elevated).");
  if (item110 !== undefined && item110 >= 2) flags.push("Respondent reports holding back (Disclosure caution).");
  if (item113 !== undefined && item113 >= 2) flags.push("Respondent reports guessing (Attention/consistency caution).");

  const validity: CseqValidity = {
    flags,
    lieMean: lieMean == null ? null : Number(lieMean.toFixed(2)),
    fakingBadMean: fakingBadMean == null ? null : Number(fakingBadMean.toFixed(2)),
    infrequencyMean: infrequencyMean == null ? null : Number(infrequencyMean.toFixed(2)),
    disclosureHoldBack: item110 ?? null,
    disclosureGuessing: item113 ?? null,
  };

  // Profile typing (v1 rules; refine later)
  const coreAvg = mean(coreScales.map((s) => s.pct0to100 ?? NaN).filter((x) => Number.isFinite(x)));
  const detAvg = mean(detractors.map((s) => s.pct0to100 ?? NaN).filter((x) => Number.isFinite(x)));
  const stable = contributors.find((s) => s.id === "COR_STABLE")?.pct0to100 ?? null;
  const contingentProtect = detractors.find((s) => s.id === "DET_CONTINGENT")?.pct0to100 ?? null; // inverted => higher is better
  const boundaries = coreScales.find((s) => s.id === "CORE_BOUND")?.pct0to100 ?? null;
  const rest = coreScales.find((s) => s.id === "CORE_REST")?.pct0to100 ?? null;

  let profile: CseqProfile = {
    name: "Unclassified Profile",
    summary: "Insufficient pattern strength to classify a profile in v1.",
    risks: [],
    strengths: [],
  };

  const strengths: string[] = [];
  const risks: string[] = [];

  if (coreAvg != null && coreAvg >= 70 && detAvg != null && detAvg >= 70 && (stable ?? 0) >= 65) {
    profile = {
      name: "Stable Worth Profile",
      summary:
        "Scores suggest a stable, internally anchored self-worth with strong behavioral supports (boundaries, repair capacity, rest tolerance) and low vulnerability to external validation loops.",
      strengths: ["Stable intrinsic worth", "Resilient under stress", "Healthy boundaries and self-respect"],
      risks: validity.flags.length ? ["Interpret results with validity flags in mind."] : [],
    };
  } else if ((contingentProtect ?? 50) < 45 && (boundaries ?? 50) < 55) {
    profile = {
      name: "Contingent Caretaker Profile",
      summary:
        "Pattern suggests self-worth is strongly tied to meeting others’ needs and maintaining approval. Boundaries may be difficult, and self-esteem may fluctuate with relationships or perceived usefulness.",
      strengths: ["High relational investment (can be a strength when balanced)"],
      risks: ["People-pleasing / difficulty saying no", "Burnout risk", "Worth volatility tied to others’ reactions"],
    };
  } else if ((rest ?? 50) < 45 && (stable ?? 50) < 55) {
    profile = {
      name: "Driven / Earned-Worth Profile",
      summary:
        "Pattern suggests self-esteem is partially earned through productivity, effort, or sacrifice. Rest may trigger guilt, and self-worth may destabilize under prolonged stress or setback.",
      strengths: ["High effort and persistence (often)", "Goal orientation"],
      risks: ["Rest guilt", "Overwork / burnout", "Self-worth volatility during setbacks"],
    };
  } else if (coreAvg != null && coreAvg < 45) {
    profile = {
      name: "Shame-Weighted Profile",
      summary:
        "Core scales suggest low perceived self-worth and reduced self-compassion. Behavioral supports (boundaries, receiving, repair) may be underdeveloped or blocked by shame and self-criticism.",
      strengths: ["Insight may be present even when self-view is harsh"],
      risks: ["Global self-criticism", "Avoidance after failure", "Difficulty receiving care and support"],
    };
  } else if (detAvg != null && detAvg < 50) {
    profile = {
      name: "Brittle / Threat-Sensitive Profile",
      summary:
        "Pattern suggests elevated vulnerabilities (contingency, perfectionism, comparison/self-betrayal). Even with some strengths, self-esteem may fluctuate or collapse under evaluation, conflict, or failure.",
      strengths: ["Can show high standards and conscientiousness (when regulated)"],
      risks: ["Failure collapse", "Approval dependence", "Comparison threat and resentment loops"],
    };
  } else {
    strengths.push(...coreScales.filter((s) => (s.pct0to100 ?? 0) >= 70).map((s) => s.label));
    risks.push(...coreScales.filter((s) => (s.pct0to100 ?? 100) < 45).map((s) => s.label));
    profile = {
      name: "Mixed / Developing Profile",
      summary:
        "Results suggest a mixed pattern: some self-esteem supports are strong, while others may be inconsistent or situational. The most useful focus is strengthening the lowest supports and reducing key detractors.",
      strengths: strengths.slice(0, 3),
      risks: risks.slice(0, 3),
    };
  }

  return {
    scoredAtISO: new Date().toISOString(),
    scales: coreScales,
    detractors,
    contributors,
    validity,
    profile,
    composite: {
      globalMean0to3: globalMean == null ? null : Number(globalMean.toFixed(2)),
      globalPct: globalPct,
    },
  };
}
