import type {
  RvtiDomainScore,
  RvtiIndividualProfile,
  RvtiDyadicResult,
  RvtiDomainId,
  RvtiResponses,
  TimeToleranceOption,
} from "./rvtiTypes";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const likert1to7_to_0_100 = (v: number) => clamp01((v - 1) / 6) * 100;
const importance1to10_to_0_100 = (v: number) => clamp01((v - 1) / 9) * 100;

const timeTolerance_to_0_100 = (v: TimeToleranceOption): number => {
  switch (v) {
    case "IMMEDIATE":
      return 0;
    case "WITHIN_6_MONTHS":
      return 25;
    case "WITHIN_1_2_YEARS":
      return 50;
    case "WITHIN_3_5_YEARS":
      return 75;
    case "INDEFINITELY":
      return 100;
    default:
      return 50;
  }
};

const safeNum = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? x : null;

const safeTime = (x: unknown): TimeToleranceOption | null =>
  typeof x === "string" ? (x as TimeToleranceOption) : null;

const avg = (arr: number[], fallback: number): number =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

function computeRuptureReactivity(params: {
  severity_0_100: number;
  exitLikelihood_0_100: number;
  timeTolerance_0_100: number;
  importance_0_100: number;
  identityFusion_0_100: number;
}): number {
  const {
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
  } = params;

  const urgency = 100 - timeTolerance;
  const rawReactivity = 0.45 * exitLikelihood + 0.35 * severity + 0.2 * urgency;
  const amplifier = clamp01(((importance + fusion) / 2) / 100);

  return clamp01((rawReactivity / 100) * (0.75 + 0.5 * amplifier)) * 100;
}

/** DOMAIN 1: Sexual Exclusivity */
export function scoreRvtiDomainSex(responses: RvtiResponses): RvtiDomainScore {
  const d1 = safeNum(responses["RVTI_SEX_D1"]) ?? 4;
  const d2 = safeNum(responses["RVTI_SEX_D2"]) ?? 5;
  const d3 = safeNum(responses["RVTI_SEX_D3"]) ?? 4;

  const position = likert1to7_to_0_100(d1);
  const importance = importance1to10_to_0_100(d2);
  const fusion = likert1to7_to_0_100(d3);

  const sevIds = [
    "RVTI_SEX_SA_SEV",
    "RVTI_SEX_SB_SEV",
    "RVTI_SEX_SC_SEV",
    "RVTI_SEX_SD_SEV",
  ];
  const likIds = [
    "RVTI_SEX_SA_LIK",
    "RVTI_SEX_SB_LIK",
    "RVTI_SEX_SC_LIK",
    "RVTI_SEX_SD_LIK",
  ];
  const timeIds = ["RVTI_SEX_SC_TIME", "RVTI_SEX_SD_TIME"];

  const severity = avg(
    sevIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const exitLikelihood = avg(
    likIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const timeTolerance = avg(
    timeIds
      .map((id) => safeTime(responses[id]))
      .filter((v): v is TimeToleranceOption => v !== null)
      .map(timeTolerance_to_0_100),
    50
  );

  const ruptureReactivity = computeRuptureReactivity({
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
  });

  return {
    domain: "RVTI_SEX",
    position_0_100: position,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    ruptureReactivity_0_100: ruptureReactivity,
  };
}

/** DOMAIN 2: Financial Philosophy */
export function scoreRvtiDomainFinance(responses: RvtiResponses): RvtiDomainScore {
  const d1 = safeNum(responses["RVTI_FIN_D1"]) ?? 4;
  const d2 = safeNum(responses["RVTI_FIN_D2"]) ?? 5;
  const d3 = safeNum(responses["RVTI_FIN_D3"]) ?? 4;

  const position = likert1to7_to_0_100(d1);
  const importance = importance1to10_to_0_100(d2);
  const fusion = likert1to7_to_0_100(d3);

  const sevIds = [
    "RVTI_FIN_SA_SEV",
    "RVTI_FIN_SB_SEV",
    "RVTI_FIN_SC_SEV",
    "RVTI_FIN_SD_SEV",
  ];
  const likIds = [
    "RVTI_FIN_SA_LIK",
    "RVTI_FIN_SB_LIK",
    "RVTI_FIN_SC_LIK",
    "RVTI_FIN_SD_LIK",
  ];
  const timeIds = ["RVTI_FIN_SB_TIME", "RVTI_FIN_SD_TIME"];

  const severity = avg(
    sevIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const exitLikelihood = avg(
    likIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const timeTolerance = avg(
    timeIds
      .map((id) => safeTime(responses[id]))
      .filter((v): v is TimeToleranceOption => v !== null)
      .map(timeTolerance_to_0_100),
    50
  );

  const ruptureReactivity = computeRuptureReactivity({
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
  });

  return {
    domain: "RVTI_FIN",
    position_0_100: position,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    ruptureReactivity_0_100: ruptureReactivity,
  };
}

/** DOMAIN 3: Autonomy vs Togetherness */
export function scoreRvtiDomainAutonomy(responses: RvtiResponses): RvtiDomainScore {
  const d1 = safeNum(responses["RVTI_AUT_D1"]) ?? 4;
  const d2 = safeNum(responses["RVTI_AUT_D2"]) ?? 5;
  const d3 = safeNum(responses["RVTI_AUT_D3"]) ?? 4;

  const position = likert1to7_to_0_100(d1);
  const importance = importance1to10_to_0_100(d2);
  const fusion = likert1to7_to_0_100(d3);

  const sevIds = [
    "RVTI_AUT_SA_SEV",
    "RVTI_AUT_SB_SEV",
    "RVTI_AUT_SC_SEV",
    "RVTI_AUT_SD_SEV",
  ];
  const likIds = [
    "RVTI_AUT_SA_LIK",
    "RVTI_AUT_SB_LIK",
    "RVTI_AUT_SC_LIK",
    "RVTI_AUT_SD_LIK",
  ];
  const timeIds = ["RVTI_AUT_SB_TIME", "RVTI_AUT_SD_TIME"];

  const severity = avg(
    sevIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const exitLikelihood = avg(
    likIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const timeTolerance = avg(
    timeIds
      .map((id) => safeTime(responses[id]))
      .filter((v): v is TimeToleranceOption => v !== null)
      .map(timeTolerance_to_0_100),
    50
  );

  const ruptureReactivity = computeRuptureReactivity({
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
  });

  return {
    domain: "RVTI_AUT",
    position_0_100: position,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    ruptureReactivity_0_100: ruptureReactivity,
  };
}

export function scoreRvtiDomainChildren(responses: RvtiResponses): RvtiDomainScore {
  const d1 = safeNum(responses["RVTI_CHI_D1"]) ?? 4;
  const d2 = safeNum(responses["RVTI_CHI_D2"]) ?? 5;
  const d3 = safeNum(responses["RVTI_CHI_D3"]) ?? 4;

  const position = likert1to7_to_0_100(d1);
  const importance = importance1to10_to_0_100(d2);
  const fusion = likert1to7_to_0_100(d3);

  const sevIds = [
    "RVTI_CHI_SA_SEV",
    "RVTI_CHI_SB_SEV",
    "RVTI_CHI_SC_SEV",
    "RVTI_CHI_SD_SEV",
  ];
  const likIds = [
    "RVTI_CHI_SA_LIK",
    "RVTI_CHI_SB_LIK",
    "RVTI_CHI_SC_LIK",
    "RVTI_CHI_SD_LIK",
  ];
  const timeIds = ["RVTI_CHI_SB_TIME", "RVTI_CHI_SD_TIME"];

  const severity = avg(
    sevIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const exitLikelihood = avg(
    likIds
      .map((id) => safeNum(responses[id]))
      .filter((v): v is number => v !== null)
      .map(likert1to7_to_0_100),
    50
  );

  const timeTolerance = avg(
    timeIds
      .map((id) => safeTime(responses[id]))
      .filter((v): v is TimeToleranceOption => v !== null)
      .map(timeTolerance_to_0_100),
    50
  );

  const ruptureReactivity = computeRuptureReactivity({
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
  });

  return {
    domain: "RVTI_CHI",
    position_0_100: position,
    importance_0_100: importance,
    identityFusion_0_100: fusion,
    severity_0_100: severity,
    exitLikelihood_0_100: exitLikelihood,
    timeTolerance_0_100: timeTolerance,
    ruptureReactivity_0_100: ruptureReactivity,
  };
}

export function scoreRvtiIndividual(responses: RvtiResponses): RvtiIndividualProfile {
  const domainScores = [
    scoreRvtiDomainSex(responses),
    scoreRvtiDomainFinance(responses),
    scoreRvtiDomainAutonomy(responses),
    scoreRvtiDomainChildren(responses),
  ];

  return {
    version: "RVTI-R.0.3",
    createdAtISO: new Date().toISOString(),
    domainScores,
  };
}

export function scoreRvtiDyadic(
  a: RvtiIndividualProfile,
  b: RvtiIndividualProfile
): RvtiDyadicResult {
const mismatchList: RvtiDyadicResult["domainMismatch"] = [];

const scoreMapA = new Map(a.domainScores.map((d) => [d.domain, d]));
const scoreMapB = new Map(b.domainScores.map((d) => [d.domain, d]));
const domains: RvtiDomainId[] = ["RVTI_SEX", "RVTI_FIN", "RVTI_AUT", "RVTI_CHI"] as RvtiDomainId[];
for (const domain of domains) {
  const da = scoreMapA.get(domain);
  const db = scoreMapB.get(domain);
  if (!da || !db) continue;

  const diffPos = Math.abs(da.position_0_100 - db.position_0_100);
  const diffReact = Math.abs(
    da.ruptureReactivity_0_100 - db.ruptureReactivity_0_100
  );

  const avgImportance = (da.importance_0_100 + db.importance_0_100) / 2;
  const avgFusion = (da.identityFusion_0_100 + db.identityFusion_0_100) / 2;

  const weight = clamp01((avgImportance * 0.6 + avgFusion * 0.4) / 100);

  const weightedMismatch =
    clamp01(((0.45 * diffPos + 0.55 * diffReact) / 100) * (0.6 + 0.8 * weight)) *
    100;

  const asym = Math.abs(
    da.ruptureReactivity_0_100 - db.ruptureReactivity_0_100
  );
  const asymmetryFlag = asym >= 35 ? "HIGH" : asym >= 20 ? "MODERATE" : "LOW";

  mismatchList.push({
    domain,
    weightedMismatch_0_100: weightedMismatch,
    asymmetryFlag,
    notes:
      asymmetryFlag !== "LOW"
        ? ["Asymmetry: one partner is much more rupture-reactive than the other in this domain."]
        : undefined,
  });
}

const overall = mismatchList.length
    ? mismatchList.reduce((acc, d) => acc + d.weightedMismatch_0_100, 0) /
      mismatchList.length
    : 0;

  return {
    version: "RVTI-R.0.3",
    createdAtISO: new Date().toISOString(),
    domainMismatch: mismatchList,
    weightedMismatchOverall_0_100: overall,
  };
}