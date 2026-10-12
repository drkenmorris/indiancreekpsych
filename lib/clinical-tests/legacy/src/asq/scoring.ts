// src/asq/scoring.ts

import type { LikertValue } from "./LikertQuestion";
import { AUTISM_ITEMS_TEACHER } from "../assessments/autism/items/autismItemsTeacher";

/**
 * Shared score structures
 */
export interface ScoreBucket {
  id: string;
  label: string;
  answeredCount: number;
  rawSum: number;
  mean: number | null; // 0–3
}

export interface ScoreProfile {
  subscales: ScoreBucket[]; // kept for backwards compatibility (unused in teacher short form)
  domains: ScoreBucket[];
  meta?: Record<string, unknown>;
}

type ScorableItem = {
  id: string;
  domain: string;
  prompt?: string;
  reverse?: boolean;
};

function computeMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function safeLikert(raw: LikertValue | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const v = Number(raw);
  if (Number.isNaN(v)) return null;
  if (v < 0 || v > 3) return null;
  return v;
}

/**
 * Generic domain scorer (0–3 scale), supports reverse-keyed items.
 * This is what TeacherForm needs right now.
 */
export function scoreDomainItems(
  items: ScorableItem[],
  responses: Record<string, LikertValue>
): ScoreProfile {
  const domainValues: Record<string, number[]> = {};

  for (const it of items) {
    const raw = safeLikert(responses[it.id]);
    if (raw === null) continue;

    const scored = it.reverse ? 3 - raw : raw;

    if (!domainValues[it.domain]) domainValues[it.domain] = [];
    domainValues[it.domain].push(scored);
  }

  const domains: ScoreBucket[] = Object.keys(domainValues)
    .sort((a, b) => a.localeCompare(b))
    .map((domainId) => {
      const vals = domainValues[domainId];
      return {
        id: domainId,
        label: domainId,
        answeredCount: vals.length,
        rawSum: vals.reduce((a, b) => a + b, 0),
        mean: computeMean(vals),
      };
    });

  return { subscales: [], domains };
}

/**
 * Teacher scoring used by src/asq/TeacherForm.tsx
 */
export function scoreTeacherResponses(
  responses: Record<string, LikertValue>
): ScoreProfile {
  // Teacher items are expected to be { id: string; domain: string; prompt: string; reverse?: boolean }
  return scoreDomainItems(AUTISM_ITEMS_TEACHER as unknown as ScorableItem[], responses);
}

/**
 * NOTE:
 * We intentionally do NOT import autismItemsSelf or autismItemsParent here to avoid
 * TS2307/TS2724 while those banks are still being refactored.
 *
 * - SelfForm computes domain means locally (no dependency on scoring.ts).
 * - ParentAutismAssessmentForm uses the unified engine in /assessments/autism/engine/autismScoring.
 */
