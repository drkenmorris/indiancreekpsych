// src/features/psychometrics/rtafi/narratives/rtafiHouseholdComparisonNarratives.ts

import type {
  RtafiAssessmentResult,
} from '../types/rtafiTypes';

import type {
  RtafiComparativeProfile,
  RtafiCrossContextInterpretation,
} from '../context/rtafiHouseholdContextTypes';

export interface RtafiHouseholdDifferenceRow {
  construct: string;
  difference: number;
  severity: string;
}


function describeDifferenceLevel(
  value: number,
): string {
  if (value >= 30) {
    return 'very large';
  }

  if (value >= 20) {
    return 'large';
  }

  if (value >= 10) {
    return 'moderate';
  }

  if (value >= 5) {
    return 'mild';
  }

  return 'minimal';
}

function compareValues(
  householdALabel: string,
  householdBLabel: string,
  valueA: number,
  valueB: number,
  constructName: string,
): string {
  const difference =
    Math.abs(valueA - valueB);

  const level =
    describeDifferenceLevel(
      difference,
    );

  if (difference < 5) {
    return `The youth reported relatively similar ${constructName.toLowerCase()} patterns across ${householdALabel} and ${householdBLabel}.`;
  }

  if (valueA > valueB) {
    return `${householdALabel} demonstrated ${level} elevations in ${constructName.toLowerCase()} relative to ${householdBLabel}.`;
  }

  return `${householdBLabel} demonstrated ${level} elevations in ${constructName.toLowerCase()} relative to ${householdALabel}.`;
}

export function generateHouseholdComparisonNarrative(args: {
  householdAResult: RtafiAssessmentResult;
  householdBResult: RtafiAssessmentResult;
  comparativeProfile: RtafiComparativeProfile;
  interpretation: RtafiCrossContextInterpretation;
  householdALabel?: string;
  householdBLabel?: string;
}): string {
  const {
    householdAResult,
    householdBResult,
    interpretation,
    householdALabel = 'Household A',
    householdBLabel = 'Household B',
  } = args;

  const traumaNarrative =
    compareValues(
      householdALabel,
      householdBLabel,
      householdAResult
        .compositeIndices
        .traumaBurdenIndex,
      householdBResult
        .compositeIndices
        .traumaBurdenIndex,
      'trauma-related stress activation',
    );

  const relationalNarrative =
    compareValues(
      householdALabel,
      householdBLabel,
      householdAResult
        .compositeIndices
        .relationalSafetyIndex,
      householdBResult
        .compositeIndices
        .relationalSafetyIndex,
      'relational safety',
    );

  const emotionalInvalidationNarrative =
    compareValues(
      householdALabel,
      householdBLabel,
      householdAResult.domainScores.find(
        (domain) =>
          domain.domain === 'EICR',
      )?.standardizedScore ?? 0,
      householdBResult.domainScores.find(
        (domain) =>
          domain.domain === 'EICR',
      )?.standardizedScore ?? 0,
      'emotional invalidation exposure',
    );

  const familyStabilityNarrative =
    compareValues(
      householdALabel,
      householdBLabel,
      householdAResult
        .compositeIndices
        .familyStabilityIndex,
      householdBResult
        .compositeIndices
        .familyStabilityIndex,
      'family-system instability',
    );

  return `
Cross-context comparison analysis indicated meaningful environmental variation in the youth's emotional and relational functioning profile.

${traumaNarrative}

${relationalNarrative}

${emotionalInvalidationNarrative}

${familyStabilityNarrative}

The strongest perceived relational safety context was identified as ${
    interpretation.strongestSafetyContext
  }, while the highest emotional stress activation context was identified as ${
    interpretation.highestStressContext
  }.

The profile suggests that emotional functioning may be substantially context-dependent, meaning the youth's stress activation, emotional security, attachment functioning, and relational comfort appear to vary according to caregiving or environmental setting.

Importantly, these findings do NOT independently establish abuse, neglect, parental wrongdoing, coercion, or legal fault. Instead, they indicate that the youth perceives measurable differences in emotional climate, relational safety, stress burden, and support availability across settings.

Contextualized comparative findings should always be interpreted alongside:
• clinical interview
• developmental history
• collateral information
• behavioral observations
• educational functioning
• caregiver reports
• longitudinal tracking
• and broader psychosocial context.

Comparative household findings are best understood as dimensional indicators of relational experience rather than deterministic conclusions.
`.trim();
}

export function generateComparativeClinicalSummary(args: {
  comparativeProfile: RtafiComparativeProfile;
  interpretation: RtafiCrossContextInterpretation;
}): string[] {
  const {
    comparativeProfile,
    interpretation,
  } = args;

  const observations: string[] =
    [];

  if (
    comparativeProfile
      .traumaActivationDifference >=
    15
  ) {
    observations.push(
      'Trauma-related stress activation differed substantially across environments, suggesting context-sensitive emotional burden.',
    );
  }

  if (
    comparativeProfile
      .relationalSafetyDifference >=
    15
  ) {
    observations.push(
      'Relational safety perceptions differed significantly between settings.',
    );
  }

  if (
    comparativeProfile
      .attachmentSecurityDifference >=
    15
  ) {
    observations.push(
      'Attachment-security patterns varied meaningfully across contexts.',
    );
  }

  if (
    comparativeProfile
      .familyStabilityDifference >=
    15
  ) {
    observations.push(
      'Family-system predictability and emotional climate appeared substantially different across settings.',
    );
  }

  if (
    comparativeProfile
      .resilienceDifference >=
    15
  ) {
    observations.push(
      'Protective functioning and emotional recovery resources varied notably across contexts.',
    );
  }

  observations.push(
    interpretation.contextSensitivityPattern,
  );

  observations.push(
    'No single contextual elevation should be interpreted as independent proof of abuse or caregiver wrongdoing.',
  );

  return observations;
}




export function generateHouseholdDifferenceTable(args: {
  comparativeProfile: RtafiComparativeProfile;
}): RtafiHouseholdDifferenceRow[] {






  const {
    comparativeProfile,
  } = args;

  return [
    {
      construct:
        'Trauma Activation',
      difference:
        comparativeProfile.traumaActivationDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.traumaActivationDifference,
        ),
    },

    {
      construct:
        'Attachment Security',
      difference:
        comparativeProfile.attachmentSecurityDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.attachmentSecurityDifference,
        ),
    },

    {
      construct:
        'Relational Safety',
      difference:
        comparativeProfile.relationalSafetyDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.relationalSafetyDifference,
        ),
    },

    {
      construct:
        'Emotional Invalidation',
      difference:
        comparativeProfile.emotionalInvalidationDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.emotionalInvalidationDifference,
        ),
    },

    {
      construct:
        'Family Stability',
      difference:
        comparativeProfile.familyStabilityDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.familyStabilityDifference,
        ),
    },

    {
      construct:
        'Emotional Regulation',
      difference:
        comparativeProfile.emotionalRegulationDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.emotionalRegulationDifference,
        ),
    },

    {
      construct:
        'Resilience Capacity',
      difference:
        comparativeProfile.resilienceDifference,
      severity:
        describeDifferenceLevel(
          comparativeProfile.resilienceDifference,
        ),
    },
  ];
}