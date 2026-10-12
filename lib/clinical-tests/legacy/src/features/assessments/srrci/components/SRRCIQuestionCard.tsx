"use client";
import type {
  SRRCIItem,
  SRRCIResponseValue,
} from "../types/srrciTypes";

import {
  SRRCI_DOMAIN_LABELS,
  SRRCI_RESPONSE_OPTIONS,
} from "../types/srrciTypes";

interface SRRCIQuestionCardProps {
  item: SRRCIItem;
  currentValue?: SRRCIResponseValue;
  onSelect: (
    itemId: string,
    value: SRRCIResponseValue,
  ) => void;
}

function formatCategory(category: SRRCIItem["category"]): string {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SRRCIQuestionCard({
  item,
  currentValue,
  onSelect,
}: SRRCIQuestionCardProps) {
  const domainLabel = SRRCI_DOMAIN_LABELS[item.domain];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            SRRCI-X Question {item.itemNumber}
          </div>

          <h2 className="max-w-4xl text-lg font-semibold leading-relaxed text-white">
            {item.text}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              {domainLabel}
            </div>

            {item.compatibilityDimension ? (
              <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {item.compatibilityDimension.replaceAll("_", " ")}
              </div>
            ) : null}

            {item.validityPairId ? (
              <div className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
                Integrity Pair
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-fit rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {formatCategory(item.category)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
        {SRRCI_RESPONSE_OPTIONS.map((option) => {
          const isSelected = currentValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onSelect(
                  item.id,
                  option.value,
                )
              }
              aria-pressed={isSelected}
              className={[
                "rounded-xl border px-4 py-4 text-sm font-medium transition-all duration-200",
                isSelected
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-100 shadow-md shadow-cyan-500/20"
                  : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-cyan-500 hover:bg-slate-700",
              ].join(" ")}
            >
              <div className="mb-2 text-xl font-bold">
                {option.value}
              </div>

              <div>
                {option.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
