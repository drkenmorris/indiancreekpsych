// src/features/psychometrics/rtafi/context/rtafiHouseholdItemAdapter.ts

import { RTAFI_ITEMS } from '../data/rtafiItems';

import type { RtafiItem } from '../types/rtafiTypes';

import type {
  RtafiAdministrationContext,
  RtafiContextualizedPrompt,
} from './rtafiHouseholdContextTypes';

export type RtafiContextualizedItem = RtafiItem & {
  contextualizedPrompt: string;
  contextId: string;
  contextLabel: string;
};

type RandomizableRtafiLikeItem = {
  id: string;
  tags?: string[];
};

function lowercaseFirstLetter(value: string): string {
  if (!value.length) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function contextualizePrompt(
  prompt: string,
  context: RtafiAdministrationContext,
): string {
  switch (context.contextType) {
    case 'general':
      return prompt;

    case 'household_a':
    case 'household_b':
      return `When I am in ${context.displayLabel}, ${lowercaseFirstLetter(
        prompt,
      )}`;

    case 'caregiver_specific':
      return `When I am around ${
        context.associatedCaregiverName ?? context.displayLabel
      }, ${lowercaseFirstLetter(prompt)}`;

    case 'school_setting':
      return `At school or in educational settings, ${lowercaseFirstLetter(
        prompt,
      )}`;

    case 'residential_setting':
      return `When I am in ${context.displayLabel}, ${lowercaseFirstLetter(
        prompt,
      )}`;

    case 'community_setting':
      return `In community or social settings, ${lowercaseFirstLetter(prompt)}`;

    default:
      return prompt;
  }
}

export function buildContextualizedPrompt(
  item: RtafiItem,
  context: RtafiAdministrationContext,
): RtafiContextualizedPrompt {
  return {
    itemId: item.id,
    originalPrompt: item.prompt,
    contextualizedPrompt: contextualizePrompt(item.prompt, context),
    contextId: context.contextId,
    contextLabel: context.displayLabel,
  };
}

export function buildContextualizedItemBank(
  context: RtafiAdministrationContext,
): RtafiContextualizedItem[] {
  return RTAFI_ITEMS.map((item) => ({
    ...item,
    contextualizedPrompt: contextualizePrompt(item.prompt, context),
    contextId: context.contextId,
    contextLabel: context.displayLabel,
  }));
}

export function buildGeneralContext(): RtafiAdministrationContext {
  return {
    contextId: 'general',
    contextType: 'general',
    displayLabel: 'General Life Context',
    instructions:
      'Answer the questions based on your overall emotional and relational experiences across your life and important relationships.',
  };
}

export function buildHouseholdAContext(
  caregiverName?: string,
): RtafiAdministrationContext {
  return {
    contextId: 'household_a',
    contextType: 'household_a',
    displayLabel: caregiverName
      ? `${caregiverName}'s Household`
      : 'Household A',
    instructions:
      'Answer the questions based specifically on your experiences while living in or spending time within Household A.',
    associatedCaregiverName: caregiverName,
  };
}

export function buildHouseholdBContext(
  caregiverName?: string,
): RtafiAdministrationContext {
  return {
    contextId: 'household_b',
    contextType: 'household_b',
    displayLabel: caregiverName
      ? `${caregiverName}'s Household`
      : 'Household B',
    instructions:
      'Answer the questions based specifically on your experiences while living in or spending time within Household B.',
    associatedCaregiverName: caregiverName,
  };
}

export function buildCaregiverSpecificContext(args: {
  contextId: string;
  caregiverName: string;
  relationship?: string;
  displayLabel?: string;
}): RtafiAdministrationContext {
  return {
    contextId: args.contextId,
    contextType: 'caregiver_specific',
    displayLabel: args.displayLabel ?? args.caregiverName,
    instructions:
      'Answer the questions based specifically on your experiences with this caregiver or adult.',
    associatedCaregiverName: args.caregiverName,
    associatedRelationship: args.relationship,
  };
}

export function buildSchoolSettingContext(
  displayLabel = 'School Setting',
): RtafiAdministrationContext {
  return {
    contextId: 'school_setting',
    contextType: 'school_setting',
    displayLabel,
    instructions:
      'Answer the questions based specifically on your experiences at school or in educational settings.',
    associatedSettingName: displayLabel,
  };
}

export function buildResidentialSettingContext(
  displayLabel: string,
): RtafiAdministrationContext {
  return {
    contextId: `residential_${displayLabel
      .toLowerCase()
      .replace(/\s+/g, '_')}`,
    contextType: 'residential_setting',
    displayLabel,
    instructions:
      'Answer the questions based specifically on your experiences in this residential or placement setting.',
    associatedSettingName: displayLabel,
  };
}

export function buildCommunitySettingContext(
  displayLabel: string,
): RtafiAdministrationContext {
  return {
    contextId: `community_${displayLabel.toLowerCase().replace(/\s+/g, '_')}`,
    contextType: 'community_setting',
    displayLabel,
    instructions:
      'Answer the questions based specifically on your experiences in this community or social setting.',
    associatedSettingName: displayLabel,
  };
}

export function randomizeRtafiItems<T extends RandomizableRtafiLikeItem>(
  items: T[],
): T[] {
  const randomized = [...items];

  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));

    const current = randomized[index];
    randomized[index] = randomized[swapIndex];
    randomized[swapIndex] = current;
  }

  return randomized;
}

export function randomizeWhilePreservingValiditySpacing<
  T extends RandomizableRtafiLikeItem,
>(items: T[]): T[] {
  const randomized = randomizeRtafiItems(items);

  const attentionCheckItems = randomized.filter((item) =>
    item.tags?.includes('attention-check'),
  );

  const nonAttentionItems = randomized.filter(
    (item) => !item.tags?.includes('attention-check'),
  );

  const rebuilt: T[] = [];
  let attentionIndex = 0;

  nonAttentionItems.forEach((item, index) => {
    rebuilt.push(item);

    const shouldInsertAttention =
      index > 0 &&
      index % 25 === 0 &&
      attentionIndex < attentionCheckItems.length;

    if (shouldInsertAttention) {
      rebuilt.push(attentionCheckItems[attentionIndex]);
      attentionIndex += 1;
    }
  });

  while (attentionIndex < attentionCheckItems.length) {
    rebuilt.push(attentionCheckItems[attentionIndex]);
    attentionIndex += 1;
  }

  return rebuilt;
}

export function buildRandomizedContextualizedItemBank(
  context: RtafiAdministrationContext,
): RtafiContextualizedItem[] {
  return randomizeWhilePreservingValiditySpacing(
    buildContextualizedItemBank(context),
  );
}

export function buildContextualizedItemBanksForContexts(
  contexts: RtafiAdministrationContext[],
): Record<string, RtafiContextualizedItem[]> {
  return contexts.reduce<Record<string, RtafiContextualizedItem[]>>(
    (accumulator, context) => {
      accumulator[context.contextId] = buildContextualizedItemBank(context);
      return accumulator;
    },
    {},
  );
}