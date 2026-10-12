// src/features/psychometrics/rtafi/context/rtafiHouseholdContextTypes.ts

export type RtafiAdministrationContextType =
  | 'general'
  | 'household_a'
  | 'household_b'
  | 'caregiver_specific'
  | 'school_setting'
  | 'residential_setting'
  | 'community_setting';

export interface RtafiAdministrationContext {
  contextId: string;

  contextType: RtafiAdministrationContextType;

  displayLabel: string;

  instructions: string;

  description?: string;

  associatedCaregiverName?: string;

  associatedRelationship?: string;

  associatedSettingName?: string;
}

export interface RtafiContextualizedPrompt {
  itemId: string;

  originalPrompt: string;

  contextualizedPrompt: string;

  contextId: string;

  contextLabel: string;
}

export interface RtafiComparativeProfile {
  comparisonId: string;

  primaryContextId: string;

  secondaryContextId: string;

  relationalSafetyDifference: number;

  emotionalInvalidationDifference: number;

  attachmentSecurityDifference: number;

  traumaActivationDifference: number;

  emotionalRegulationDifference: number;

  familyStabilityDifference: number;

  resilienceDifference: number;

  summaryNarrative: string;
}

export interface RtafiCrossContextInterpretation {
  strongestSafetyContext?: string;

  highestStressContext?: string;

  greatestRelationalInstabilityContext?: string;

  greatestSupportContext?: string;

  contextSensitivityPattern: string;

  interpretiveSummary: string;

  clinicalConsiderations: string[];
}