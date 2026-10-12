// src/features/psychometrics/rtafi/data/rtafiScaleDefinitions.ts

import type {
  RtafiDomainCode,
  RtafiSeverityLevel,
  RtafiSubscaleCode,
} from '../types/rtafiTypes';

export interface RtafiSeverityThreshold {
  min: number;
  max: number;
  label: RtafiSeverityLevel;
}

export interface RtafiSubscaleConfiguration {
  subscale: RtafiSubscaleCode;
  domain: RtafiDomainCode;

  expectedItemCount: number;

  reverseScoredItemsExpected: number;

  severityThresholds: RtafiSeverityThreshold[];

  interpretationSummary: string;

  clinicalConsiderations: string[];

  resilienceFactors?: string[];

  associatedConstructs: string[];

  riskIndicators?: string[];
}

export interface RtafiCompositeIndexDefinition {
  code:
    | 'TBI'
    | 'ASI'
    | 'ERI'
    | 'FSI'
    | 'RSI'
    | 'RCI';

  name: string;

  description: string;

  includedSubscales: RtafiSubscaleCode[];

  interpretationFocus: string[];
}

export const DEFAULT_SEVERITY_THRESHOLDS: RtafiSeverityThreshold[] = [
  {
    min: 0,
    max: 0.74,
    label: 'Minimal',
  },

  {
    min: 0.75,
    max: 1.49,
    label: 'Mild',
  },

  {
    min: 1.5,
    max: 2.49,
    label: 'Moderate',
  },

  {
    min: 2.5,
    max: 3.24,
    label: 'Elevated',
  },

  {
    min: 3.25,
    max: 4,
    label: 'Severe',
  },
];

export const RTAFI_SUBSCALE_CONFIGURATIONS: RtafiSubscaleConfiguration[] = [
  // =========================================================
  // TRAUMA-RELATED STRESS ACTIVATION
  // =========================================================

  {
    subscale: 'TRSA_HV',
    domain: 'TRSA',

    expectedItemCount: 9,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures chronic alertness, anticipatory fear, and environmental threat monitoring.',

    clinicalConsiderations: [
      'Heightened scores may reflect chronic stress activation.',
      'Elevated vigilance may interfere with emotional relaxation and perceived safety.',
      'Persistent threat anticipation may contribute to emotional fatigue.',
    ],

    associatedConstructs: [
      'hypervigilance',
      'fear conditioning',
      'environmental scanning',
      'anticipatory stress',
    ],

    riskIndicators: [
      'sleep disruption',
      'stress sensitization',
      'anxiety escalation',
    ],
  },

  {
    subscale: 'TRSA_ER',
    domain: 'TRSA',

    expectedItemCount: 9,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures emotional overwhelm, emotional escalation, and difficulty containing emotional activation.',

    clinicalConsiderations: [
      'High scores may reflect emotional flooding under stress.',
      'Emotional escalation may interfere with coping and relational stability.',
      'Reactivity may increase under perceived emotional threat.',
    ],

    associatedConstructs: [
      'emotional flooding',
      'stress escalation',
      'reactivity',
      'emotional overwhelm',
    ],

    riskIndicators: [
      'behavioral dysregulation',
      'shutdown patterns',
      'stress overload',
    ],
  },

  {
    subscale: 'TRSA_PS',
    domain: 'TRSA',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 1,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures physiological stress activation and body-based stress sensitivity.',

    clinicalConsiderations: [
      'Stress burden may manifest through somatic symptoms.',
      'Heightened nervous-system activation may impact functioning.',
      'Body-based stress reactions may increase under emotional strain.',
    ],

    associatedConstructs: [
      'somatic stress',
      'physiological activation',
      'autonomic sensitivity',
      'stress embodiment',
    ],

    riskIndicators: [
      'sleep problems',
      'physical stress complaints',
      'fatigue',
    ],
  },

  {
    subscale: 'TRSA_AV',
    domain: 'TRSA',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures emotional withdrawal, avoidance coping, and emotional numbing tendencies.',

    clinicalConsiderations: [
      'Avoidance may function as a protective coping strategy.',
      'Emotional disengagement may reduce emotional processing capacity.',
      'Withdrawal patterns may interfere with relational closeness.',
    ],

    associatedConstructs: [
      'avoidance',
      'withdrawal',
      'emotional numbing',
      'detachment',
    ],

    riskIndicators: [
      'social isolation',
      'suppression patterns',
      'disengagement',
    ],
  },

  // =========================================================
  // EMOTIONAL INVALIDATION & COERCIVE RELATIONAL DYNAMICS
  // =========================================================

  {
    subscale: 'EICR_CC',
    domain: 'EICR',

    expectedItemCount: 9,

    reverseScoredItemsExpected: 1,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures perceived criticism exposure, humiliation sensitivity, and shaming relational dynamics.',

    clinicalConsiderations: [
      'High scores may reflect emotionally invalidating interpersonal experiences.',
      'Repeated criticism exposure may contribute to shame burden.',
      'Fear of mistakes may develop in emotionally critical environments.',
    ],

    associatedConstructs: [
      'criticism',
      'humiliation',
      'shame',
      'emotional invalidation',
    ],

    riskIndicators: [
      'low self-worth',
      'fear-based adaptation',
      'withdrawal',
    ],
  },

  {
    subscale: 'EICR_EU',
    domain: 'EICR',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures emotional unpredictability and instability in emotionally important relationships.',

    clinicalConsiderations: [
      'Unpredictable emotional climates may increase stress sensitivity.',
      'Difficulty predicting emotional responses may contribute to vigilance.',
      'Relational inconsistency may impact emotional security.',
    ],

    associatedConstructs: [
      'unpredictability',
      'walking on eggshells',
      'relational instability',
      'emotional inconsistency',
    ],

    riskIndicators: [
      'hypervigilance',
      'attachment insecurity',
      'fear-based compliance',
    ],
  },

  {
    subscale: 'EICR_FC',
    domain: 'EICR',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures fear-driven compliance, appeasement patterns, and emotional conflict avoidance.',

    clinicalConsiderations: [
      'Fear-based adaptation may reduce authentic emotional expression.',
      'Appeasement strategies may develop in emotionally tense environments.',
      'Avoidance of conflict may reflect perceived emotional risk.',
    ],

    associatedConstructs: [
      'appeasement',
      'people pleasing',
      'fear-based compliance',
      'conflict avoidance',
    ],

    riskIndicators: [
      'suppression',
      'self-silencing',
      'relational anxiety',
    ],
  },

  {
    subscale: 'EICR_CP',
    domain: 'EICR',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures conditional acceptance, approval dependency, and emotional control dynamics.',

    clinicalConsiderations: [
      'Conditional approval patterns may impact self-worth development.',
      'Emotional conformity pressure may reduce emotional authenticity.',
      'Approval dependency may increase relational insecurity.',
    ],

    associatedConstructs: [
      'conditional approval',
      'approval dependency',
      'emotional control',
      'acceptance instability',
    ],

    riskIndicators: [
      'self-esteem instability',
      'attachment insecurity',
      'identity suppression',
    ],
  },

  // =========================================================
  // ATTACHMENT SECURITY & RELATIONAL TRUST
  // =========================================================

  {
    subscale: 'ASRT_ES',
    domain: 'ASRT',

    expectedItemCount: 9,

    reverseScoredItemsExpected: 3,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures emotional safety and emotional comfort within close relationships.',

    clinicalConsiderations: [
      'Higher emotional safety is associated with greater relational stability.',
      'Reduced emotional safety may increase emotional guardedness.',
      'Emotional security supports adaptive attachment development.',
    ],

    resilienceFactors: [
      'secure attachment',
      'trust formation',
      'relational confidence',
    ],

    associatedConstructs: [
      'emotional safety',
      'attachment security',
      'trust',
      'relational comfort',
    ],
  },

  {
    subscale: 'ASRT_CA',
    domain: 'ASRT',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 3,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures perceived emotional accessibility and caregiver responsiveness.',

    clinicalConsiderations: [
      'Emotional responsiveness supports emotional regulation development.',
      'Support accessibility may buffer emotional stress burden.',
      'Reliable support relationships may strengthen resilience.',
    ],

    resilienceFactors: [
      'support access',
      'secure relationships',
      'emotional buffering',
    ],

    associatedConstructs: [
      'caregiver responsiveness',
      'support',
      'availability',
      'comfort seeking',
    ],
  },

  {
    subscale: 'ASRT_AI',
    domain: 'ASRT',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 1,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures attachment insecurity, rejection sensitivity, and abandonment-related fears.',

    clinicalConsiderations: [
      'Fear of rejection may impact emotional closeness.',
      'Attachment insecurity may contribute to emotional instability.',
      'Abandonment concerns may increase relational anxiety.',
    ],

    associatedConstructs: [
      'abandonment fear',
      'attachment insecurity',
      'rejection sensitivity',
      'dependency anxiety',
    ],

    riskIndicators: [
      'clinginess',
      'withdrawal',
      'relational instability',
    ],
  },

  {
    subscale: 'ASRT_EA',
    domain: 'ASRT',

    expectedItemCount: 8,

    reverseScoredItemsExpected: 2,

    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS,

    interpretationSummary:
      'Measures emotional guardedness, emotional distancing, and avoidance of vulnerability.',

    clinicalConsiderations: [
      'Relational withdrawal may function as emotional self-protection.',
      'Difficulty with vulnerability may interfere with closeness.',
      'Avoidance may reduce emotional intimacy and support seeking.',
    ],

    associatedConstructs: [
      'avoidance',
      'guardedness',
      'withdrawal',
      'vulnerability discomfort',
    ],

    riskIndicators: [
      'social isolation',
      'attachment disruption',
      'suppression',
    ],
  },
];

export const RTAFI_COMPOSITE_INDEX_DEFINITIONS: RtafiCompositeIndexDefinition[] =
  [
    {
      code: 'TBI',

      name: 'Trauma Burden Index',

      description:
        'Represents overall emotional stress burden, trauma-related activation, and chronic distress sensitivity.',

      includedSubscales: [
        'TRSA_HV',
        'TRSA_ER',
        'TRSA_PS',
        'TRSA_AV',
        'DASB_SH',
        'DASB_AW',
      ],

      interpretationFocus: [
        'stress burden',
        'emotional activation',
        'trauma-related symptom intensity',
      ],
    },

    {
      code: 'ASI',

      name: 'Attachment Security Index',

      description:
        'Represents emotional safety, attachment trust, and relational security patterns.',

      includedSubscales: [
        'ASRT_ES',
        'ASRT_CA',
        'ASRT_AI',
        'ASRT_EA',
      ],

      interpretationFocus: [
        'attachment stability',
        'trust',
        'emotional safety',
      ],
    },

    {
      code: 'ERI',

      name: 'Emotional Regulation Index',

      description:
        'Represents emotional modulation capacity, impulse regulation, and emotional stability.',

      includedSubscales: [
        'TRSA_ER',
        'EBR_AR',
        'EBR_ES',
        'EBR_IB',
      ],

      interpretationFocus: [
        'emotional regulation',
        'reactivity',
        'behavioral control',
      ],
    },

    {
      code: 'FSI',

      name: 'Family Stability Index',

      description:
        'Represents perceived family predictability, communication safety, and emotional organization.',

      includedSubscales: [
        'FSF_CC',
        'FSF_LT',
        'FSF_ES',
        'FSF_FP',
      ],

      interpretationFocus: [
        'family organization',
        'conflict burden',
        'family safety',
      ],
    },

    {
      code: 'RSI',

      name: 'Relational Safety Index',

      description:
        'Represents perceived emotional safety, support accessibility, and relational predictability.',

      includedSubscales: [
        'ASRT_ES',
        'ASRT_CA',
        'EICR_EU',
        'EICR_FC',
      ],

      interpretationFocus: [
        'relational safety',
        'emotional predictability',
        'support stability',
      ],
    },

    {
      code: 'RCI',

      name: 'Resilience Capacity Index',

      description:
        'Represents adaptive coping resources, recovery ability, emotional insight, and future orientation.',

      includedSubscales: [
        'RPF_ES',
        'RPF_ER',
        'RPF_SI',
        'RPF_FO',
      ],

      interpretationFocus: [
        'resilience',
        'coping strength',
        'adaptive functioning',
      ],
    },
  ];