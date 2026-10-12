export type {
  RtafiAssessmentResult,
  RtafiBarScaleDescriptor,
  RtafiCompositeIndices,
  RtafiCompositeNarrative,
  RtafiConstructDefinition,
  RtafiDomainCode,
  RtafiDomainDefinition,
  RtafiDomainNarrative,
  RtafiDomainScore,
  RtafiInterpretationProfile,
  RtafiItem,
  RtafiLikertOption,
  RtafiNarrativeSection,
  RtafiResponse,
  RtafiResponseValue,
  RtafiSeverityLevel,
  RtafiSubscaleCode,
  RtafiSubscaleDefinition,
  RtafiSubscaleNarrative,
  RtafiSubscaleScore,
  RtafiValidityConcernLevel,
  RtafiValidityNarrative,
  RtafiValidityProfile,
} from './types/rtafiTypes';

export {
  DEFAULT_RTAFI_ADMINISTRATION_CONFIG,
  RTAFI_RESPONSE_OPTIONS,
} from './types/rtafiTypes';

export type {
  RtafiAdministrationMode,
  RtafiCaregiverSetting,
  RtafiGuardianRegistration,
  RtafiHouseholdLabel,
  RtafiIntakeModeRecommendation,
  RtafiIntakeProfile,
  RtafiRespondentRole,
  RtafiYouthRegistration,
} from './intake/rtafiIntakeTypes';

export {
  clearRtafiIntakeProfile,
  hasRtafiIntakeProfile,
  loadRtafiIntakeProfile,
  saveRtafiIntakeProfile,
  updateRtafiIntakeProfile,
} from './intake/rtafiIntakeStorage';

export type {
  RtafiAdministrationContext,
  RtafiAdministrationContextType,
  RtafiComparativeProfile,
  RtafiContextualizedPrompt,
  RtafiCrossContextInterpretation,
} from './context/rtafiHouseholdContextTypes';

export type {
  RtafiContextualizedItem,
} from './context/rtafiHouseholdItemAdapter';

export {
  buildCaregiverSpecificContext,
  buildCommunitySettingContext,
  buildContextualizedItemBank,
  buildContextualizedItemBanksForContexts,
  buildContextualizedPrompt,
  buildGeneralContext,
  buildHouseholdAContext,
  buildHouseholdBContext,
  buildRandomizedContextualizedItemBank,
  buildResidentialSettingContext,
  buildSchoolSettingContext,
  randomizeRtafiItems,
  randomizeWhilePreservingValiditySpacing,
} from './context/rtafiHouseholdItemAdapter';

export { RTAFI_ITEMS } from './data/rtafiItems';

export {
  calculateCompositeIndices,
  calculateDomainScores,
  calculateSubscaleScores,
  generateEmptyAssessmentResult,
  scoreRtafiAssessment,
} from './engine/rtafiScoring';

export {
  calculateCompletionPercentage,
  calculateValidityProfile,
  isAssessmentComplete,
} from './validity/rtafiValidityEngine';

export {
  generateCrossContextInterpretation,
  generateHouseholdComparisonProfile,
} from './engine/rtafiHouseholdComparisonScoring';

export { generateNarrativeProfile } from './narratives/rtafiNarratives';

export {
  generateComparativeClinicalSummary,
  generateHouseholdComparisonNarrative,
  generateHouseholdDifferenceTable,
} from './narratives/rtafiHouseholdComparisonNarratives';

export { default as RtafiAssessmentPage } from './pages/RtafiAssessmentPage';
export { default as RtafiResultsPage } from './pages/RtafiResultsPage';
export { default as RtafiIntakePage } from './pages/RtafiIntakePage';
export { default as RtafiHouseholdSetupPage } from './pages/RtafiHouseholdSetupPage';
export { default as RtafiHouseholdComparisonPage } from './pages/RtafiHouseholdComparisonPage';