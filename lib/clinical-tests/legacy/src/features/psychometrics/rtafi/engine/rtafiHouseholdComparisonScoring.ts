// src/features/psychometrics/rtafi/engine/rtafiHouseholdComparisonScoring.ts

import type {
  RtafiAssessmentResult,
} from '../types/rtafiTypes';

import type {
  RtafiComparativeProfile,
  RtafiCrossContextInterpretation,
} from '../context/rtafiHouseholdContextTypes';

function roundToTwoDecimals(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function absoluteDifference(
  valueA: number,
  valueB: number,
): number {
  return roundToTwoDecimals(
    Math.abs(valueA - valueB),
  );
}

function determineDirectionalNarrative(
  householdALabel: string,
  householdBLabel: string,
  valueA: number,
  valueB: number,
  constructName: string,
): string {
  const difference =
    Math.abs(valueA - valueB);

  if (difference < 8) {
    return `The youth reported relatively similar ${constructName.toLowerCase()} patterns across both household contexts.`;
  }

  if (valueA > valueB) {
    return `${householdALabel} showed notably higher ${constructName.toLowerCase()} compared to ${householdBLabel}.`;
  }

  return `${householdBLabel} showed notably higher ${constructName.toLowerCase()} compared to ${householdALabel}.`;
}

export function generateHouseholdComparisonProfile(args: {
  householdAResult: RtafiAssessmentResult;
  householdBResult: RtafiAssessmentResult;
  householdALabel?: string;
  householdBLabel?: string;
}): RtafiComparativeProfile {
  const {
    householdAResult,
    householdBResult,
    householdALabel = 'Household A',
    householdBLabel = 'Household B',
  } = args;

  const traumaActivationDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .traumaBurdenIndex,
      householdBResult
        .compositeIndices
        .traumaBurdenIndex,
    );

  const attachmentSecurityDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .attachmentSecurityIndex,
      householdBResult
        .compositeIndices
        .attachmentSecurityIndex,
    );

  const emotionalRegulationDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .emotionalRegulationIndex,
      householdBResult
        .compositeIndices
        .emotionalRegulationIndex,
    );

  const familyStabilityDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .familyStabilityIndex,
      householdBResult
        .compositeIndices
        .familyStabilityIndex,
    );

  const relationalSafetyDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .relationalSafetyIndex,
      householdBResult
        .compositeIndices
        .relationalSafetyIndex,
    );

  const resilienceDifference =
    absoluteDifference(
      householdAResult
        .compositeIndices
        .resilienceCapacityIndex,
      householdBResult
        .compositeIndices
        .resilienceCapacityIndex,
    );

  const emotionalInvalidationDifference =
    absoluteDifference(
      householdAResult.domainScores.find(
        (domain) =>
          domain.domain === 'EICR',
      )?.standardizedScore ?? 0,
      householdBResult.domainScores.find(
        (domain) =>
          domain.domain === 'EICR',
      )?.standardizedScore ?? 0,
    );

  const summaryNarrative = [
    determineDirectionalNarrative(
      householdALabel,
      householdBLabel,
      householdAResult
        .compositeIndices
        .traumaBurdenIndex,
      householdBResult
        .compositeIndices
        .traumaBurdenIndex,
      'trauma-related stress activation',
    ),

    determineDirectionalNarrative(
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
    ),

    determineDirectionalNarrative(
      householdALabel,
      householdBLabel,
      householdAResult
        .compositeIndices
        .relationalSafetyIndex,
      householdBResult
        .compositeIndices
        .relationalSafetyIndex,
      'relational safety',
    ),
  ].join(' ');

  return {
    comparisonId:
      crypto.randomUUID(),

    primaryContextId:
      'household_a',

    secondaryContextId:
      'household_b',

    relationalSafetyDifference,

    emotionalInvalidationDifference,

    attachmentSecurityDifference,

    traumaActivationDifference,

    emotionalRegulationDifference,

    familyStabilityDifference,

    resilienceDifference,

    summaryNarrative,
  };
}

export function generateCrossContextInterpretation(args: {
  householdAResult: RtafiAssessmentResult;
  householdBResult: RtafiAssessmentResult;
  householdALabel?: string;
  householdBLabel?: string;
}): RtafiCrossContextInterpretation {
  const {
    householdAResult,
    householdBResult,
    householdALabel = 'Household A',
    householdBLabel = 'Household B',
  } = args;

  const householdASafety =
    householdAResult
      .compositeIndices
      .relationalSafetyIndex;

  const householdBSafety =
    householdBResult
      .compositeIndices
      .relationalSafetyIndex;

  const householdATrauma =
    householdAResult
      .compositeIndices
      .traumaBurdenIndex;

  const householdBTrauma =
    householdBResult
      .compositeIndices
      .traumaBurdenIndex;

  const strongestSafetyContext =
    householdASafety >
    householdBSafety
      ? householdALabel
      : householdBLabel;

  const highestStressContext =
    householdATrauma >
    householdBTrauma
      ? householdALabel
      : householdBLabel;

  const greatestRelationalInstabilityContext =
    (
      householdAResult.domainScores.find(
        (domain) =>
          domain.domain === 'FSF',
      )?.standardizedScore ?? 0
    ) >
    (
      householdBResult.domainScores.find(
        (domain) =>
          domain.domain === 'FSF',
      )?.standardizedScore ?? 0
    )
      ? householdALabel
      : householdBLabel;

  const greatestSupportContext =
    (
      householdAResult
        .compositeIndices
        .resilienceCapacityIndex
    ) >
    (
      householdBResult
        .compositeIndices
        .resilienceCapacityIndex
    )
      ? householdALabel
      : householdBLabel;

  const contextSensitivityPattern =
    absoluteDifference(
      householdATrauma,
      householdBTrauma,
    ) >= 15
      ? 'The profile suggests meaningful contextual sensitivity, with emotional and stress-related functioning varying significantly between environments.'
      : 'The profile suggests relatively stable emotional functioning across contexts with less evidence of major environmental differentiation.';

  return {
    strongestSafetyContext,

    highestStressContext,

    greatestRelationalInstabilityContext,

    greatestSupportContext,

    contextSensitivityPattern,

    interpretiveSummary:
      'Cross-context comparison findings suggest that emotional functioning, relational safety, and stress activation may vary significantly depending on household or caregiving environment. These findings should be integrated with collateral information, clinical interview, and broader developmental context.',

    clinicalConsiderations: [
      'Contextual differences may help identify environments associated with increased stress activation or stronger protective functioning.',
      'Cross-household differences should not automatically be interpreted as proof of abuse, neglect, or caregiver wrongdoing.',
      'Youth perception, developmental stage, loyalty conflicts, family-system tension, and situational stressors may influence contextual reporting.',
      'Comparative assessment patterns are best interpreted longitudinally and alongside collateral clinical data.',
    ],
  };
}