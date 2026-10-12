export type SRRCIDomainCode =
  | "CSP"
  | "UDC"
  | "ERTS"
  | "ENS"
  | "SRD"
  | "FI"
  | "VCS"
  | "RSD"
  | "PDC"
  | "RRI"
  | "AED"
  | "VIS"
  | "TND"
  | "ORS"
  | "HR"
  | "PDA"
  | "DFA"
  | "ANO"
  | "SCC"
  | "BEA"
  | "AEI"
  | "SCV"
  | "PSF"
  | "SIRS"
  | "RRS"
  | "CDS"
  | "SPS"
  | "BA"
  | "RIR"
  | "FG"
  | "FB"
  | "CI";

export type SRRCIItemCategory =
  | "clinical"
  | "healthy_regulation"
  | "compatibility"
  | "couple_dynamics"
  | "validity";

export type SRRCISeverityLevel =
  | "minimal"
  | "mild"
  | "moderate"
  | "high"
  | "severe"
  | "extreme";

export type SRRCIAlignmentLevel =
  | "strong_alignment"
  | "moderate_alignment"
  | "mixed_alignment"
  | "significant_mismatch"
  | "severe_mismatch";

export type SRRCIRiskLevel =
  | "low"
  | "mild"
  | "moderate"
  | "high"
  | "critical";

export type SRRCIResponseIntegrityLevel =
  | "acceptable"
  | "caution"
  | "questionable"
  | "invalid";

export type SRRCIResponseValue = 0 | 1 | 2 | 3 | 4;

export type SRRCICompatibilityDimension =
  | "libido"
  | "partner_desire"
  | "frequency"
  | "novelty"
  | "communication"
  | "boundaries"
  | "affection"
  | "confidence"
  | "satisfaction"
  | "initiative"
  | "resilience"
  | "pacing"
  | "repair"
  | "pressure_response"
  | "integrity"
  | "attachment_synchrony";

export interface SRRCIItem {
  id: string;
  itemNumber: number;
  text: string;
  domain: SRRCIDomainCode;
  category: SRRCIItemCategory;
  reverseScored?: boolean;
  validityPairId?: string;
  compatibilityDimension?: SRRCICompatibilityDimension;
}

export interface SRRCIResponse {
  itemId: string;
  value: SRRCIResponseValue;
}

export interface SRRCIUserProfile {
  id: string;
  displayName: string;
  age?: number;
  biologicalSex?: "male" | "female" | "intersex" | "prefer_not_to_say";
  genderIdentity?: string;
  relationshipStatus?:
    | "single"
    | "dating"
    | "engaged"
    | "married"
    | "separated"
    | "divorced"
    | "widowed"
    | "prefer_not_to_say";
  partnerProfileId?: string;
  createdAt: string;
}

export interface SRRCIDomainScore {
  domain: SRRCIDomainCode;
  rawScore: number;
  maxScore: number;
  percentScore: number;
  severity: SRRCISeverityLevel;
  label: string;
  narrative: string;
}

export interface SRRCIDimensionScore {
  dimension: SRRCICompatibilityDimension;
  label: string;
  rawScore: number;
  maxScore: number;
  percentScore: number;
  alignmentLevel?: SRRCIAlignmentLevel;
  narrative: string;
}

export interface SRRCIValidityProfile {
  fakingGoodScore: number;
  fakingBadScore: number;
  inconsistencyScore: number;
  responseIntegrity: SRRCIResponseIntegrityLevel;
  notes: string[];
  narrative: string;
}

export interface SRRCICompatibilityProfile {
  partnerDesireScore: number;
  desiredFrequencyScore: number;
  noveltyAdventureScore: number;
  sexualCommunicationScore: number;
  boundaryExclusivityScore: number;
  affectionIntimacyScore: number;
  sexualConfidenceScore: number;
  partnerSatisfactionScore: number;
  initiativeReciprocityScore: number;
  relationalResilienceScore: number;

  sexualPacingScore?: number;
  repairCapacityScore?: number;
  pressureResponseScore?: number;
  behavioralIntegrityScore?: number;
  attachmentSynchronyScore?: number;

  dimensionScores?: SRRCIDimensionScore[];
  compatibilitySummary: string;
}

export interface SRRCINarrativeSection {
  title: string;
  level?: SRRCISeverityLevel | SRRCIAlignmentLevel | SRRCIRiskLevel;
  body: string;
  recommendations?: string[];
}

export interface SRRCIResult {
  profileId: string;
  completedAt: string;

  totalRawScore: number;
  totalMaxScore: number;
  totalPercentScore: number;
  globalSeverity: SRRCISeverityLevel;

  regulationStrengthScore: number;
  regulationConcernScore: number;

  domainScores: SRRCIDomainScore[];
  validityProfile: SRRCIValidityProfile;
  compatibilityProfile: SRRCICompatibilityProfile;

  patternFlags: string[];
  executiveSummary: string;
  clinicalNarrative: SRRCINarrativeSection[];
  compatibilityNarrative: SRRCINarrativeSection[];
  growthRecommendations: string[];
  summary: string;
}

export interface SRRCICoupleDomainComparison {
  label: string;
  partnerAScore: number;
  partnerBScore: number;
  delta: number;
  alignmentLevel: SRRCIAlignmentLevel;
  narrative: string;
}

export interface SRRCICoupleComparisonResult {
  partnerAProfileId: string;
  partnerBProfileId: string;
  completedAt: string;
  overallCompatibilityScore: number;
  overallAlignmentLevel: SRRCIAlignmentLevel;
  domainComparisons: SRRCICoupleDomainComparison[];
  likelyStrengths: string[];
  likelyWeaknesses: string[];
  conflictPredictions?: string[];
  repairPotentialNarrative?: string;
  attachmentInteractionNarrative?: string;
  sexualPacingSynchronyNarrative?: string;
  coupleNarrative: SRRCINarrativeSection[];
  executiveSummary: string;
}

export const SRRCI_RESPONSE_OPTIONS: Array<{
  value: SRRCIResponseValue;
  label: string;
}> = [
  { value: 0, label: "Never True" },
  { value: 1, label: "Rarely True" },
  { value: 2, label: "Sometimes True" },
  { value: 3, label: "Often True" },
  { value: 4, label: "Very Often True" },
];

export const SRRCI_DOMAIN_LABELS: Record<SRRCIDomainCode, string> = {
  CSP: "Cognitive Sexual Preoccupation",
  UDC: "Urge Dyscontrol & Compulsivity",
  ERTS: "Emotional Regulation Through Sexuality",
  ENS: "Escalation & Novelty Seeking",
  SRD: "Secrecy & Relational Damage",
  FI: "Functional Impairment",
  VCS: "Values Conflict & Shame",
  RSD: "Risk & Safety Disregard",
  PDC: "Pornography & Digital Compulsion",
  RRI: "Relapse & Recovery Instability",
  AED: "Attachment & Emotional Dependency",
  VIS: "Validation & Identity Sexuality",
  TND: "Trauma, Numbing & Dissociation",
  ORS: "Obsessive/Ritualized Sexuality",
  HR: "Healthy Sexual Regulation",
  PDA: "Partner Desire Alignment",
  DFA: "Desired Frequency Alignment",
  ANO: "Adventure & Novelty Orientation",
  SCC: "Sexual Communication Capacity",
  BEA: "Boundary & Exclusivity Alignment",
  AEI: "Affection & Emotional Intimacy",
  SCV: "Sexual Self-Confidence & Vulnerability",
  PSF: "Partner Satisfaction & Fulfillment",
  SIRS: "Sexual Initiative Reciprocity",
  RRS: "Relational Resilience",
  CDS: "Couple Desire Synchrony",
  SPS: "Sexual Pacing Synchrony",
  BA: "Boundary Agreement",
  RIR: "Relational Integrity & Repair",
  FG: "Faking Good",
  FB: "Faking Bad",
  CI: "Contradiction / Inconsistency",
};

export const SRRCI_COMPATIBILITY_DIMENSION_LABELS: Record<
  SRRCICompatibilityDimension,
  string
> = {
  libido: "Libido / Sexual Drive",
  partner_desire: "Partner Desire",
  frequency: "Desired Frequency",
  novelty: "Adventure & Novelty",
  communication: "Sexual Communication",
  boundaries: "Boundary & Exclusivity Alignment",
  affection: "Affection & Emotional Intimacy",
  confidence: "Sexual Confidence & Vulnerability",
  satisfaction: "Partner Satisfaction",
  initiative: "Sexual Initiative Reciprocity",
  resilience: "Relational Resilience",
  pacing: "Sexual Pacing Synchrony",
  repair: "Repair Capacity",
  pressure_response: "Pressure Response",
  integrity: "Behavioral Integrity",
  attachment_synchrony: "Attachment-Sexuality Synchrony",
};

export const SRRCI_CLINICAL_DOMAINS: SRRCIDomainCode[] = [
  "CSP",
  "UDC",
  "ERTS",
  "ENS",
  "SRD",
  "FI",
  "VCS",
  "RSD",
  "PDC",
  "RRI",
  "AED",
  "VIS",
  "TND",
  "ORS",
];

export const SRRCI_HEALTHY_REGULATION_DOMAINS: SRRCIDomainCode[] = [
  "HR",
];

export const SRRCI_COMPATIBILITY_DOMAINS: SRRCIDomainCode[] = [
  "PDA",
  "DFA",
  "ANO",
  "SCC",
  "BEA",
  "AEI",
  "SCV",
  "PSF",
  "SIRS",
  "RRS",
];

export const SRRCI_COUPLE_DYNAMICS_DOMAINS: SRRCIDomainCode[] = [
  "CDS",
  "SPS",
  "BA",
  "RIR",
];

export const SRRCI_VALIDITY_DOMAINS: SRRCIDomainCode[] = [
  "FG",
  "FB",
  "CI",
];

export const SRRCI_SCORABLE_DOMAINS: SRRCIDomainCode[] = [
  ...SRRCI_CLINICAL_DOMAINS,
  ...SRRCI_HEALTHY_REGULATION_DOMAINS,
  ...SRRCI_COMPATIBILITY_DOMAINS,
  ...SRRCI_COUPLE_DYNAMICS_DOMAINS,
];

export const SRRCI_ALL_DOMAINS: SRRCIDomainCode[] = [
  ...SRRCI_SCORABLE_DOMAINS,
  ...SRRCI_VALIDITY_DOMAINS,
];
