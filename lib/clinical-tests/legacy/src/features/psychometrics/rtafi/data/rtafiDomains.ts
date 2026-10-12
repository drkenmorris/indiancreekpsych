// src/features/psychometrics/rtafi/data/rtafiDomains.ts

import type {
  RtafiDomainDefinition,
  RtafiSubscaleDefinition,
} from '../types/rtafiTypes';

export const RTAFI_DOMAIN_DEFINITIONS: RtafiDomainDefinition[] = [
  {
    code: 'TRSA',
    name: 'Trauma-Related Stress Activation',
    description:
      'Measures chronic stress activation, fear sensitization, emotional overwhelm, physiological stress burden, and trauma-related threat monitoring patterns.',
  },

  {
    code: 'EICR',
    name: 'Emotional Invalidation & Coercive Relational Dynamics',
    description:
      'Measures emotionally destabilizing relational experiences, invalidation patterns, emotional unpredictability, fear-based compliance, and conditional relational approval.',
  },

  {
    code: 'ASRT',
    name: 'Attachment Security & Relational Trust',
    description:
      'Measures emotional safety, caregiver accessibility, attachment stability, trust formation, abandonment concerns, and emotional closeness versus avoidance.',
  },

  {
    code: 'EBR',
    name: 'Emotional & Behavioral Regulation',
    description:
      'Measures emotional control, impulsivity, reactive escalation, suppression patterns, social regulation, and behavioral adaptation under stress.',
  },

  {
    code: 'FSF',
    name: 'Family System Functioning',
    description:
      'Measures emotional organization within the family system, conflict exposure, emotional expression safety, loyalty conflict dynamics, and relational predictability.',
  },

  {
    code: 'DASB',
    name: 'Depression / Anxiety / Shame Burden',
    description:
      'Measures internal emotional suffering, hopelessness, shame burden, anxiety, chronic worry, isolation, rejection sensitivity, and self-blame patterns.',
  },

  {
    code: 'RPF',
    name: 'Resilience & Protective Functioning',
    description:
      'Measures emotional support access, coping resources, emotional recovery ability, self-expression capacity, emotional insight, and adaptive future orientation.',
  },

  {
    code: 'VRSA',
    name: 'Validity & Response Style Analysis',
    description:
      'Measures response consistency, defensive minimization, exaggeration tendencies, random responding, and overall response reliability patterns.',
  },
];

export const RTAFI_SUBSCALE_DEFINITIONS: RtafiSubscaleDefinition[] = [
  // =========================================================
  // TRAUMA-RELATED STRESS ACTIVATION (TRSA)
  // =========================================================

  {
    code: 'TRSA_HV',
    domain: 'TRSA',
    name: 'Hypervigilance & Threat Monitoring',
    description:
      'Measures chronic environmental scanning, anticipatory fear, exaggerated alertness, and difficulty relaxing due to perceived threat sensitivity.',
    targetConstructs: [
      'hypervigilance',
      'anticipatory anxiety',
      'environmental threat scanning',
      'fear sensitization',
      'safety instability',
    ],
  },

  {
    code: 'TRSA_ER',
    domain: 'TRSA',
    name: 'Emotional Flooding & Reactivity',
    description:
      'Measures emotional overwhelm, emotional escalation, distress surges, and difficulty regulating emotional activation once triggered.',
    targetConstructs: [
      'emotional flooding',
      'stress escalation',
      'emotional intensity',
      'reactive distress',
      'overwhelm sensitivity',
    ],
  },

  {
    code: 'TRSA_PS',
    domain: 'TRSA',
    name: 'Physiological Stress Sensitivity',
    description:
      'Measures body-based stress activation patterns associated with chronic emotional strain and heightened nervous system activation.',
    targetConstructs: [
      'somatic stress',
      'autonomic activation',
      'sleep disruption',
      'startle sensitivity',
      'stress embodiment',
    ],
  },

  {
    code: 'TRSA_AV',
    domain: 'TRSA',
    name: 'Avoidance & Emotional Numbing',
    description:
      'Measures emotional withdrawal, emotional disengagement, avoidance coping, and detachment-like stress adaptation patterns.',
    targetConstructs: [
      'avoidance',
      'emotional numbing',
      'withdrawal',
      'detachment',
      'disengagement coping',
    ],
  },

  // =========================================================
  // EMOTIONAL INVALIDATION & COERCIVE RELATIONAL DYNAMICS
  // =========================================================

  {
    code: 'EICR_CC',
    domain: 'EICR',
    name: 'Chronic Criticism & Humiliation Exposure',
    description:
      'Measures perceived exposure to ridicule, criticism, emotional degradation, embarrassment conditioning, and shaming interactions.',
    targetConstructs: [
      'criticism exposure',
      'humiliation sensitivity',
      'shame conditioning',
      'fear of mistakes',
      'emotional degradation',
    ],
  },

  {
    code: 'EICR_EU',
    domain: 'EICR',
    name: 'Emotional Unpredictability',
    description:
      'Measures emotional inconsistency, unstable relational responses, and unpredictability within emotionally important relationships.',
    targetConstructs: [
      'emotional unpredictability',
      'walking on eggshells',
      'unstable emotional climate',
      'caregiver inconsistency',
      'relational instability',
    ],
  },

  {
    code: 'EICR_FC',
    domain: 'EICR',
    name: 'Fear-Based Compliance',
    description:
      'Measures emotional appeasement, people-pleasing adaptation, conflict avoidance, and fear-driven behavioral conformity.',
    targetConstructs: [
      'fear-based compliance',
      'appeasement',
      'conflict avoidance',
      'people pleasing',
      'emotional suppression',
    ],
  },

  {
    code: 'EICR_CP',
    domain: 'EICR',
    name: 'Conditional Approval & Emotional Control',
    description:
      'Measures perceptions that approval, affection, or acceptance depend upon emotional conformity, performance, or compliance.',
    targetConstructs: [
      'conditional approval',
      'approval dependency',
      'emotional manipulation',
      'control dynamics',
      'acceptance instability',
    ],
  },

  // =========================================================
  // ATTACHMENT SECURITY & RELATIONAL TRUST
  // =========================================================

  {
    code: 'ASRT_ES',
    domain: 'ASRT',
    name: 'Emotional Safety',
    description:
      'Measures perceived emotional safety, emotional comfort, and ability to relax emotionally within close relationships.',
    targetConstructs: [
      'emotional safety',
      'relational trust',
      'security',
      'emotional comfort',
      'safe attachment',
    ],
  },

  {
    code: 'ASRT_CA',
    domain: 'ASRT',
    name: 'Caregiver Accessibility & Support',
    description:
      'Measures perceived emotional responsiveness, support access, and emotional availability of caregivers or trusted adults.',
    targetConstructs: [
      'caregiver responsiveness',
      'support access',
      'emotional availability',
      'comfort seeking',
      'attachment accessibility',
    ],
  },

  {
    code: 'ASRT_AI',
    domain: 'ASRT',
    name: 'Attachment Insecurity & Abandonment Fear',
    description:
      'Measures fears of rejection, emotional abandonment, instability in relationships, and attachment insecurity patterns.',
    targetConstructs: [
      'abandonment fear',
      'attachment insecurity',
      'rejection sensitivity',
      'fear of emotional loss',
      'dependency anxiety',
    ],
  },

  {
    code: 'ASRT_EA',
    domain: 'ASRT',
    name: 'Emotional Avoidance & Relational Withdrawal',
    description:
      'Measures emotional guardedness, discomfort with vulnerability, emotional distancing, and withdrawal from emotional closeness.',
    targetConstructs: [
      'emotional avoidance',
      'guardedness',
      'relational withdrawal',
      'avoidant coping',
      'vulnerability discomfort',
    ],
  },

  // =========================================================
  // EMOTIONAL & BEHAVIORAL REGULATION
  // =========================================================

  {
    code: 'EBR_AR',
    domain: 'EBR',
    name: 'Anger & Reactive Escalation',
    description:
      'Measures reactive anger activation, frustration intolerance, irritability, and escalation tendencies under emotional strain.',
    targetConstructs: [
      'anger reactivity',
      'escalation',
      'frustration intolerance',
      'irritability',
      'emotional explosiveness',
    ],
  },

  {
    code: 'EBR_ES',
    domain: 'EBR',
    name: 'Emotional Suppression & Shutdown',
    description:
      'Measures emotional holding, emotional concealment, withdrawal coping, and internalized emotional suppression patterns.',
    targetConstructs: [
      'suppression',
      'shutdown',
      'withdrawal',
      'silent distress',
      'internalization',
    ],
  },

  {
    code: 'EBR_IB',
    domain: 'EBR',
    name: 'Impulsivity & Behavioral Instability',
    description:
      'Measures impulsive reactions, emotional impulsivity, behavioral inconsistency, and reduced self-regulation under stress.',
    targetConstructs: [
      'impulsivity',
      'behavioral instability',
      'poor self-control',
      'emotional impulsiveness',
      'reactive behavior',
    ],
  },

  {
    code: 'EBR_SF',
    domain: 'EBR',
    name: 'Social & Functional Regulation',
    description:
      'Measures the impact of emotional strain on social adaptation, school functioning, concentration, and peer relationships.',
    targetConstructs: [
      'social functioning',
      'peer disruption',
      'functional impairment',
      'school stress',
      'attention disruption',
    ],
  },

  // =========================================================
  // FAMILY SYSTEM FUNCTIONING
  // =========================================================

  {
    code: 'FSF_CC',
    domain: 'FSF',
    name: 'Chronic Conflict Exposure',
    description:
      'Measures frequency and intensity of perceived emotional conflict and interpersonal tension within the family system.',
    targetConstructs: [
      'family conflict',
      'tension exposure',
      'emotional volatility',
      'argument exposure',
      'conflict anticipation',
    ],
  },

  {
    code: 'FSF_LT',
    domain: 'FSF',
    name: 'Loyalty Conflict & Triangulation',
    description:
      'Measures emotional pressure to align with one individual against another and feelings of being caught between relationships.',
    targetConstructs: [
      'triangulation',
      'divided loyalties',
      'alliance pressure',
      'relational guilt',
      'family splitting',
    ],
  },

  {
    code: 'FSF_ES',
    domain: 'FSF',
    name: 'Emotional Expression Safety',
    description:
      'Measures perceived safety expressing emotions, disagreement, vulnerability, and personal thoughts within the family environment.',
    targetConstructs: [
      'expression safety',
      'fear of reactions',
      'emotional concealment',
      'communication safety',
      'vulnerability comfort',
    ],
  },

  {
    code: 'FSF_FP',
    domain: 'FSF',
    name: 'Family Stability & Predictability',
    description:
      'Measures emotional organization, environmental consistency, predictability, and stability within the family system.',
    targetConstructs: [
      'family predictability',
      'stability',
      'environmental consistency',
      'chaos',
      'routine instability',
    ],
  },

  // =========================================================
  // DEPRESSION / ANXIETY / SHAME BURDEN
  // =========================================================

  {
    code: 'DASB_SH',
    domain: 'DASB',
    name: 'Sadness & Hopelessness',
    description:
      'Measures persistent sadness, discouragement, reduced optimism, emotional heaviness, and hopelessness patterns.',
    targetConstructs: [
      'sadness',
      'hopelessness',
      'discouragement',
      'low mood',
      'reduced optimism',
    ],
  },

  {
    code: 'DASB_AW',
    domain: 'DASB',
    name: 'Anxiety & Worry Burden',
    description:
      'Measures chronic worry, nervous anticipation, fear-based apprehension, and generalized emotional tension.',
    targetConstructs: [
      'anxiety',
      'worry',
      'anticipatory fear',
      'tension',
      'nervousness',
    ],
  },

  {
    code: 'DASB_SB',
    domain: 'DASB',
    name: 'Shame & Self-Blame',
    description:
      'Measures internalized guilt, excessive responsibility-taking, shame sensitivity, and self-critical emotional processing.',
    targetConstructs: [
      'self-blame',
      'guilt',
      'shame',
      'self-criticism',
      'internalized responsibility',
    ],
  },

  {
    code: 'DASB_IR',
    domain: 'DASB',
    name: 'Isolation & Rejection Sensitivity',
    description:
      'Measures emotional loneliness, social withdrawal, rejection sensitivity, and feelings of emotional disconnection.',
    targetConstructs: [
      'isolation',
      'rejection sensitivity',
      'loneliness',
      'withdrawal',
      'social insecurity',
    ],
  },

  // =========================================================
  // RESILIENCE & PROTECTIVE FUNCTIONING
  // =========================================================

  {
    code: 'RPF_ES',
    domain: 'RPF',
    name: 'Emotional Support Access',
    description:
      'Measures perceived access to emotionally supportive, trustworthy, and stabilizing relationships.',
    targetConstructs: [
      'support access',
      'trusted relationships',
      'relational support',
      'social buffering',
      'emotional connection',
    ],
  },

  {
    code: 'RPF_ER',
    domain: 'RPF',
    name: 'Emotional Recovery Capacity',
    description:
      'Measures resilience, recovery speed, emotional repair ability, and adaptive stress rebound capacity.',
    targetConstructs: [
      'recovery ability',
      'resilience',
      'stress rebound',
      'adaptation',
      'emotional repair',
    ],
  },

  {
    code: 'RPF_SI',
    domain: 'RPF',
    name: 'Self-Expression & Emotional Insight',
    description:
      'Measures emotional awareness, emotional communication ability, and insight into personal emotional experiences.',
    targetConstructs: [
      'self-expression',
      'emotional insight',
      'emotional awareness',
      'communication',
      'self-understanding',
    ],
  },

  {
    code: 'RPF_FO',
    domain: 'RPF',
    name: 'Future Orientation & Adaptive Coping',
    description:
      'Measures hopefulness, coping confidence, adaptive problem-solving, and positive future orientation.',
    targetConstructs: [
      'hopefulness',
      'future orientation',
      'coping confidence',
      'adaptation',
      'problem-solving',
    ],
  },

  // =========================================================
  // VALIDITY & RESPONSE STYLE ANALYSIS
  // =========================================================

  {
    code: 'VRSA_DM',
    domain: 'VRSA',
    name: 'Defensive Minimization',
    description:
      'Detects unrealistically low distress reporting, denial patterns, and defensive emotional minimization.',
    targetConstructs: [
      'minimization',
      'defensiveness',
      'denial',
      'underreporting',
      'social desirability',
    ],
  },

  {
    code: 'VRSA_EX',
    domain: 'VRSA',
    name: 'Exaggeration & Amplification',
    description:
      'Detects improbable, exaggerated, or globally extreme distress endorsement patterns.',
    targetConstructs: [
      'amplification',
      'symptom exaggeration',
      'overreporting',
      'extreme responding',
      'global distress endorsement',
    ],
  },

  {
    code: 'VRSA_IC',
    domain: 'VRSA',
    name: 'Inconsistency & Contradiction',
    description:
      'Measures contradictory responses across paired or opposing items to evaluate response coherence.',
    targetConstructs: [
      'inconsistency',
      'contradiction',
      'response instability',
      'coherence problems',
      'careless responding',
    ],
  },

  {
    code: 'VRSA_RR',
    domain: 'VRSA',
    name: 'Random / Careless Responding',
    description:
      'Measures erratic, inattentive, or random response patterns suggesting reduced response reliability.',
    targetConstructs: [
      'random responding',
      'careless responding',
      'inattention',
      'erratic patterns',
      'low engagement',
    ],
  },
];