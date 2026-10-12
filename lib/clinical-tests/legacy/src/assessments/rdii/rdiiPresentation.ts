import type { AssessmentItem, Domain } from "./rdiiTypes";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PresentationMode =
  | "DEV_BY_DOMAIN"
  | "PROD_RANDOMIZED";

export function buildItemView(
  allItems: AssessmentItem[],
  mode: PresentationMode,
  opts?: { domain?: Domain; seed?: number }
): AssessmentItem[] {

  if (mode === "DEV_BY_DOMAIN") {
    if (!opts?.domain) return allItems;
    return allItems.filter((i) => i.domain === opts.domain);
  }

  const seed = opts?.seed ?? 12345;
  const rng = mulberry32(seed);

  const items = [...allItems];

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}