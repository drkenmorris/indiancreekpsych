export { default as SRRCIRegistrationPage } from "./pages/SRRCIRegistrationPage";
export { default as SRRCIAssessmentPage } from "./pages/SRRCIAssessmentPage";
export { default as SRRCIResultsPage } from "./pages/SRRCIResultsPage";

export {
  srrciItems,
  getRandomizedSRRCIItems,
} from "./data/srrciItems";

export {
  scoreSRRCI,
  getSRRCIDomainLabel,
} from "./engine/srrciScoring";

export {
  saveSRRCIProfile,
  getSRRCIProfile,
  clearSRRCIProfile,

  saveSRRCIResponses,
  getSRRCIResponses,
  clearSRRCIResponses,

  saveSRRCIResult,
  getSRRCIResult,
  clearSRRCIResult,

  saveSRRCICoupleComparison,
  getSRRCICoupleComparison,
  clearSRRCICoupleComparison,

  clearAllSRRCIData,

  createSRRCIProfile,
} from "./services/srrciStorage";

export type {
  SRRCIDomainCode,
  SRRCIItemCategory,
  SRRCISeverityLevel,
  SRRCIAlignmentLevel,
  SRRCIRiskLevel,
  SRRCIResponseIntegrityLevel,
  SRRCIResponseValue,
  SRRCICompatibilityDimension,

  SRRCIItem,
  SRRCIResponse,
  SRRCIUserProfile,
  SRRCIDomainScore,
  SRRCIDimensionScore,
  SRRCIValidityProfile,
  SRRCICompatibilityProfile,
  SRRCINarrativeSection,
  SRRCIResult,
  SRRCICoupleDomainComparison,
  SRRCICoupleComparisonResult,
} from "./types/srrciTypes";

export {
  SRRCI_RESPONSE_OPTIONS,
  SRRCI_DOMAIN_LABELS,
  SRRCI_COMPATIBILITY_DIMENSION_LABELS,
  SRRCI_CLINICAL_DOMAINS,
  SRRCI_HEALTHY_REGULATION_DOMAINS,
  SRRCI_COMPATIBILITY_DOMAINS,
  SRRCI_COUPLE_DYNAMICS_DOMAINS,
  SRRCI_VALIDITY_DOMAINS,
  SRRCI_SCORABLE_DOMAINS,
  SRRCI_ALL_DOMAINS,
} from "./types/srrciTypes";
