"use client";
import type {
  SRRCIValidityProfile,
} from "../types/srrciTypes";

interface SRRCIValidityCardProps {
  validityProfile: SRRCIValidityProfile;
}

function formatIntegrityLabel(
  integrity: SRRCIValidityProfile["responseIntegrity"],
): string {
  return integrity
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getIntegrityColor(
  integrity: SRRCIValidityProfile["responseIntegrity"],
): string {
  switch (integrity) {
    case "acceptable":
      return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";

    case "caution":
      return "text-yellow-300 border-yellow-500/40 bg-yellow-500/10";

    case "questionable":
      return "text-orange-300 border-orange-500/40 bg-orange-500/10";

    case "invalid":
      return "text-red-300 border-red-500/40 bg-red-500/10";

    default:
      return "text-slate-300 border-slate-500/40 bg-slate-500/10";
  }
}

function getIntegrityDescription(
  integrity: SRRCIValidityProfile["responseIntegrity"],
): string {
  switch (integrity) {
    case "acceptable":
      return "The response pattern appears interpretable using normal caution.";

    case "caution":
      return "The response pattern remains usable, but mild response-style concerns should be considered.";

    case "questionable":
      return "The response pattern raises meaningful interpretive concerns and should be reviewed carefully.";

    case "invalid":
      return "The response pattern may not support dependable interpretation without additional review.";

    default:
      return "Response integrity could not be clearly classified.";
  }
}

interface MetricRowProps {
  label: string;
  value: number;
  helper: string;
}

function MetricRow({
  label,
  value,
  helper,
}: MetricRowProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          {label}
        </div>

        <div className="text-lg font-bold text-cyan-300">
          {value}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {helper}
      </p>
    </div>
  );
}

export default function SRRCIValidityCard({
  validityProfile,
}: SRRCIValidityCardProps) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Response Integrity
          </div>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Validity & Consistency Analysis
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            These indicators evaluate defensive responding, exaggeration,
            contradiction patterns, and overall response consistency. They do
            not diagnose a respondent; they estimate how confidently the
            SRRCI-X profile should be interpreted.
          </p>
        </div>

        <div
          className={[
            "rounded-full border px-5 py-3 text-sm font-bold uppercase tracking-[0.14em]",
            getIntegrityColor(
              validityProfile.responseIntegrity,
            ),
          ].join(" ")}
        >
          {formatIntegrityLabel(validityProfile.responseIntegrity)}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400">
          Integrity Interpretation
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          {validityProfile.narrative ??
            getIntegrityDescription(validityProfile.responseIntegrity)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricRow
          label="Faking Good"
          value={validityProfile.fakingGoodScore}
          helper="Idealized, overly perfect, or defensive presentation."
        />

        <MetricRow
          label="Faking Bad"
          value={validityProfile.fakingBadScore}
          helper="Exaggerated, crisis-style, or globally negative presentation."
        />

        <MetricRow
          label="Inconsistency"
          value={validityProfile.inconsistencyScore}
          helper="Contradictions across paired or logically related items."
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400">
          Interpretation Notes
        </div>

        <ul className="space-y-3">
          {validityProfile.notes.map((note) => (
            <li
              key={note}
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm leading-relaxed text-slate-300"
            >
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
