"use client";
import SRRCICompatibilityCard from "../components/SRRCICompatibilityCard";
import SRRCIDomainSummaryCard from "../components/SRRCIDomainSummaryCard";
import SRRCIValidityCard from "../components/SRRCIValidityCard";

import {
  getSRRCIProfile,
  getSRRCIResult,
} from "../services/srrciStorage";

import type { SRRCINarrativeSection } from "../types/srrciTypes";

function formatLevel(level?: string): string {
  if (!level) return "Not specified";

  return level
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function NarrativeSectionCard({
  section,
}: {
  section: SRRCINarrativeSection;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <h3 className="text-xl font-bold text-white">
          {section.title}
        </h3>

        {section.level ? (
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            {formatLevel(section.level)}
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        {section.body}
      </p>

      {section.recommendations && section.recommendations.length > 0 ? (
        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Recommendations
          </div>

          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            {section.recommendations.map((recommendation) => (
              <li key={recommendation} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-cyan-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-white">
        {value}
      </div>

      {helper ? (
        <div className="mt-2 text-xs leading-relaxed text-slate-400">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export default function SRRCIResultsPage() {
  const result = getSRRCIResult();
  const profile = getSRRCIProfile();

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 text-center shadow-2xl">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            SRRCI-X
          </div>

          <h1 className="text-3xl font-bold">
            No Results Found
          </h1>

          <p className="mt-5 text-slate-400">
            No completed Sexual Regulation & Relational Compatibility
            Intelligence System results were located in storage.
          </p>
        </div>
      </div>
    );
  }

  const clinicalNarrative = result.clinicalNarrative ?? [];
  const compatibilityNarrative = result.compatibilityNarrative ?? [];
  const growthRecommendations = result.growthRecommendations ?? [];

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Omniscient Technologies
          </div>

          <h1 className="text-4xl font-bold">
            SRRCI-X Results
          </h1>

          <div className="mt-3 text-lg text-slate-300">
            Sexual Regulation & Relational Compatibility Intelligence System
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-400">
            Research-grade sexual regulation, dysregulation-risk, compatibility,
            and couple-dynamics profile. Results should be interpreted as
            decision-support and clinical/relational insight rather than a
            stand-alone diagnosis.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Participant"
              value={profile?.displayName ?? "Unknown"}
            />

            <MetricCard
              label="Overall Concern"
              value={formatLevel(result.globalSeverity)}
              helper={`${result.totalPercentScore}% clinical regulation concern`}
            />

            <MetricCard
              label="Healthy Regulation"
              value={`${result.regulationStrengthScore ?? 0}%`}
              helper="Capacity to experience desire without being controlled by it"
            />

            <MetricCard
              label="Completed"
              value={new Date(result.completedAt).toLocaleDateString()}
              helper={new Date(result.completedAt).toLocaleTimeString()}
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Executive Summary
              </div>

              <p className="text-base leading-relaxed text-slate-100">
                {result.executiveSummary ?? result.summary}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Pattern Flags
              </div>

              <div className="flex flex-wrap gap-3">
                {result.patternFlags.map((flag) => (
                  <div
                    key={flag}
                    className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200"
                  >
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Summary Interpretation
            </div>

            <p className="text-base leading-relaxed text-slate-200">
              {result.summary}
            </p>
          </div>
        </div>

        <div className="mb-10">
          <SRRCIValidityCard
            validityProfile={result.validityProfile}
          />
        </div>

        <div className="mb-10">
          <SRRCICompatibilityCard
            profile={result.compatibilityProfile}
          />
        </div>

        {clinicalNarrative.length > 0 ? (
          <div className="mb-10">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
                Clinical Interpretation
              </div>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Sexual Regulation Narrative
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {clinicalNarrative.map((section) => (
                <NarrativeSectionCard
                  key={section.title}
                  section={section}
                />
              ))}
            </div>
          </div>
        ) : null}

        {compatibilityNarrative.length > 0 ? (
          <div className="mb-10">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
                Relational Interpretation
              </div>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Compatibility & Couple-Dynamics Narrative
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {compatibilityNarrative.map((section) => (
                <NarrativeSectionCard
                  key={section.title}
                  section={section}
                />
              ))}
            </div>
          </div>
        ) : null}

        {growthRecommendations.length > 0 ? (
          <div className="mb-10 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Growth Recommendations
            </div>

            <h2 className="text-3xl font-bold text-white">
              Practical Next Steps
            </h2>

            <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {growthRecommendations.map((recommendation) => (
                <li
                  key={recommendation}
                  className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-sm leading-relaxed text-slate-300"
                >
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Domain Analysis
            </div>

            <h2 className="mt-2 text-3xl font-bold text-white">
              Clinical, Regulation, Compatibility, and Couple-Dynamics Scores
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {result.domainScores.map((domainScore) => (
              <SRRCIDomainSummaryCard
                key={domainScore.domain}
                domainScore={domainScore}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
