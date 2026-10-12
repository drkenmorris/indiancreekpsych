export type RvtiDomainId =
  | "RVTI_SEX" // Sexual Exclusivity & Loyalty Norms
  | "RVTI_FIN" // Financial Philosophy
  | "RVTI_AUT" // Autonomy vs Togetherness
  | "RVTI_CHI"; // Children & Parenting

export type RvtiItemKind = "direct" | "scenario_followup";

export type RvtiScale =
  | "LIKERT_1_7"
  | "IMPORTANCE_1_10"
  | "TIME_TOLERANCE";

export type TimeToleranceOption =
  | "IMMEDIATE"
  | "WITHIN_6_MONTHS"
  | "WITHIN_1_2_YEARS"
  | "WITHIN_3_5_YEARS"
  | "INDEFINITELY";

export interface RvtiItemBase {
  id: string; // unique stable key
  domain: RvtiDomainId;
  kind: RvtiItemKind;
  prompt: string;
  scale: RvtiScale;
  stemId?: string; // ties followups to a scenario stem
  followupRole?: "SEVERITY" | "LIKELIHOOD" | "TIME";
  tags?: string[];
}

export type RvtiResponseValue = number | TimeToleranceOption;
export type RvtiResponses = Record<string, RvtiResponseValue>;

export interface RvtiDomainScore {
  domain: RvtiDomainId;

  // structural
  position_0_100: number;
  importance_0_100: number;
  identityFusion_0_100: number;

  // activation
  severity_0_100: number;
  exitLikelihood_0_100: number;
  timeTolerance_0_100: number;

  // composite
  ruptureReactivity_0_100: number;
}

export interface RvtiIndividualProfile {
  version: string;
  createdAtISO: string;
  domainScores: RvtiDomainScore[];

  flexibility_0_100?: number;
  repairCapacity_0_100?: number;
  concealment_0_100?: number;
  validityFlags?: string[];
}

export interface RvtiDyadicResult {
  version: string;
  createdAtISO: string;

  domainMismatch: Array<{
    domain: RvtiDomainId;
    weightedMismatch_0_100: number;
    asymmetryFlag?: "LOW" | "MODERATE" | "HIGH";
    notes?: string[];
  }>;

  weightedMismatchOverall_0_100: number;
}