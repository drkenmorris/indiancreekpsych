// src/features/psychometrics/rtafi/narratives/rtafiNarratives.ts

import type {
  RtafiAssessmentResult,
  RtafiBarScaleDescriptor,
  RtafiCompositeNarrative,
  RtafiConstructDefinition,
  RtafiDomainCode,
  RtafiDomainNarrative,
  RtafiDomainScore,
  RtafiInterpretationProfile,
  RtafiSeverityLevel,
  RtafiSubscaleNarrative,
  RtafiValidityConcernLevel,
  RtafiValidityNarrative,
} from '../types/rtafiTypes';

type ScaleDirection = 'risk' | 'protective' | 'mixed' | 'validity';

interface ConstructNarrativeDefinition {
  name: string;
  definition: string;
  measuredCharacteristics: string[];
  lowDescription: string;
  moderateDescription: string;
  elevatedDescription: string;
  clinicalMeaning: string;
  caution: string;
}

const DOMAIN_DEFINITIONS: Record<RtafiDomainCode, ConstructNarrativeDefinition> = {
  TRSA: {
    name: 'Trauma-Related Stress Activation',
    definition:
      'This domain measures patterns of emotional and physiological stress activation that may occur when a young person lives with chronic strain, relational insecurity, repeated threat anticipation, or unresolved distress. It includes hypervigilance, emotional flooding, somatic stress responses, and avoidance or emotional numbing.',
    measuredCharacteristics: [
      'Hypervigilance and environmental scanning',
      'Emotional flooding and stress escalation',
      'Physiological arousal and somatic stress',
      'Avoidance, numbing, and detachment-like coping',
    ],
    lowDescription:
      'Lower scores suggest that the youth generally experiences manageable stress activation and can often return to calm after emotional strain.',
    moderateDescription:
      'Moderate scores suggest noticeable stress sensitivity that may emerge under relational tension, uncertainty, or emotionally charged circumstances.',
    elevatedDescription:
      'Elevated scores suggest strong stress activation patterns that may interfere with emotional calm, sleep, concentration, relational trust, or daily functioning.',
    clinicalMeaning:
      'High scores may be consistent with trauma-related stress burden, chronic anxiety, hyperarousal, environmental instability, or other stress-related developmental adaptations.',
    caution:
      'This domain does not prove trauma exposure or abuse. Similar patterns can emerge from anxiety, family conflict, grief, neurodevelopmental sensitivity, medical stress, school stress, or other environmental burdens.',
  },

  EICR: {
    name: 'Emotional Invalidation & Coercive Relational Dynamics',
    definition:
      'This domain measures perceived exposure to emotionally invalidating, unpredictable, critical, conditional, or coercive relational patterns. It evaluates the youth’s felt need to self-monitor, appease, suppress feelings, or perform emotionally in order to preserve relational stability.',
    measuredCharacteristics: [
      'Chronic criticism and humiliation sensitivity',
      'Emotional unpredictability',
      'Fear-based compliance and appeasement',
      'Conditional approval and emotional control',
    ],
    lowDescription:
      'Lower scores suggest that important relationships are generally experienced as emotionally respectful, predictable, and accepting.',
    moderateDescription:
      'Moderate scores suggest that the youth may sometimes experience emotional pressure, criticism sensitivity, or uncertainty about relational reactions.',
    elevatedDescription:
      'Elevated scores suggest the youth may experience important relationships as emotionally unsafe, conditional, unpredictable, or pressure-driven.',
    clinicalMeaning:
      'High scores may reflect relational distress, self-silencing, fear-based adaptation, shame burden, or emotional control dynamics.',
    caution:
      'This domain measures perceived relational experience. It does not determine caregiver intent, legal fault, abuse occurrence, or the objective accuracy of any single allegation.',
  },

  ASRT: {
    name: 'Attachment Security & Relational Trust',
    definition:
      'This domain measures the youth’s sense of emotional safety, trust, support accessibility, abandonment concern, and comfort with closeness. It captures both anxious and avoidant attachment adaptations.',
    measuredCharacteristics: [
      'Emotional safety',
      'Caregiver accessibility and support',
      'Attachment insecurity and abandonment fear',
      'Emotional avoidance and relational withdrawal',
    ],
    lowDescription:
      'Lower risk patterns suggest stronger relational security and greater comfort seeking support from trusted others.',
    moderateDescription:
      'Moderate patterns suggest mixed attachment security, with some support access but also relational fear, avoidance, or uncertainty.',
    elevatedDescription:
      'Elevated insecurity patterns suggest difficulty trusting emotional support, fear of rejection, or protective distancing from closeness.',
    clinicalMeaning:
      'Attachment-related elevations may be associated with emotional guardedness, rejection sensitivity, difficulty seeking comfort, or instability in close relationships.',
    caution:
      'Attachment insecurity is not specific to abuse and may develop from temperament, separation stress, inconsistent support, conflict, grief, divorce, developmental history, or other relational disruptions.',
  },

  EBR: {
    name: 'Emotional & Behavioral Regulation',
    definition:
      'This domain measures how the youth regulates strong feelings, frustration, anger, suppression, impulsivity, shutdown, and the functional effects of emotional strain on school, peer, and daily activities.',
    measuredCharacteristics: [
      'Anger and reactive escalation',
      'Emotional suppression and shutdown',
      'Impulsivity and behavioral instability',
      'Social and functional regulation',
    ],
    lowDescription:
      'Lower scores suggest relatively stable emotional control and manageable behavioral regulation.',
    moderateDescription:
      'Moderate scores suggest occasional emotional or behavioral regulation difficulty, especially under stress.',
    elevatedDescription:
      'Elevated scores suggest clinically meaningful dysregulation, suppression, impulsivity, shutdown, or stress-related functional impairment.',
    clinicalMeaning:
      'High scores may indicate emotional overload, reduced impulse control, avoidance, shutdown, irritability, or difficulty recovering from emotional triggers.',
    caution:
      'Regulation difficulties may reflect many causes, including developmental stage, ADHD, autism spectrum traits, anxiety, trauma adaptation, mood symptoms, sleep disruption, or family stress.',
  },

  FSF: {
    name: 'Family System Functioning',
    definition:
      'This domain measures the youth’s perception of family emotional climate, conflict exposure, loyalty conflict, triangulation, emotional expression safety, and predictability within the home or caregiving system.',
    measuredCharacteristics: [
      'Chronic conflict exposure',
      'Loyalty conflict and triangulation',
      'Emotional expression safety',
      'Family stability and predictability',
    ],
    lowDescription:
      'Lower scores suggest that the family system is generally experienced as emotionally steady, communicative, and predictable.',
    moderateDescription:
      'Moderate scores suggest some family tension, role pressure, communication risk, or inconsistency.',
    elevatedDescription:
      'Elevated scores suggest significant family-system strain, conflict exposure, emotional unpredictability, or pressure to manage adult relational tension.',
    clinicalMeaning:
      'High scores may reflect emotional burden from conflict, divided loyalties, unsafe communication patterns, or instability in the home emotional environment.',
    caution:
      'Family-system elevations should not be used to assign blame. They represent the youth’s reported experience of family climate and should be evaluated with collateral context.',
  },

  DASB: {
    name: 'Depression / Anxiety / Shame Burden',
    definition:
      'This domain measures internal emotional burden, including sadness, discouragement, chronic worry, shame, self-blame, isolation, and rejection sensitivity.',
    measuredCharacteristics: [
      'Sadness and hopelessness',
      'Anxiety and worry burden',
      'Shame and self-blame',
      'Isolation and rejection sensitivity',
    ],
    lowDescription:
      'Lower scores suggest that internal distress is relatively limited or manageable.',
    moderateDescription:
      'Moderate scores suggest meaningful emotional distress that may affect confidence, mood, relational comfort, or concentration.',
    elevatedDescription:
      'Elevated scores suggest clinically significant internal distress, including shame burden, worry, sadness, self-blame, or isolation.',
    clinicalMeaning:
      'High scores may warrant additional screening for depression, anxiety, trauma-related distress, suicidal ideation when clinically indicated, and broader psychosocial stressors.',
    caution:
      'This domain is not a diagnostic scale and should not replace clinical interview, risk assessment, or diagnostic evaluation.',
  },

  RPF: {
    name: 'Resilience & Protective Functioning',
    definition:
      'This domain measures protective emotional resources, including support access, recovery capacity, emotional insight, self-expression, coping, and future orientation.',
    measuredCharacteristics: [
      'Emotional support access',
      'Emotional recovery capacity',
      'Self-expression and emotional insight',
      'Future orientation and adaptive coping',
    ],
    lowDescription:
      'Lower scores suggest limited protective buffering, reduced support access, or difficulty recovering after stress.',
    moderateDescription:
      'Moderate scores suggest some available strengths but inconsistent access to coping or support.',
    elevatedDescription:
      'Higher scores suggest stronger resilience capacity, emotional insight, support access, and recovery potential.',
    clinicalMeaning:
      'Protective functioning can buffer distress and may identify therapeutic assets, supportive relationships, and recovery strengths.',
    caution:
      'Resilience does not mean the absence of distress. A youth can show strong protective capacity while still carrying significant emotional burden.',
  },

  VRSA: {
    name: 'Validity & Response Style Analysis',
    definition:
      'This domain evaluates response reliability, including defensive minimization, exaggeration, inconsistency, attention-check performance, and improbable response patterns.',
    measuredCharacteristics: [
      'Defensive minimization',
      'Exaggeration and amplification',
      'Inconsistency',
      'Random or careless responding',
    ],
    lowDescription:
      'Lower validity concern suggests the profile is more likely to be interpretable.',
    moderateDescription:
      'Moderate validity concern suggests the profile should be interpreted cautiously, especially isolated elevations.',
    elevatedDescription:
      'Elevated validity concern suggests reduced interpretive confidence and the need for clinical review of response style.',
    clinicalMeaning:
      'Validity indicators help determine whether the profile is likely to reflect stable and interpretable response patterns.',
    caution:
      'Validity concerns do not automatically mean deception. Confusion, distress, reading difficulty, emotional intensity, fatigue, or developmental factors may affect response patterns.',
  },
};

const SUBSCALE_DEFINITIONS: Record<string, ConstructNarrativeDefinition> = {
  TRSA_HV: {
    name: 'Hypervigilance & Threat Monitoring',
    definition:
      'Measures alertness to changes in mood, tone, facial expression, environmental tension, or signs of possible conflict.',
    measuredCharacteristics: ['Scanning', 'anticipatory threat', 'mood monitoring'],
    lowDescription: 'Lower scores suggest less need to monitor the emotional environment.',
    moderateDescription: 'Moderate scores suggest situational alertness to relational tension.',
    elevatedDescription: 'Elevated scores suggest persistent monitoring that may interfere with calm and safety.',
    clinicalMeaning:
      'Elevations may reflect stress adaptation, anxiety, trauma-related hyperarousal, or relational unpredictability.',
    caution: 'Hypervigilance is nonspecific and should be interpreted contextually.',
  },

  TRSA_ER: {
    name: 'Emotional Flooding & Reactivity',
    definition:
      'Measures rapid emotional escalation, overwhelm, difficulty calming, and intense reactions under stress.',
    measuredCharacteristics: ['Emotional flooding', 'recovery delay', 'reactive intensity'],
    lowDescription: 'Lower scores suggest emotions are generally manageable.',
    moderateDescription: 'Moderate scores suggest stress-sensitive emotional escalation.',
    elevatedDescription: 'Elevated scores suggest strong emotional flooding and difficulty recovering.',
    clinicalMeaning:
      'Elevations may indicate stress overload, reduced regulation capacity, or unresolved emotional burden.',
    caution: 'Emotional flooding can arise from many clinical and developmental conditions.',
  },

  TRSA_PS: {
    name: 'Physiological Stress Sensitivity',
    definition:
      'Measures body-based stress responses such as tension, sleep disturbance, startle response, headaches, stomachaches, or arousal.',
    measuredCharacteristics: ['Somatic stress', 'sleep disruption', 'startle sensitivity'],
    lowDescription: 'Lower scores suggest fewer body-based stress responses.',
    moderateDescription: 'Moderate scores suggest stress may sometimes register physically.',
    elevatedDescription: 'Elevated scores suggest the body is carrying a significant stress load.',
    clinicalMeaning:
      'Elevations may reflect chronic arousal, anxiety, trauma adaptation, medical stress, or sleep disruption.',
    caution: 'Medical causes should be considered when somatic symptoms are elevated.',
  },

  TRSA_AV: {
    name: 'Avoidance & Emotional Numbing',
    definition:
      'Measures emotional distancing, avoidance of difficult conversations, numbing, and detachment-like coping.',
    measuredCharacteristics: ['Avoidance', 'numbing', 'detachment', 'emotional disconnection'],
    lowDescription: 'Lower scores suggest better emotional engagement.',
    moderateDescription: 'Moderate scores suggest occasional emotional withdrawal.',
    elevatedDescription: 'Elevated scores suggest avoidance or numbing may be a primary coping pattern.',
    clinicalMeaning:
      'Elevations may indicate protective disengagement from overwhelming emotional material.',
    caution: 'Avoidance can be protective in the short term but limiting over time.',
  },

  EICR_CC: {
    name: 'Chronic Criticism & Humiliation Exposure',
    definition:
      'Measures sensitivity to criticism, harsh correction, humiliation, embarrassment, and replaying critical comments.',
    measuredCharacteristics: ['Criticism sensitivity', 'humiliation', 'fear of mistakes'],
    lowDescription: 'Lower scores suggest correction is generally experienced as respectful.',
    moderateDescription: 'Moderate scores suggest some sensitivity to criticism.',
    elevatedDescription: 'Elevated scores suggest criticism or humiliation may be emotionally burdensome.',
    clinicalMeaning:
      'Elevations may contribute to shame, fear of mistakes, or self-silencing.',
    caution: 'Interpret with context; criticism sensitivity does not by itself establish mistreatment.',
  },

  EICR_EU: {
    name: 'Emotional Unpredictability',
    definition:
      'Measures uncertainty about emotional reactions from important people and the need to monitor mood shifts.',
    measuredCharacteristics: ['Unpredictability', 'walking on eggshells', 'mood guessing'],
    lowDescription: 'Lower scores suggest emotionally steady relational expectations.',
    moderateDescription: 'Moderate scores suggest occasional uncertainty about reactions.',
    elevatedDescription: 'Elevated scores suggest important relationships may feel unstable or hard to predict.',
    clinicalMeaning:
      'Elevations may increase vigilance, anxiety, appeasement, or emotional suppression.',
    caution: 'Perceived unpredictability should be corroborated with broader clinical context.',
  },

  EICR_FC: {
    name: 'Fear-Based Compliance',
    definition:
      'Measures appeasement, self-silencing, conflict avoidance, and behavioral adjustment to prevent negative reactions.',
    measuredCharacteristics: ['Appeasement', 'people-pleasing', 'self-silencing'],
    lowDescription: 'Lower scores suggest greater freedom to disagree or express needs.',
    moderateDescription: 'Moderate scores suggest some fear-based adaptation.',
    elevatedDescription: 'Elevated scores suggest the youth may suppress authenticity to preserve emotional safety.',
    clinicalMeaning:
      'Elevations may reflect relational fear, control dynamics, or chronic conflict avoidance.',
    caution: 'Compliance can arise from temperament, culture, family norms, anxiety, or relational fear.',
  },

  EICR_CP: {
    name: 'Conditional Approval & Emotional Control',
    definition:
      'Measures whether acceptance, warmth, or approval feels dependent on performance, compliance, or emotional conformity.',
    measuredCharacteristics: ['Conditional approval', 'approval dependency', 'emotional control'],
    lowDescription: 'Lower scores suggest acceptance is experienced as stable.',
    moderateDescription: 'Moderate scores suggest occasional concern about losing approval.',
    elevatedDescription: 'Elevated scores suggest warmth or acceptance may feel conditional.',
    clinicalMeaning:
      'Elevations may affect self-worth, identity development, and relational security.',
    caution: 'Conditional approval patterns require careful contextual interpretation.',
  },

  ASRT_ES: {
    name: 'Emotional Safety',
    definition:
      'Measures whether trusted relationships feel safe enough for emotional disclosure and vulnerability.',
    measuredCharacteristics: ['Emotional safety', 'trust', 'felt security'],
    lowDescription: 'Lower risk patterns suggest emotional openness feels relatively safe.',
    moderateDescription: 'Moderate patterns suggest mixed emotional safety.',
    elevatedDescription: 'Elevated insecurity suggests disclosure may feel risky or unsafe.',
    clinicalMeaning:
      'Emotional safety is central to attachment security and help-seeking.',
    caution: 'Safety perceptions can vary across relationships.',
  },

  ASRT_CA: {
    name: 'Caregiver Accessibility & Support',
    definition:
      'Measures perceived availability, responsiveness, and emotional support from caregivers or trusted adults.',
    measuredCharacteristics: ['Support access', 'responsiveness', 'comfort seeking'],
    lowDescription: 'Lower risk suggests support is accessible.',
    moderateDescription: 'Moderate patterns suggest support may be inconsistent.',
    elevatedDescription: 'Elevated difficulty suggests the youth may feel alone when distressed.',
    clinicalMeaning:
      'Support accessibility buffers stress and improves recovery capacity.',
    caution: 'Youth may underuse available support due to fear, shame, or past disappointment.',
  },

  ASRT_AI: {
    name: 'Attachment Insecurity & Abandonment Fear',
    definition:
      'Measures fear of rejection, relational loss, emotional abandonment, and need for reassurance.',
    measuredCharacteristics: ['Abandonment fear', 'rejection sensitivity', 'reassurance seeking'],
    lowDescription: 'Lower scores suggest relationship security.',
    moderateDescription: 'Moderate scores suggest some rejection sensitivity.',
    elevatedDescription: 'Elevated scores suggest strong insecurity or fear of relational loss.',
    clinicalMeaning:
      'Elevations may affect mood, closeness, conflict response, and reassurance needs.',
    caution: 'Abandonment fear can emerge from multiple sources.',
  },

  ASRT_EA: {
    name: 'Emotional Avoidance & Relational Withdrawal',
    definition:
      'Measures protective distance, discomfort with vulnerability, and pulling away from emotional closeness.',
    measuredCharacteristics: ['Avoidance', 'guardedness', 'withdrawal'],
    lowDescription: 'Lower scores suggest comfort with closeness.',
    moderateDescription: 'Moderate scores suggest situational guardedness.',
    elevatedDescription: 'Elevated scores suggest closeness may feel unsafe or uncomfortable.',
    clinicalMeaning:
      'Elevations may reflect avoidant attachment adaptation or emotional self-protection.',
    caution: 'Withdrawal may be protective, temperamental, or context-specific.',
  },

  EBR_AR: {
    name: 'Anger & Reactive Escalation',
    definition:
      'Measures irritability, reactive anger, frustration intolerance, snapping, and intense emotional reactions.',
    measuredCharacteristics: ['Anger', 'reactivity', 'frustration intolerance'],
    lowDescription: 'Lower scores suggest anger is generally manageable.',
    moderateDescription: 'Moderate scores suggest occasional reactivity.',
    elevatedDescription: 'Elevated scores suggest anger escalation may interfere with functioning.',
    clinicalMeaning:
      'Elevations may indicate stress overload or impaired frustration regulation.',
    caution: 'Anger may mask fear, shame, hurt, or stress.',
  },

  EBR_ES: {
    name: 'Emotional Suppression & Shutdown',
    definition:
      'Measures bottling emotions, going quiet, hiding distress, and withdrawing when hurt.',
    measuredCharacteristics: ['Suppression', 'shutdown', 'silent distress'],
    lowDescription: 'Lower scores suggest healthier emotional expression.',
    moderateDescription: 'Moderate scores suggest some emotional holding.',
    elevatedDescription: 'Elevated scores suggest shutdown may be a dominant coping pattern.',
    clinicalMeaning:
      'Elevations may indicate emotional safety concerns or internalizing distress.',
    caution: 'Suppression may appear externally calm while distress remains high internally.',
  },

  EBR_IB: {
    name: 'Impulsivity & Behavioral Instability',
    definition:
      'Measures acting before thinking, fast choices under pressure, regret, and emotion-driven behavior.',
    measuredCharacteristics: ['Impulsivity', 'behavioral instability', 'poor pause capacity'],
    lowDescription: 'Lower scores suggest stronger behavioral control.',
    moderateDescription: 'Moderate scores suggest situational impulsivity.',
    elevatedDescription: 'Elevated scores suggest emotion-driven behavior may create problems.',
    clinicalMeaning:
      'Elevations may reflect regulation difficulty, ADHD traits, stress overload, or emotional impulsivity.',
    caution: 'Behavioral impulsivity should be interpreted developmentally.',
  },

  EBR_SF: {
    name: 'Social & Functional Regulation',
    definition:
      'Measures how stress affects school, activities, friendships, responsibilities, and completion of tasks.',
    measuredCharacteristics: ['Functional impairment', 'peer strain', 'school stress'],
    lowDescription: 'Lower scores suggest functioning remains stable under stress.',
    moderateDescription: 'Moderate scores suggest stress sometimes disrupts functioning.',
    elevatedDescription: 'Elevated scores suggest emotional strain significantly affects daily life.',
    clinicalMeaning:
      'Elevations indicate the practical impact of distress on functioning.',
    caution: 'Functional disruption may reflect school, peer, family, developmental, or clinical factors.',
  },

  FSF_CC: {
    name: 'Chronic Conflict Exposure',
    definition:
      'Measures exposure to family tension, arguments, hidden conflict, and emotional effects of conflict.',
    measuredCharacteristics: ['Conflict exposure', 'tension', 'argument burden'],
    lowDescription: 'Lower scores suggest conflict is limited or managed respectfully.',
    moderateDescription: 'Moderate scores suggest meaningful family tension.',
    elevatedDescription: 'Elevated scores suggest chronic conflict may affect emotional functioning.',
    clinicalMeaning:
      'Family conflict exposure can increase hypervigilance, anxiety, and emotional burden.',
    caution: 'Conflict exposure does not identify who is responsible for the conflict.',
  },

  FSF_LT: {
    name: 'Loyalty Conflict & Triangulation',
    definition:
      'Measures pressure to take sides, feeling caught in the middle, guilt, or responsibility for keeping peace.',
    measuredCharacteristics: ['Loyalty conflict', 'triangulation', 'boundary pressure'],
    lowDescription: 'Lower scores suggest the youth is not heavily pulled into others’ conflict.',
    moderateDescription: 'Moderate scores suggest occasional divided loyalty pressure.',
    elevatedDescription: 'Elevated scores suggest the youth may feel emotionally responsible for adult conflict.',
    clinicalMeaning:
      'Elevations may reflect family-system boundary strain.',
    caution: 'Triangulation should be evaluated with careful family-system assessment.',
  },

  FSF_ES: {
    name: 'Emotional Expression Safety',
    definition:
      'Measures whether feelings, disagreement, and personal perspectives can be expressed safely in the family.',
    measuredCharacteristics: ['Expression safety', 'communication safety', 'self-silencing'],
    lowDescription: 'Lower risk suggests feelings can be expressed safely.',
    moderateDescription: 'Moderate patterns suggest some caution around expression.',
    elevatedDescription: 'Elevated scores suggest expression may feel risky or conflict-producing.',
    clinicalMeaning:
      'Low expression safety can increase suppression, anxiety, or withdrawal.',
    caution: 'Family communication patterns vary culturally and developmentally.',
  },

  FSF_FP: {
    name: 'Family Stability & Predictability',
    definition:
      'Measures perceived routine stability, emotional predictability, and household consistency.',
    measuredCharacteristics: ['Predictability', 'stability', 'chaos', 'mood adaptation'],
    lowDescription: 'Lower risk suggests home life feels emotionally predictable.',
    moderateDescription: 'Moderate patterns suggest some inconsistency.',
    elevatedDescription: 'Elevated scores suggest instability may require constant emotional adaptation.',
    clinicalMeaning:
      'Predictability supports emotional security and regulation.',
    caution: 'Instability may reflect temporary stressors or broader systemic patterns.',
  },

  DASB_SH: {
    name: 'Sadness & Hopelessness',
    definition:
      'Measures discouragement, sadness, helplessness, emotional fatigue, and reduced optimism.',
    measuredCharacteristics: ['Sadness', 'hopelessness', 'emotional fatigue'],
    lowDescription: 'Lower scores suggest mood burden is limited.',
    moderateDescription: 'Moderate scores suggest meaningful sadness or discouragement.',
    elevatedDescription: 'Elevated scores suggest significant depressive burden.',
    clinicalMeaning:
      'Elevations may warrant clinical follow-up for mood symptoms and risk factors.',
    caution: 'This is not a standalone depression diagnosis.',
  },

  DASB_AW: {
    name: 'Anxiety & Worry Burden',
    definition:
      'Measures chronic worry, anticipatory fear, nervousness, and difficulty letting go of concerns.',
    measuredCharacteristics: ['Worry', 'anxiety', 'anticipatory fear'],
    lowDescription: 'Lower scores suggest worry is generally manageable.',
    moderateDescription: 'Moderate scores suggest persistent worry in some contexts.',
    elevatedDescription: 'Elevated scores suggest worry may interfere with enjoyment or functioning.',
    clinicalMeaning:
      'Elevations may reflect anxiety, uncertainty sensitivity, or chronic stress.',
    caution: 'Anxiety symptoms require broader clinical assessment.',
  },

  DASB_SB: {
    name: 'Shame & Self-Blame',
    definition:
      'Measures guilt, shame, excessive responsibility-taking, self-criticism, and replaying mistakes.',
    measuredCharacteristics: ['Shame', 'self-blame', 'guilt', 'self-criticism'],
    lowDescription: 'Lower scores suggest healthier self-evaluation.',
    moderateDescription: 'Moderate scores suggest some self-critical burden.',
    elevatedDescription: 'Elevated scores suggest shame and self-blame may be clinically important.',
    clinicalMeaning:
      'Elevations may undermine self-worth and increase depressive or anxious distress.',
    caution: 'Self-blame may reflect temperament, family messages, trauma adaptation, or mood symptoms.',
  },

  DASB_IR: {
    name: 'Isolation & Rejection Sensitivity',
    definition:
      'Measures loneliness, feeling unwanted, pulling away, and sensitivity to exclusion or rejection.',
    measuredCharacteristics: ['Isolation', 'rejection sensitivity', 'withdrawal'],
    lowDescription: 'Lower scores suggest stronger belonging and less rejection sensitivity.',
    moderateDescription: 'Moderate scores suggest some social vulnerability.',
    elevatedDescription: 'Elevated scores suggest rejection sensitivity may strongly affect functioning.',
    clinicalMeaning:
      'Elevations may reflect relational insecurity, depression, peer stress, or attachment concerns.',
    caution: 'Social context and peer environment should be explored.',
  },

  RPF_ES: {
    name: 'Emotional Support Access',
    definition:
      'Measures access to safe, supportive, understanding relationships.',
    measuredCharacteristics: ['Support', 'connection', 'help access'],
    lowDescription: 'Lower scores suggest limited support access.',
    moderateDescription: 'Moderate scores suggest partial or inconsistent support.',
    elevatedDescription: 'Higher scores suggest strong support access.',
    clinicalMeaning: 'Support access is a major protective factor.',
    caution: 'Support quality matters as much as support availability.',
  },

  RPF_ER: {
    name: 'Emotional Recovery Capacity',
    definition:
      'Measures ability to recover, reset, and steady after stress or conflict.',
    measuredCharacteristics: ['Recovery', 'coping', 'emotional repair'],
    lowDescription: 'Lower scores suggest difficulty recovering after stress.',
    moderateDescription: 'Moderate scores suggest variable recovery capacity.',
    elevatedDescription: 'Higher scores suggest strong emotional rebound capacity.',
    clinicalMeaning: 'Recovery capacity supports resilience and treatment progress.',
    caution: 'Recovery may vary depending on stress intensity and environmental safety.',
  },

  RPF_SI: {
    name: 'Self-Expression & Emotional Insight',
    definition:
      'Measures ability to identify, understand, and communicate emotional experience.',
    measuredCharacteristics: ['Insight', 'emotional language', 'trigger awareness'],
    lowDescription: 'Lower scores suggest difficulty understanding or naming emotions.',
    moderateDescription: 'Moderate scores suggest developing insight.',
    elevatedDescription: 'Higher scores suggest strong emotional awareness.',
    clinicalMeaning: 'Insight supports therapy engagement and regulation.',
    caution: 'Younger adolescents may still be developing emotional language.',
  },

  RPF_FO: {
    name: 'Future Orientation & Adaptive Coping',
    definition:
      'Measures hope, goals, belief in improvement, and coping persistence.',
    measuredCharacteristics: ['Hope', 'goals', 'adaptive coping'],
    lowDescription: 'Lower scores suggest reduced hope or difficulty seeing improvement.',
    moderateDescription: 'Moderate scores suggest mixed future orientation.',
    elevatedDescription: 'Higher scores suggest meaningful hope and goal direction.',
    clinicalMeaning: 'Future orientation is protective against despair and disengagement.',
    caution: 'Future orientation may drop during acute stress.',
  },

  VRSA_DM: {
    name: 'Defensive Minimization',
    definition:
      'Measures improbable denial of common emotional struggles or relational difficulty.',
    measuredCharacteristics: ['Underreporting', 'defensiveness', 'social desirability'],
    lowDescription: 'Lower scores suggest little evidence of minimization.',
    moderateDescription: 'Moderate scores suggest possible guarded reporting.',
    elevatedDescription: 'Elevated scores suggest underreporting may reduce interpretive confidence.',
    clinicalMeaning: 'Minimization may obscure distress.',
    caution: 'Minimization can reflect fear, shame, loyalty, or misunderstanding rather than deception.',
  },

  VRSA_EX: {
    name: 'Exaggeration & Amplification',
    definition:
      'Measures improbable global distress claims and extreme overgeneralized negative responding.',
    measuredCharacteristics: ['Overreporting', 'amplification', 'extreme endorsement'],
    lowDescription: 'Lower scores suggest little evidence of amplification.',
    moderateDescription: 'Moderate scores suggest some broad distress emphasis.',
    elevatedDescription: 'Elevated scores suggest overendorsement may reduce interpretive precision.',
    clinicalMeaning: 'Amplification may reflect severe distress or response distortion.',
    caution: 'Amplification does not automatically imply intentional exaggeration.',
  },

  VRSA_IC: {
    name: 'Inconsistency & Contradiction',
    definition:
      'Measures agreement or disagreement across repeated or paired items.',
    measuredCharacteristics: ['Consistency', 'response coherence', 'paired-item agreement'],
    lowDescription: 'Lower scores suggest consistent responding.',
    moderateDescription: 'Moderate scores suggest some inconsistency.',
    elevatedDescription: 'Elevated scores suggest isolated interpretations should be cautious.',
    clinicalMeaning: 'High inconsistency lowers interpretive confidence.',
    caution: 'Inconsistency may reflect fatigue, confusion, distress, or attention problems.',
  },

  VRSA_RR: {
    name: 'Random / Careless Responding',
    definition:
      'Measures attention-check performance and response reliability.',
    measuredCharacteristics: ['Attention', 'carefulness', 'random responding'],
    lowDescription: 'Lower scores suggest attention checks were passed.',
    moderateDescription: 'Moderate scores suggest some concern.',
    elevatedDescription: 'Elevated scores suggest possible careless or inattentive responding.',
    clinicalMeaning: 'Attention-check failure reduces confidence in the profile.',
    caution: 'Attention failures may reflect comprehension or fatigue rather than intentional carelessness.',
  },
};

function severityDescriptor(severity?: RtafiSeverityLevel): string {
  switch (severity) {
    case 'Minimal':
      return 'minimal';
    case 'Mild':
      return 'mild';
    case 'Moderate':
      return 'moderate';
    case 'Elevated':
      return 'elevated';
    case 'Severe':
      return 'severe';
    default:
      return 'unavailable';
  }
}

function levelNarrative(
  score: number,
  definition: ConstructNarrativeDefinition,
  direction: ScaleDirection,
): string {
  if (direction === 'protective') {
    if (score >= 70) return definition.elevatedDescription;
    if (score >= 40) return definition.moderateDescription;
    return definition.lowDescription;
  }

  if (score >= 65) return definition.elevatedDescription;
  if (score >= 35) return definition.moderateDescription;
  return definition.lowDescription;
}

function buildBarScale(
  code: string,
  label: string,
  score: number,
  severityLevel?: RtafiSeverityLevel | RtafiValidityConcernLevel,
  direction: ScaleDirection = 'risk',
  lowAnchor = 'Lower',
  highAnchor = 'Higher',
  interpretiveText = '',
): RtafiBarScaleDescriptor {
  return {
    code,
    label,
    score,
    direction,
    lowAnchor,
    highAnchor,
    severityLevel,
    interpretiveText,
  };
}

function buildConstructDefinitions(): RtafiConstructDefinition[] {
  return Object.entries(DOMAIN_DEFINITIONS).map(([code, definition]) => ({
    code,
    name: definition.name,
    definition: definition.definition,
    measuredBy: definition.measuredCharacteristics.join(', '),
    clinicalMeaning: definition.clinicalMeaning,
    interpretiveCautions: [definition.caution],
  }));
}

function buildSubscaleNarratives(
  domainScore: RtafiDomainScore,
): RtafiSubscaleNarrative[] {
  return domainScore.subscaleScores.map((subscaleScore) => {
    const definition = SUBSCALE_DEFINITIONS[subscaleScore.subscale];
    const score = subscaleScore.standardizedScore ?? 0;
    const direction: ScaleDirection =
      subscaleScore.subscale.startsWith('RPF') ? 'protective' : 'risk';

    return {
      subscale: subscaleScore.subscale,
      name: definition.name,
      score,
      severityLevel: subscaleScore.severityLevel,
      constructDefinition: definition.definition,
      measuredCharacteristics: definition.measuredCharacteristics,
      narrative: `${definition.name} produced a ${severityDescriptor(
        subscaleScore.severityLevel,
      )} pattern. ${levelNarrative(score, definition, direction)}`,
      clinicalMeaning: definition.clinicalMeaning,
      caution: definition.caution,
      barScale: buildBarScale(
        subscaleScore.subscale,
        definition.name,
        score,
        subscaleScore.severityLevel,
        direction,
        direction === 'protective' ? 'Lower Protective Capacity' : 'Lower Expression',
        direction === 'protective' ? 'Higher Protective Capacity' : 'Higher Expression',
        levelNarrative(score, definition, direction),
      ),
    };
  });
}

function buildDomainNarratives(
  result: RtafiAssessmentResult,
): RtafiDomainNarrative[] {
  return result.domainScores.map((domainScore) => {
    const definition = DOMAIN_DEFINITIONS[domainScore.domain];
    const score = domainScore.standardizedScore ?? 0;
    const direction: ScaleDirection = domainScore.domain === 'RPF' ? 'protective' : 'risk';

    return {
      domain: domainScore.domain,
      name: definition.name,
      score,
      severityLevel: domainScore.severityLevel,
      constructDefinition: definition.definition,
      measuredCharacteristics: definition.measuredCharacteristics,
      narrative: `${definition.name} produced a ${severityDescriptor(
        domainScore.severityLevel,
      )} overall profile. ${levelNarrative(score, definition, direction)}`,
      clinicalMeaning: definition.clinicalMeaning,
      caution: definition.caution,
      subscaleNarratives: buildSubscaleNarratives(domainScore),
      barScale: buildBarScale(
        domainScore.domain,
        definition.name,
        score,
        domainScore.severityLevel,
        direction,
        direction === 'protective' ? 'Lower Protective Functioning' : 'Lower Distress',
        direction === 'protective' ? 'Higher Protective Functioning' : 'Higher Distress',
        levelNarrative(score, definition, direction),
      ),
    };
  });
}

function buildCompositeNarratives(
  result: RtafiAssessmentResult,
): RtafiCompositeNarrative[] {
  const composites = result.compositeIndices;

  return [
    {
      code: 'TBI',
      name: 'Trauma Burden Index',
      score: composites.traumaBurdenIndex,
      direction: 'risk',
      definition:
        'A global estimate of trauma-related stress activation, emotional flooding, physiological stress sensitivity, avoidance, and internal distress burden.',
      narrative:
        'This index summarizes the overall weight of trauma-related stress activation across multiple emotional and physiological systems.',
      clinicalMeaning:
        'Higher scores indicate greater stress activation burden and may support closer clinical review of trauma-related symptoms.',
      caution:
        'This index does not prove trauma exposure, abuse, neglect, or causation.',
      barScale: buildBarScale(
        'TBI',
        'Trauma Burden Index',
        composites.traumaBurdenIndex,
        undefined,
        'risk',
        'Lower Burden',
        'Higher Burden',
        'Higher scores indicate greater trauma-related stress burden.',
      ),
    },
    {
      code: 'ASI',
      name: 'Attachment Security Index',
      score: composites.attachmentSecurityIndex,
      direction: 'protective',
      definition:
        'A global measure of attachment security, emotional safety, support accessibility, and reduced relational insecurity.',
      narrative:
        'This index summarizes the youth’s overall experience of relational security and emotional trust.',
      clinicalMeaning:
        'Higher scores suggest stronger attachment security and perceived support.',
      caution:
        'Attachment security can vary significantly across relationships and settings.',
      barScale: buildBarScale(
        'ASI',
        'Attachment Security Index',
        composites.attachmentSecurityIndex,
        undefined,
        'protective',
        'Lower Security',
        'Higher Security',
        'Higher scores indicate stronger attachment security.',
      ),
    },
    {
      code: 'ERI',
      name: 'Emotional Regulation Index',
      score: composites.emotionalRegulationIndex,
      direction: 'protective',
      definition:
        'A global estimate of emotional stabilization, recovery capacity, impulse control, and adaptive regulation.',
      narrative:
        'This index summarizes the youth’s ability to manage emotional activation and recover after stress.',
      clinicalMeaning:
        'Higher scores suggest stronger regulation and recovery capacity.',
      caution:
        'Regulation capacity may fluctuate under acute stress or relational threat.',
      barScale: buildBarScale(
        'ERI',
        'Emotional Regulation Index',
        composites.emotionalRegulationIndex,
        undefined,
        'protective',
        'Lower Regulation',
        'Higher Regulation',
        'Higher scores indicate stronger emotional regulation capacity.',
      ),
    },
    {
      code: 'FSI',
      name: 'Family Stability Index',
      score: composites.familyStabilityIndex,
      direction: 'protective',
      definition:
        'A global measure of perceived family emotional predictability, expression safety, and stability.',
      narrative:
        'This index summarizes the degree to which the family environment is experienced as emotionally stable and predictable.',
      clinicalMeaning:
        'Higher scores suggest stronger perceived family stability.',
      caution:
        'Family stability findings should be interpreted with collateral context and not as fault assignment.',
      barScale: buildBarScale(
        'FSI',
        'Family Stability Index',
        composites.familyStabilityIndex,
        undefined,
        'protective',
        'Lower Stability',
        'Higher Stability',
        'Higher scores indicate stronger perceived family stability.',
      ),
    },
    {
      code: 'RSI',
      name: 'Relational Safety Index',
      score: composites.relationalSafetyIndex,
      direction: 'protective',
      definition:
        'A global measure of emotional safety, trust, support accessibility, and reduced fear-based relational adaptation.',
      narrative:
        'This index summarizes how safe and supportive important relationships feel to the youth.',
      clinicalMeaning:
        'Higher scores suggest stronger relational safety and lower fear-based relational adaptation.',
      caution:
        'Relational safety varies by relationship and should not be generalized without context.',
      barScale: buildBarScale(
        'RSI',
        'Relational Safety Index',
        composites.relationalSafetyIndex,
        undefined,
        'protective',
        'Lower Safety',
        'Higher Safety',
        'Higher scores indicate stronger perceived relational safety.',
      ),
    },
    {
      code: 'RCI',
      name: 'Resilience Capacity Index',
      score: composites.resilienceCapacityIndex,
      direction: 'protective',
      definition:
        'A global estimate of emotional support access, recovery capacity, insight, coping, and future orientation.',
      narrative:
        'This index summarizes the youth’s protective resources and adaptive recovery strengths.',
      clinicalMeaning:
        'Higher scores suggest stronger resilience and better therapeutic leverage points.',
      caution:
        'Resilience can coexist with high distress and should not be used to dismiss symptoms.',
      barScale: buildBarScale(
        'RCI',
        'Resilience Capacity Index',
        composites.resilienceCapacityIndex,
        undefined,
        'protective',
        'Lower Resilience',
        'Higher Resilience',
        'Higher scores indicate stronger resilience capacity.',
      ),
    },
  ];
}

function buildValidityNarrative(
  result: RtafiAssessmentResult,
): RtafiValidityNarrative {
  const validity = result.validityProfile;

  return {
    summary:
      'The validity profile evaluates the interpretive confidence of the assessment by examining defensive minimization, symptom amplification, inconsistent responding, and attention-check performance.',
    defensiveMinimizationNarrative: validity.minimizationFlag
      ? 'The profile contains elevated indicators of defensive minimization or emotional underreporting. The youth may be presenting distress as lower than it actually is, or may be reluctant to disclose vulnerability.'
      : 'The profile does not show strong evidence of defensive minimization.',
    exaggerationNarrative: validity.exaggerationFlag
      ? 'The profile contains elevated indicators of broad distress amplification or improbable global endorsement. This may reflect severe distress, emotional intensity, misunderstanding, or possible overreporting.'
      : 'The profile does not show strong evidence of broad symptom exaggeration.',
    inconsistencyNarrative: validity.inconsistencyFlag
      ? 'The profile contains elevated inconsistency across paired items. Isolated scale elevations should be interpreted cautiously.'
      : 'Paired-item consistency appears acceptable.',
    randomRespondingNarrative: validity.randomRespondingFlag
      ? 'Attention-check performance suggests possible careless responding, misunderstanding, or reduced engagement.'
      : 'Attention-check responding appears acceptable.',
    reliabilityInterpretation:
      validity.overallValidityConcernLevel === 'Significant'
        ? 'Overall interpretive confidence is significantly reduced. Clinical review is strongly recommended before drawing conclusions from the profile.'
        : validity.overallValidityConcernLevel === 'Moderate'
          ? 'Overall interpretive confidence is moderately reduced. Results should be used cautiously and corroborated with interview and collateral information.'
          : validity.overallValidityConcernLevel === 'Mild'
            ? 'Overall interpretive confidence is mildly reduced. Results remain usable but should be interpreted with caution.'
            : 'Overall response style appears sufficiently stable for cautious clinical interpretation.',
    interpretiveLimitations: [
      'Validity indicators do not prove deception.',
      'Fatigue, comprehension difficulty, distress, fear, shame, loyalty concerns, or developmental factors may affect response style.',
      'Assessment results should be integrated with interview, collateral information, behavioral observation, and developmental history.',
    ],
    barScales: [
      buildBarScale(
        'VRSA_DM',
        'Defensive Minimization',
        validity.defensiveMinimization,
        validity.overallValidityConcernLevel,
        'validity',
        'Lower Concern',
        'Higher Concern',
        'Higher scores suggest greater possible underreporting or defensive minimization.',
      ),
      buildBarScale(
        'VRSA_EX',
        'Exaggeration Amplification',
        validity.exaggerationAmplification,
        validity.overallValidityConcernLevel,
        'validity',
        'Lower Concern',
        'Higher Concern',
        'Higher scores suggest greater possible overendorsement or broad amplification.',
      ),
      buildBarScale(
        'VRSA_IC',
        'Inconsistency Index',
        validity.inconsistencyIndex,
        validity.overallValidityConcernLevel,
        'validity',
        'Lower Concern',
        'Higher Concern',
        'Higher scores suggest greater inconsistency across paired items.',
      ),
      buildBarScale(
        'VRSA_RR',
        'Random / Careless Responding',
        validity.randomRespondingIndex,
        validity.overallValidityConcernLevel,
        'validity',
        'Lower Concern',
        'Higher Concern',
        'Higher scores suggest attention-check or careless-response concerns.',
      ),
    ],
  };
}

function buildOverview(result: RtafiAssessmentResult): string {
  const trauma = result.compositeIndices.traumaBurdenIndex;
  const attachment = result.compositeIndices.attachmentSecurityIndex;
  const regulation = result.compositeIndices.emotionalRegulationIndex;
  const family = result.compositeIndices.familyStabilityIndex;
  const resilience = result.compositeIndices.resilienceCapacityIndex;

  return `The RTAFI comprehensive profile evaluates trauma-related stress activation, emotional invalidation patterns, attachment security, emotional and behavioral regulation, family-system functioning, internal distress burden, resilience resources, and response validity. In this administration, the Trauma Burden Index was ${trauma.toFixed(
    0,
  )}, the Attachment Security Index was ${attachment.toFixed(
    0,
  )}, the Emotional Regulation Index was ${regulation.toFixed(
    0,
  )}, the Family Stability Index was ${family.toFixed(
    0,
  )}, and the Resilience Capacity Index was ${resilience.toFixed(
    0,
  )}. These scores should be interpreted as dimensional indicators of emotional and relational functioning, not as proof of abuse, trauma causation, neglect, or legal wrongdoing.`;
}

export function generateNarrativeProfile(
  result: RtafiAssessmentResult,
): RtafiInterpretationProfile {
  const validityNarrative = buildValidityNarrative(result);

  return {
    overview: buildOverview(result),

    strengths: [
      'The report identifies both distress patterns and protective functioning, allowing a balanced clinical formulation.',
      'Resilience, support access, emotional recovery, insight, and future orientation are evaluated separately from symptom burden.',
      'The validity framework provides interpretive confidence markers rather than assuming every profile is equally reliable.',
    ],

    clinicalConsiderations: [
      'Elevated stress activation may warrant further clinical exploration of trauma-related symptoms, anxiety, sleep, somatic complaints, and environmental stress burden.',
      'Attachment and relational safety indicators should be evaluated with attention to developmental history and current caregiving context.',
      'Family-system findings should be interpreted as youth-perceived emotional climate, not as a determination of blame.',
      'Internal distress elevations may require additional assessment for depression, anxiety, shame burden, rejection sensitivity, and self-blame.',
    ],

    relationalIndicators: [
      'Relational safety patterns describe whether the youth experiences important relationships as predictable, emotionally safe, supportive, or fear-based.',
      'Fear-based compliance, emotional guardedness, and withdrawal may represent protective adaptations rather than intentional opposition.',
      'Attachment insecurity indicators should be interpreted across multiple relationships rather than generalized from one relationship alone.',
    ],

    emotionalFunctioningIndicators: [
      'The emotional functioning profile describes the balance between emotional flooding, suppression, impulsivity, recovery capacity, and daily functional disruption.',
      'Stress activation may appear externally as irritability, shutdown, avoidance, concentration problems, or peer conflict.',
      'Regulation difficulties should be interpreted developmentally and in the context of sleep, neurodevelopmental profile, family stress, and school functioning.',
    ],

    resilienceIndicators: [
      'Protective functioning can reduce the clinical impact of stress burden and may provide treatment leverage points.',
      'High resilience does not erase distress; low resilience does not imply hopelessness.',
      'Support access, future orientation, and emotional insight are especially important for treatment planning and longitudinal tracking.',
    ],

    validityConsiderations: validityNarrative.interpretiveLimitations,

    narrativeSections: [
      {
        title: 'Clinical Interpretation Framework',
        content:
          'RTAFI is designed as a multidomain research and clinical-support instrument for evaluating emotional, relational, attachment, family-system, stress-related, and resilience functioning in youth ages 10–18.',
      },
      {
        title: 'Non-Forensic Causation Caution',
        content:
          'RTAFI findings are not causation findings. The instrument should not be used by itself to determine whether abuse, neglect, coercion, alienation, or maltreatment occurred.',
      },
      {
        title: 'Longitudinal Use',
        content:
          'Repeated administrations may help identify whether stress activation, attachment security, family stability, emotional regulation, and resilience resources improve, decline, or remain stable over time.',
      },
    ],

    constructDefinitions: buildConstructDefinitions(),

    domainNarratives: buildDomainNarratives(result),

    compositeNarratives: buildCompositeNarratives(result),

    validityNarrative,

    clinicalCautions: [
      'This instrument is not a standalone diagnostic test.',
      'No single score or pattern confirms abuse, neglect, trauma exposure, parental fault, or legal wrongdoing.',
      'Symptoms measured by RTAFI are nonspecific and may arise from multiple developmental, relational, psychiatric, medical, educational, or environmental sources.',
      'Findings should be integrated with clinical interview, developmental history, collateral information, behavioral observation, and professional judgment.',
      'For forensic or custody-related use, the instrument should be treated as one source of psychological data, not a dispositive conclusion.',
    ],

    recommendedFollowUp: [
      'Clinical interview focused on stress exposure, emotional safety, attachment history, family conflict, and support resources.',
      'Risk screening when sadness, hopelessness, shame, or severe distress is elevated.',
      'Collateral review from caregivers, teachers, therapists, and relevant records when appropriate.',
      'Longitudinal tracking to monitor whether distress and relational safety improve or worsen over time.',
      'Treatment planning focused on regulation skills, emotional expression safety, support access, and resilience development.',
    ],

    reportDisclaimer:
      'This report reflects dimensional psychometric findings only. It should not be interpreted as proof of abuse, neglect, maltreatment, alienation, trauma causation, or legal wrongdoing. Results require professional interpretation within a broader clinical and developmental context.',
  };
}