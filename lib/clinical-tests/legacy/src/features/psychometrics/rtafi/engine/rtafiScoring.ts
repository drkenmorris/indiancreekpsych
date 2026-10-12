// src/features/psychometrics/rtafi/engine/rtafiScoring.ts

import { RTAFI_ITEMS } from '../data/rtafiItems';
import { generateNarrativeProfile } from '../narratives/rtafiNarratives';
import { calculateValidityProfile } from '../validity/rtafiValidityEngine';

import type {
  RtafiAssessmentResult,
  RtafiCompositeIndices,
  RtafiDomainCode,
  RtafiDomainScore,
  RtafiResponse,
  RtafiSeverityLevel,
  RtafiSubscaleCode,
  RtafiSubscaleScore,
} from '../types/rtafiTypes';

const MAX_RESPONSE_VALUE = 4;

const RTAFI_DOMAINS: RtafiDomainCode[] = [
  'TRSA',
  'EICR',
  'ASRT',
  'EBR',
  'FSF',
  'DASB',
  'RPF',
  'VRSA',
];

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function scoreItem(value: number, reverseScored: boolean): number {
  return reverseScored ? MAX_RESPONSE_VALUE - value : value;
}

function determineSeverityLevel(meanScore: number): RtafiSeverityLevel {
  if (meanScore >= 3.25) return 'Severe';
  if (meanScore >= 2.5) return 'Elevated';
  if (meanScore >= 1.5) return 'Moderate';
  if (meanScore >= 0.75) return 'Mild';
  return 'Minimal';
}

function getUniqueSubscales(): RtafiSubscaleCode[] {
  return Array.from(new Set(RTAFI_ITEMS.map((item) => item.subscale)));
}

function getResponseValue(
  responses: RtafiResponse[],
  itemId: string,
): number | null {
  const response = responses.find((entry) => entry.itemId === itemId);
  return response ? response.value : null;
}

export function calculateSubscaleScores(
  responses: RtafiResponse[],
): RtafiSubscaleScore[] {
  return getUniqueSubscales().map((subscale) => {
    const subscaleItems = RTAFI_ITEMS.filter(
      (item) => item.subscale === subscale,
    );

    const scoredValues = subscaleItems
      .map((item) => {
        const value = getResponseValue(responses, item.id);

        if (value === null) {
          return null;
        }

        return scoreItem(value, item.reverseScored);
      })
      .filter((value): value is number => value !== null);

    const rawScore = scoredValues.reduce((sum, value) => sum + value, 0);
    const meanScore =
      scoredValues.length > 0 ? rawScore / scoredValues.length : 0;

    return {
      subscale,
      rawScore,
      itemCount: scoredValues.length,
      meanScore: roundToTwoDecimals(meanScore),
      standardizedScore: roundToTwoDecimals((meanScore / 4) * 100),
      severityLevel: determineSeverityLevel(meanScore),
    };
  });
}

export function calculateDomainScores(
  subscaleScores: RtafiSubscaleScore[],
): RtafiDomainScore[] {
  return RTAFI_DOMAINS.map((domain) => {
    const domainItems = RTAFI_ITEMS.filter((item) => item.domain === domain);

    const domainSubscales = Array.from(
      new Set(domainItems.map((item) => item.subscale)),
    );

    const matchingSubscaleScores = subscaleScores.filter((score) =>
      domainSubscales.includes(score.subscale),
    );

    const rawScore = matchingSubscaleScores.reduce(
      (sum, subscale) => sum + subscale.rawScore,
      0,
    );

    const itemCount = matchingSubscaleScores.reduce(
      (sum, subscale) => sum + subscale.itemCount,
      0,
    );

    const meanScore = itemCount > 0 ? rawScore / itemCount : 0;

    return {
      domain,
      rawScore,
      itemCount,
      meanScore: roundToTwoDecimals(meanScore),
      standardizedScore: roundToTwoDecimals((meanScore / 4) * 100),
      severityLevel: determineSeverityLevel(meanScore),
      subscaleScores: matchingSubscaleScores,
    };
  });
}

function getSubscaleMean(
  subscaleScores: RtafiSubscaleScore[],
  subscale: RtafiSubscaleCode,
): number {
  return subscaleScores.find((score) => score.subscale === subscale)?.meanScore ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampFourPoint(value: number): number {
  if (value < 0) return 0;
  if (value > 4) return 4;
  return value;
}

function toPercent(meanScore: number): number {
  return roundToTwoDecimals((meanScore / 4) * 100);
}

export function calculateCompositeIndices(
  subscaleScores: RtafiSubscaleScore[],
): RtafiCompositeIndices {
  const traumaBurdenMean = average([
    getSubscaleMean(subscaleScores, 'TRSA_HV'),
    getSubscaleMean(subscaleScores, 'TRSA_ER'),
    getSubscaleMean(subscaleScores, 'TRSA_PS'),
    getSubscaleMean(subscaleScores, 'TRSA_AV'),
    getSubscaleMean(subscaleScores, 'DASB_SH'),
    getSubscaleMean(subscaleScores, 'DASB_AW'),
    getSubscaleMean(subscaleScores, 'DASB_SB'),
  ]);

  const attachmentSafetyMean = average([
    getSubscaleMean(subscaleScores, 'ASRT_ES'),
    getSubscaleMean(subscaleScores, 'ASRT_CA'),
  ]);

  const attachmentInsecurityMean = average([
    getSubscaleMean(subscaleScores, 'ASRT_AI'),
    getSubscaleMean(subscaleScores, 'ASRT_EA'),
  ]);

  const attachmentSecurityAdjusted = clampFourPoint(
    attachmentSafetyMean - attachmentInsecurityMean + 2,
  );

  const dysregulationMean = average([
    getSubscaleMean(subscaleScores, 'TRSA_ER'),
    getSubscaleMean(subscaleScores, 'EBR_AR'),
    getSubscaleMean(subscaleScores, 'EBR_IB'),
    getSubscaleMean(subscaleScores, 'EBR_ES'),
  ]);

  const regulationProtectiveMean = average([
    getSubscaleMean(subscaleScores, 'RPF_ER'),
    getSubscaleMean(subscaleScores, 'RPF_SI'),
  ]);

  const emotionalRegulationAdjusted = clampFourPoint(
    regulationProtectiveMean - dysregulationMean + 2,
  );

  const familyInstabilityMean = average([
    getSubscaleMean(subscaleScores, 'FSF_CC'),
    getSubscaleMean(subscaleScores, 'FSF_LT'),
    getSubscaleMean(subscaleScores, 'FSF_ES'),
    getSubscaleMean(subscaleScores, 'FSF_FP'),
  ]);

  const familyStabilityAdjusted = clampFourPoint(4 - familyInstabilityMean);

  const relationalSafetyPositiveMean = average([
    getSubscaleMean(subscaleScores, 'ASRT_ES'),
    getSubscaleMean(subscaleScores, 'ASRT_CA'),
    getSubscaleMean(subscaleScores, 'RPF_ES'),
  ]);

  const relationalRiskMean = average([
    getSubscaleMean(subscaleScores, 'EICR_EU'),
    getSubscaleMean(subscaleScores, 'EICR_FC'),
    getSubscaleMean(subscaleScores, 'EICR_CP'),
    getSubscaleMean(subscaleScores, 'ASRT_AI'),
  ]);

  const relationalSafetyAdjusted = clampFourPoint(
    relationalSafetyPositiveMean - relationalRiskMean + 2,
  );

  const resilienceMean = average([
    getSubscaleMean(subscaleScores, 'RPF_ES'),
    getSubscaleMean(subscaleScores, 'RPF_ER'),
    getSubscaleMean(subscaleScores, 'RPF_SI'),
    getSubscaleMean(subscaleScores, 'RPF_FO'),
  ]);

  return {
    traumaBurdenIndex: toPercent(traumaBurdenMean),
    attachmentSecurityIndex: toPercent(attachmentSecurityAdjusted),
    emotionalRegulationIndex: toPercent(emotionalRegulationAdjusted),
    familyStabilityIndex: toPercent(familyStabilityAdjusted),
    relationalSafetyIndex: toPercent(relationalSafetyAdjusted),
    resilienceCapacityIndex: toPercent(resilienceMean),
  };
}

export function scoreRtafiAssessment(
  responses: RtafiResponse[],
): RtafiAssessmentResult {
  const subscaleScores = calculateSubscaleScores(responses);
  const domainScores = calculateDomainScores(subscaleScores);
  const compositeIndices = calculateCompositeIndices(subscaleScores);
  const validityProfile = calculateValidityProfile(responses);

  const resultWithoutNarrative = {
    completedAt: new Date().toISOString(),
    totalItemsAnswered: responses.length,
    domainScores,
    compositeIndices,
    validityProfile,
  };

  const result = {
    ...resultWithoutNarrative,
    interpretationProfile: generateNarrativeProfile({
      ...resultWithoutNarrative,
      interpretationProfile: null as never,
    }),
  };

  return result;
}

export function generateEmptyAssessmentResult(): RtafiAssessmentResult {
  return scoreRtafiAssessment([]);
}