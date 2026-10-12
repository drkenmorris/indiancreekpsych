// src/features/psychometrics/rtafi/utils/rtafiResponseUtils.ts

import type {
  RtafiItem,
  RtafiResponse,
  RtafiResponseValue,
} from '../types/rtafiTypes';

import { RTAFI_ITEMS } from '../data/rtafiItems';

export interface RtafiDomainProgress {
  domain: string;
  totalItems: number;
  answeredItems: number;
  completionPercentage: number;
}

export function buildEmptyResponses(): RtafiResponse[] {
  return RTAFI_ITEMS.map((item) => ({
    itemId: item.id,
    value: 0,
  }));
}

export function getResponseForItem(
  responses: RtafiResponse[],
  itemId: string,
): RtafiResponse | undefined {
  return responses.find(
    (response) => response.itemId === itemId,
  );
}

export function updateResponse(
  responses: RtafiResponse[],
  itemId: string,
  value: RtafiResponseValue,
): RtafiResponse[] {
  const existingResponse = responses.find(
    (response) => response.itemId === itemId,
  );

  if (!existingResponse) {
    return [
      ...responses,
      {
        itemId,
        value,
      },
    ];
  }

  return responses.map((response) =>
    response.itemId === itemId
      ? {
          ...response,
          value,
        }
      : response,
  );
}

export function getAnsweredItemCount(
  responses: RtafiResponse[],
): number {
  return responses.length;
}

export function getUnansweredItems(
  responses: RtafiResponse[],
): RtafiItem[] {
  return RTAFI_ITEMS.filter(
    (item) =>
      !responses.some(
        (response) => response.itemId === item.id,
      ),
  );
}

export function calculateOverallCompletion(
  responses: RtafiResponse[],
): number {
  if (RTAFI_ITEMS.length === 0) {
    return 0;
  }

  return Number(
    (
      (responses.length / RTAFI_ITEMS.length) *
      100
    ).toFixed(2),
  );
}

export function calculateDomainProgress(
  responses: RtafiResponse[],
): RtafiDomainProgress[] {
  const groupedDomains = groupItemsByDomain();

  return Object.entries(groupedDomains).map(
    ([domain, items]) => {
      const answeredItems = items.filter((item) =>
        responses.some(
          (response) => response.itemId === item.id,
        ),
      ).length;

      const completionPercentage =
        items.length > 0
          ? (answeredItems / items.length) * 100
          : 0;

      return {
        domain,
        totalItems: items.length,
        answeredItems,
        completionPercentage: Number(
          completionPercentage.toFixed(2),
        ),
      };
    },
  );
}

export function groupItemsByDomain(): Record<
  string,
  RtafiItem[]
> {
  return RTAFI_ITEMS.reduce<
    Record<string, RtafiItem[]>
  >((accumulator, item) => {
    if (!accumulator[item.domain]) {
      accumulator[item.domain] = [];
    }

    accumulator[item.domain].push(item);

    return accumulator;
  }, {});
}

export function groupItemsBySubscale(): Record<
  string,
  RtafiItem[]
> {
  return RTAFI_ITEMS.reduce<
    Record<string, RtafiItem[]>
  >((accumulator, item) => {
    if (!accumulator[item.subscale]) {
      accumulator[item.subscale] = [];
    }

    accumulator[item.subscale].push(item);

    return accumulator;
  }, {});
}

export function shuffleItems(
  items: RtafiItem[],
): RtafiItem[] {
  const clonedItems = [...items];

  for (
    let currentIndex = clonedItems.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (currentIndex + 1),
    );

    const currentItem = clonedItems[currentIndex];

    clonedItems[currentIndex] =
      clonedItems[randomIndex];

    clonedItems[randomIndex] = currentItem;
  }

  return clonedItems;
}

export function filterItemsByDomain(
  domain: string,
): RtafiItem[] {
  return RTAFI_ITEMS.filter(
    (item) => item.domain === domain,
  );
}

export function filterItemsBySubscale(
  subscale: string,
): RtafiItem[] {
  return RTAFI_ITEMS.filter(
    (item) => item.subscale === subscale,
  );
}

export function calculateMeanResponseValue(
  responses: RtafiResponse[],
): number {
  if (responses.length === 0) {
    return 0;
  }

  const total = responses.reduce(
    (sum, response) => sum + response.value,
    0,
  );

  return Number(
    (total / responses.length).toFixed(2),
  );
}

export function detectStraightLining(
  responses: RtafiResponse[],
): boolean {
  if (responses.length < 15) {
    return false;
  }

  let repeatedCount = 1;

  for (let i = 1; i < responses.length; i += 1) {
    if (
      responses[i].value ===
      responses[i - 1].value
    ) {
      repeatedCount += 1;
    } else {
      repeatedCount = 1;
    }

    if (repeatedCount >= 15) {
      return true;
    }
  }

  return false;
}