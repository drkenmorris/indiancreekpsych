"use client";
import {
  getSRRCIDomainLabel,
} from "../engine/srrciScoring";

import type {
  SRRCIDomainScore,
} from "../types/srrciTypes";

interface SRRCIDomainSummaryCardProps {
  domainScore: SRRCIDomainScore;
}

function formatSeverity(
  severity: SRRCIDomainScore["severity"],
): string {
  return severity
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSeverityColor(
  severity: SRRCIDomainScore["severity"],
): string {
  switch (severity) {
    case "minimal":
      return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";

    case "mild":
      return "text-lime-300 border-lime-500/40 bg-lime-500/10";

    case "moderate":
      return "text-yellow-300 border-yellow-500/40 bg-yellow-500/10";

    case "high":
      return "text-orange-300 border-orange-500/40 bg-orange-500/10";

    case "severe":
      return "text-red-300 border-red-500/40 bg-red-500/10";

    case "extreme":
      return "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10";

    default:
      return "text-slate-300 border-slate-500/40 bg-slate-500/10";
  }
}

export default function SRRCIDomainSummaryCard({
  domainScore,
}: SRRCIDomainSummaryCardProps) {
  const percent = domainScore.percentScore;
  const label = domainScore.label || getSRRCIDomainLabel(domainScore.domain);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {domainScore.domain}
          </div>

          <h3 className="mt-2 text-lg font-bold text-white">
            {label}
          </h3>
        </div>

        <div
          className={[
            "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em]",
            getSeverityColor(domainScore.severity),
          ].join(" ")}
        >
          {formatSeverity(domainScore.severity)}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
        <div>
          Raw Score:{" "}
          <span className="font-semibold text-white">
            {domainScore.rawScore}
          </span>
          <span className="text-slate-500">
            {" "}
            / {domainScore.maxScore}
          </span>
        </div>

        <div>
          Score:{" "}
          <span className="font-semibold text-cyan-300">
            {percent}%
          </span>
        </div>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-300"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      {domainScore.narrative ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          {domainScore.narrative}
        </p>
      ) : null}
    </div>
  );
}
