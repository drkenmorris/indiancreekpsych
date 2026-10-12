// src/features/psychometrics/rtafi/types/rtafiTypes.ts

export type RtafiResponseValue = 0 | 1 | 2 | 3 | 4;

export type RtafiDomainCode =
  | 'TRSA'
  | 'EICR'
  | 'ASRT'
  | 'EBR'
  | 'FSF'
  | 'DASB'
  | 'RPF'
  | 'VRSA';

export type RtafiSubscaleCode =
  // Trauma-Related Stress Activation
  | 'TRSA_HV'
  | 'TRSA_ER'
  | 'TRSA_PS'
  | 'TRSA_AV'

  // Emotional Invalidation & Coercive Relational Dynamics
  | 'EICR_CC'
  | 'EICR_EU'
  | 'EICR_FC'
  | 'EICR_CP'

  // Attachment Security & Relational Trust
  | 'ASRT_ES'
  | 'ASRT_CA'
  | 'ASRT_AI'
  | 'ASRT_EA'

  // Emotional & Behavioral Regulation
  | 'EBR_AR'
  | 'EBR_ES'
  | 'EBR_IB'
  | 'EBR_SF'

  // Family System Functioning
  | 'FSF_CC'
  | 'FSF_LT'
  | 'FSF_ES'
  | 'FSF_FP'

  // Depression / Anxiety / Shame Burden
  | 'DASB_SH'
  | 'DASB_AW'
  | 'DASB_SB'
  | 'DASB_IR'

  // Resilience & Protective Functioning
  | 'RPF_ES'
  | 'RPF_ER'
  | 'RPF_SI'
  | 'RPF_FO'

  // Validity & Response Style Analysis
  | 'VRSA_DM'
  | 'VRSA_EX'
  | 'VRSA_IC'
  | 'VRSA_RR';

export type RtafiSeverityLevel =
  | 'Minimal'
  | 'Mild'
  | 'Moderate'
  | 'Elevated'
  | 'Severe';

export type RtafiValidityConcernLevel =
  | 'None'
  | 'Mild'
  | 'Moderate'
  | 'Significant';

export type RtafiBarScaleDirection =
  | 'risk'
  | 'protective'
  | 'mixed'
  | 'validity';

export interface RtafiDomainDefinition {
  code: RtafiDomainCode;
  name: string;
  description: string;
}

export interface RtafiSubscaleDefinition {
  code: RtafiSubscaleCode;
  domain: RtafiDomainCode;
  name: string;
  description: string;
  targetConstructs: string[];
}

export interface RtafiItem {
  id: string;
  itemNumber: number;
  domain: RtafiDomainCode;
  subscale: RtafiSubscaleCode;
  prompt: string;
  reverseScored: boolean;
  developmentalNotes?: string;
  tags?: string[];
}

export interface RtafiResponse {
  itemId: string;
  value: RtafiResponseValue;
}

export interface RtafiSubscaleScore {
  subscale: RtafiSubscaleCode;
  rawScore: number;
  itemCount: number;
  meanScore: number;
  standardizedScore?: number;
  severityLevel?: RtafiSeverityLevel;
}

export interface RtafiDomainScore {
  domain: RtafiDomainCode;
  rawScore: number;
  itemCount: number;
  meanScore: number;
  standardizedScore?: number;
  severityLevel?: RtafiSeverityLevel;
  subscaleScores: RtafiSubscaleScore[];
}

export interface RtafiCompositeIndices {
  traumaBurdenIndex: number;
  attachmentSecurityIndex: number;
  emotionalRegulationIndex: number;
  familyStabilityIndex: number;
  relationalSafetyIndex: number;
  resilienceCapacityIndex: number;
}

export interface RtafiValidityProfile {
  defensiveMinimization: number;
  exaggerationAmplification: number;
  inconsistencyIndex: number;
  randomRespondingIndex: number;

  minimizationFlag: boolean;
  exaggerationFlag: boolean;
  inconsistencyFlag: boolean;
  randomRespondingFlag: boolean;

  overallValidityConcernLevel: RtafiValidityConcernLevel;
}

export interface RtafiNarrativeSection {
  title: string;
  content: string;
}

export interface RtafiConstructDefinition {
  code: RtafiDomainCode | RtafiSubscaleCode | string;
  name: string;
  definition: string;
  measuredBy: string;
  clinicalMeaning: string;
  interpretiveCautions: string[];
}

export interface RtafiBarScaleDescriptor {
  code: string;
  label: string;
  score: number;
  direction: RtafiBarScaleDirection;
  lowAnchor: string;
  highAnchor: string;
  severityLevel?: RtafiSeverityLevel | RtafiValidityConcernLevel;
  interpretiveText: string;
}

export interface RtafiSubscaleNarrative {
  subscale: RtafiSubscaleCode;
  name: string;
  score: number;
  severityLevel?: RtafiSeverityLevel;
  constructDefinition: string;
  measuredCharacteristics: string[];
  narrative: string;
  clinicalMeaning: string;
  caution: string;
  barScale: RtafiBarScaleDescriptor;
}

export interface RtafiDomainNarrative {
  domain: RtafiDomainCode;
  name: string;
  score: number;
  severityLevel?: RtafiSeverityLevel;
  constructDefinition: string;
  measuredCharacteristics: string[];
  narrative: string;
  clinicalMeaning: string;
  caution: string;
  subscaleNarratives: RtafiSubscaleNarrative[];
  barScale: RtafiBarScaleDescriptor;
}

export interface RtafiCompositeNarrative {
  code:
    | 'TBI'
    | 'ASI'
    | 'ERI'
    | 'FSI'
    | 'RSI'
    | 'RCI';

  name: string;
  score: number;
  direction: RtafiBarScaleDirection;
  definition: string;
  narrative: string;
  clinicalMeaning: string;
  caution: string;
  barScale: RtafiBarScaleDescriptor;
}

export interface RtafiValidityNarrative {
  summary: string;
  defensiveMinimizationNarrative: string;
  exaggerationNarrative: string;
  inconsistencyNarrative: string;
  randomRespondingNarrative: string;
  reliabilityInterpretation: string;
  interpretiveLimitations: string[];
  barScales: RtafiBarScaleDescriptor[];
}

export interface RtafiInterpretationProfile {
  overview: string;

  strengths: string[];

  clinicalConsiderations: string[];

  relationalIndicators: string[];

  emotionalFunctioningIndicators: string[];

  resilienceIndicators: string[];

  validityConsiderations: string[];

  narrativeSections: RtafiNarrativeSection[];

  constructDefinitions: RtafiConstructDefinition[];

  domainNarratives: RtafiDomainNarrative[];

  compositeNarratives: RtafiCompositeNarrative[];

  validityNarrative: RtafiValidityNarrative;

  clinicalCautions: string[];

  recommendedFollowUp: string[];

  reportDisclaimer: string;
}

export interface RtafiAssessmentResult {
  completedAt: string;

  totalItemsAnswered: number;

  domainScores: RtafiDomainScore[];

  compositeIndices: RtafiCompositeIndices;

  validityProfile: RtafiValidityProfile;

  interpretationProfile: RtafiInterpretationProfile;
}

export interface RtafiAdministrationConfig {
  minimumAge: number;
  maximumAge: number;

  allowSkippedItems: boolean;

  minimumCompletionPercentage: number;

  randomizedItemOrder: boolean;

  enableValidityChecks: boolean;

  enableProgressSaving: boolean;
}

export interface RtafiLikertOption {
  value: RtafiResponseValue;
  label: string;
}

export const RTAFI_RESPONSE_OPTIONS: RtafiLikertOption[] = [
  {
    value: 0,
    label: 'Never True',
  },
  {
    value: 1,
    label: 'Rarely True',
  },
  {
    value: 2,
    label: 'Sometimes True',
  },
  {
    value: 3,
    label: 'Often True',
  },
  {
    value: 4,
    label: 'Very Often True',
  },
];

export const DEFAULT_RTAFI_ADMINISTRATION_CONFIG: RtafiAdministrationConfig =
  {
    minimumAge: 10,
    maximumAge: 18,

    allowSkippedItems: false,

    minimumCompletionPercentage: 0.9,

    randomizedItemOrder: false,

    enableValidityChecks: true,

    enableProgressSaving: true,
  };