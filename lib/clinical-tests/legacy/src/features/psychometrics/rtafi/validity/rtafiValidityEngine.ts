// src/features/psychometrics/rtafi/validity/rtafiValidityEngine.ts

import { RTAFI_ITEMS } from '../data/rtafiItems';

import type {
  RtafiResponse,
  RtafiValidityConcernLevel,
  RtafiValidityProfile,
} from '../types/rtafiTypes';

function roundToTwoDecimals(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function getResponseValue(
  responses: RtafiResponse[],
  itemId: string,
): number | null {
  const response = responses.find(
    (entry) =>
      entry.itemId === itemId,
  );

  return response
    ? response.value
    : null;
}

function average(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

function calculateMinimization(
  responses: RtafiResponse[],
): number {
  const minimizationItems =
    RTAFI_ITEMS.filter((item) =>
      item.tags?.includes(
        'minimization',
      ),
    );

  const values =
    minimizationItems
      .map((item) =>
        getResponseValue(
          responses,
          item.id,
        ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  return roundToTwoDecimals(
    average(values) * 25,
  );
}

function calculateExaggeration(
  responses: RtafiResponse[],
): number {
  const exaggerationItems =
    RTAFI_ITEMS.filter((item) =>
      item.tags?.includes(
        'exaggeration',
      ),
    );

  const values =
    exaggerationItems
      .map((item) =>
        getResponseValue(
          responses,
          item.id,
        ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  return roundToTwoDecimals(
    average(values) * 25,
  );
}

function calculateRandomResponding(
  responses: RtafiResponse[],
): number {
  const attentionChecks =
    RTAFI_ITEMS.filter((item) =>
      item.tags?.includes(
        'attention-check',
      ),
    );

  let failures = 0;

  attentionChecks.forEach((item) => {
    const response =
      getResponseValue(
        responses,
        item.id,
      );

    if (response === null) {
      return;
    }

    const expectedTwo =
      item.tags?.includes(
        'expected-2',
      );

    const expectedOne =
      item.tags?.includes(
        'expected-1',
      );

    if (
      expectedTwo &&
      response !== 2
    ) {
      failures += 1;
    }

    if (
      expectedOne &&
      response !== 1
    ) {
      failures += 1;
    }
  });

  return roundToTwoDecimals(
    (failures /
      Math.max(
        attentionChecks.length,
        1,
      )) *
      100,
  );
}

function calculateInconsistency(
  responses: RtafiResponse[],
): number {
  const pairs = [
    ['RTAFI_004', 'RTAFI_211'],
    ['RTAFI_009', 'RTAFI_212'],
    ['RTAFI_063', 'RTAFI_213'],
    ['RTAFI_108', 'RTAFI_214'],
    ['RTAFI_121', 'RTAFI_215'],
    ['RTAFI_150', 'RTAFI_216'],
    ['RTAFI_171', 'RTAFI_217'],
    ['RTAFI_187', 'RTAFI_218'],
  ];

  const differences: number[] =
    [];

  pairs.forEach(
    ([itemA, itemB]) => {
      const valueA =
        getResponseValue(
          responses,
          itemA,
        );

      const valueB =
        getResponseValue(
          responses,
          itemB,
        );

      if (
        valueA === null ||
        valueB === null
      ) {
        return;
      }

      differences.push(
        Math.abs(valueA - valueB),
      );
    },
  );

  return roundToTwoDecimals(
    average(differences) * 25,
  );
}

function determineConcernLevel(
  minimization: number,
  exaggeration: number,
  inconsistency: number,
  randomResponding: number,
): RtafiValidityConcernLevel {
  const highest =
    Math.max(
      minimization,
      exaggeration,
      inconsistency,
      randomResponding,
    );

  if (highest >= 75) {
    return 'Significant';
  }

  if (highest >= 55) {
    return 'Moderate';
  }

  if (highest >= 35) {
    return 'Mild';
  }

  return 'None';
}

export function calculateValidityProfile(
  responses: RtafiResponse[],
): RtafiValidityProfile {
  const defensiveMinimization =
    calculateMinimization(
      responses,
    );

  const exaggerationAmplification =
    calculateExaggeration(
      responses,
    );

  const inconsistencyIndex =
    calculateInconsistency(
      responses,
    );

  const randomRespondingIndex =
    calculateRandomResponding(
      responses,
    );

  const overallValidityConcernLevel =
    determineConcernLevel(
      defensiveMinimization,
      exaggerationAmplification,
      inconsistencyIndex,
      randomRespondingIndex,
    );

  return {
    defensiveMinimization,

    exaggerationAmplification,

    inconsistencyIndex,

    randomRespondingIndex,

    minimizationFlag:
      defensiveMinimization >=
      55,

    exaggerationFlag:
      exaggerationAmplification >=
      55,

    inconsistencyFlag:
      inconsistencyIndex >= 45,

    randomRespondingFlag:
      randomRespondingIndex >=
      40,

    overallValidityConcernLevel,
  };
}

export function calculateCompletionPercentage(
  responses: RtafiResponse[],
): number {
  return roundToTwoDecimals(
    (responses.length /
      RTAFI_ITEMS.length) *
      100,
  );
}

export function isAssessmentComplete(
  responses: RtafiResponse[],
): boolean {
  return (
    responses.length >=
    RTAFI_ITEMS.length * 0.9
  );
}