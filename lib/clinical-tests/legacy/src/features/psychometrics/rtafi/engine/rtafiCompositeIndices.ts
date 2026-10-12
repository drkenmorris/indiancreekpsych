// src/features/psychometrics/rtafi/engine/rtafiCompositeIndices.ts

import type {
  RtafiCompositeIndices,
  RtafiSubscaleScore,
} from '../types/rtafiTypes';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  );

  return total / values.length;
}

function normalizeTo100(value: number): number {
  return round((value / 4) * 100);
}

function getSubscaleMean(
  subscaleScores: RtafiSubscaleScore[],
  subscaleCode: string,
): number {
  const subscale = subscaleScores.find(
    (score) => score.subscale === subscaleCode,
  );

  return subscale?.meanScore ?? 0;
}

export function calculateTraumaBurdenIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const values = [
    getSubscaleMean(
      subscaleScores,
      'TRSA_HV',
    ),

    getSubscaleMean(
      subscaleScores,
      'TRSA_ER',
    ),

    getSubscaleMean(
      subscaleScores,
      'TRSA_PS',
    ),

    getSubscaleMean(
      subscaleScores,
      'TRSA_AV',
    ),

    getSubscaleMean(
      subscaleScores,
      'DASB_SH',
    ),

    getSubscaleMean(
      subscaleScores,
      'DASB_AW',
    ),

    getSubscaleMean(
      subscaleScores,
      'DASB_SB',
    ),
  ];

  return normalizeTo100(average(values));
}

export function calculateAttachmentSecurityIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const safetyValues = [
    getSubscaleMean(
      subscaleScores,
      'ASRT_ES',
    ),

    getSubscaleMean(
      subscaleScores,
      'ASRT_CA',
    ),
  ];

  const insecurityValues = [
    getSubscaleMean(
      subscaleScores,
      'ASRT_AI',
    ),

    getSubscaleMean(
      subscaleScores,
      'ASRT_EA',
    ),
  ];

  const securityAverage =
    average(safetyValues);

  const insecurityAverage =
    average(insecurityValues);

  const adjusted =
    securityAverage - insecurityAverage + 2;

  return normalizeTo100(
    Math.max(0, Math.min(4, adjusted)),
  );
}

export function calculateEmotionalRegulationIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const dysregulationValues = [
    getSubscaleMean(
      subscaleScores,
      'TRSA_ER',
    ),

    getSubscaleMean(
      subscaleScores,
      'EBR_AR',
    ),

    getSubscaleMean(
      subscaleScores,
      'EBR_IB',
    ),
  ];

  const adaptiveValues = [
    getSubscaleMean(
      subscaleScores,
      'EBR_ES',
    ),

    getSubscaleMean(
      subscaleScores,
      'RPF_ER',
    ),
  ];

  const dysregulationAverage =
    average(dysregulationValues);

  const adaptiveAverage =
    average(adaptiveValues);

  const adjusted =
    adaptiveAverage - dysregulationAverage + 2;

  return normalizeTo100(
    Math.max(0, Math.min(4, adjusted)),
  );
}

export function calculateFamilyStabilityIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const instabilityValues = [
    getSubscaleMean(
      subscaleScores,
      'FSF_CC',
    ),

    getSubscaleMean(
      subscaleScores,
      'FSF_LT',
    ),
  ];

  const stabilityValues = [
    getSubscaleMean(
      subscaleScores,
      'FSF_ES',
    ),

    getSubscaleMean(
      subscaleScores,
      'FSF_FP',
    ),
  ];

  const instabilityAverage =
    average(instabilityValues);

  const stabilityAverage =
    average(stabilityValues);

  const adjusted =
    stabilityAverage - instabilityAverage + 2;

  return normalizeTo100(
    Math.max(0, Math.min(4, adjusted)),
  );
}

export function calculateRelationalSafetyIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const safeValues = [
    getSubscaleMean(
      subscaleScores,
      'ASRT_ES',
    ),

    getSubscaleMean(
      subscaleScores,
      'ASRT_CA',
    ),

    getSubscaleMean(
      subscaleScores,
      'RPF_ES',
    ),
  ];

  const unsafeValues = [
    getSubscaleMean(
      subscaleScores,
      'EICR_EU',
    ),

    getSubscaleMean(
      subscaleScores,
      'EICR_FC',
    ),

    getSubscaleMean(
      subscaleScores,
      'ASRT_AI',
    ),
  ];

  const safeAverage =
    average(safeValues);

  const unsafeAverage =
    average(unsafeValues);

  const adjusted =
    safeAverage - unsafeAverage + 2;

  return normalizeTo100(
    Math.max(0, Math.min(4, adjusted)),
  );
}

export function calculateResilienceCapacityIndex(
  subscaleScores: RtafiSubscaleScore[],
): number {
  const resilienceValues = [
    getSubscaleMean(
      subscaleScores,
      'RPF_ES',
    ),

    getSubscaleMean(
      subscaleScores,
      'RPF_ER',
    ),

    getSubscaleMean(
      subscaleScores,
      'RPF_SI',
    ),

    getSubscaleMean(
      subscaleScores,
      'RPF_FO',
    ),
  ];

  return normalizeTo100(
    average(resilienceValues),
  );
}

export function calculateAllCompositeIndices(
  subscaleScores: RtafiSubscaleScore[],
): RtafiCompositeIndices {
  return {
    traumaBurdenIndex:
      calculateTraumaBurdenIndex(
        subscaleScores,
      ),

    attachmentSecurityIndex:
      calculateAttachmentSecurityIndex(
        subscaleScores,
      ),

    emotionalRegulationIndex:
      calculateEmotionalRegulationIndex(
        subscaleScores,
      ),

    familyStabilityIndex:
      calculateFamilyStabilityIndex(
        subscaleScores,
      ),

    relationalSafetyIndex:
      calculateRelationalSafetyIndex(
        subscaleScores,
      ),

    resilienceCapacityIndex:
      calculateResilienceCapacityIndex(
        subscaleScores,
      ),
  };
}