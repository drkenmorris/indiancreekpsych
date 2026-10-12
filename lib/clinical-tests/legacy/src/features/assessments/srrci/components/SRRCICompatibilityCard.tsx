"use client";
import type {
  SRRCIAlignmentLevel,
  SRRCICompatibilityProfile,
  SRRCIDimensionScore,
} from "../types/srrciTypes";

interface SRRCICompatibilityCardProps {
  profile: SRRCICompatibilityProfile;
}

interface CompatibilityMetricProps {
  label: string;
  value: number;
  alignmentLevel?: SRRCIAlignmentLevel;
  narrative?: string;
}

function formatLevel(level?: string): string {
  if (!level) return "Not scored";

  return level
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePercent(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function CompatibilityMetric({
  label,
  value,
  alignmentLevel,
  narrative,
}: CompatibilityMetricProps) {
  const percent = normalizePercent(value);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-300">
          {label}
        </div>

        <div className="text-sm font-bold text-cyan-300">
          {percent}%
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-300"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      {alignmentLevel ? (
        <div className="mt-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          {formatLevel(alignmentLevel)}
        </div>
      ) : null}

      {narrative ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {narrative}
        </p>
      ) : null}
    </div>
  );
}

function buildFallbackDimensions(
  profile: SRRCICompatibilityProfile,
): SRRCIDimensionScore[] {
 const scores: SRRCIDimensionScore[] = [
    {
      dimension: "partner_desire" as const,
      label: "Partner Desire",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.partnerDesireScore,
      narrative: "Degree of sexual desire, attraction, and partner-focused erotic interest.",
    },
    {
      dimension: "frequency" as const,
      label: "Desired Frequency",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.desiredFrequencyScore,
      narrative: "Preferred sexual frequency and tolerance for frequency mismatch.",
    },
    {
      dimension: "novelty" as const,
      label: "Adventure & Novelty",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.noveltyAdventureScore,
      narrative: "Interest in variety, creativity, and sexual exploration without unhealthy escalation.",
    },
    {
      dimension: "communication" as const,
      label: "Sexual Communication",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.sexualCommunicationScore,
      narrative: "Capacity to discuss needs, limits, feedback, and dissatisfaction directly.",
    },
    {
      dimension: "boundaries" as const,
      label: "Boundary & Exclusivity Alignment",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.boundaryExclusivityScore,
      narrative: "Clarity and compatibility around exclusivity, online behavior, secrecy, and consent.",
    },
    {
      dimension: "affection" as const,
      label: "Affection & Emotional Intimacy",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.affectionIntimacyScore,
      narrative: "Need for warmth, tenderness, reassurance, and non-sexual touch around intimacy.",
    },
    {
      dimension: "confidence" as const,
      label: "Sexual Confidence & Vulnerability",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.sexualConfidenceScore,
      narrative: "Comfort with sexual vulnerability, self-expression, feedback, and rejection risk.",
    },
    {
      dimension: "satisfaction" as const,
      label: "Partner Satisfaction",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.partnerSatisfactionScore,
      narrative: "Reported fulfillment, reciprocity, and confidence in improving satisfaction.",
    },
    {
      dimension: "initiative" as const,
      label: "Sexual Initiative Reciprocity",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.initiativeReciprocityScore,
      narrative: "Mutuality in initiating, declining, and recovering from sexual invitations.",
    },
    {
      dimension: "resilience" as const,
      label: "Relational Resilience",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.relationalResilienceScore,
      narrative: "Ability to negotiate mismatch without resentment, withdrawal, or emotional punishment.",
    },
    {
      dimension: "pacing" as const,
      label: "Sexual Pacing Synchrony",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.sexualPacingScore ?? 0,
      narrative: "Compatibility around timing, pressure, initiation pace, and emotional readiness.",
    },
    {
      dimension: "repair" as const,
      label: "Repair Capacity",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.repairCapacityScore ?? 0,
      narrative: "Ability to recover after disappointment, rejection, mismatch, or sexual conflict.",
    },
    {
      dimension: "pressure_response" as const,
      label: "Pressure Response",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.pressureResponseScore ?? 0,
      narrative: "Likelihood of staying respectful and regulated when sexual needs are not met.",
    },
    {
      dimension: "integrity" as const,
      label: "Behavioral Integrity",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.behavioralIntegrityScore ?? 0,
      narrative: "Honesty, reliability, and trust-protecting behavior around sexuality.",
    },
    {
      dimension: "attachment_synchrony" as const,
      label: "Attachment-Sexuality Synchrony",
      rawScore: 0,
      maxScore: 0,
      percentScore: profile.attachmentSynchronyScore ?? 0,
      narrative: "How sexual desire, emotional security, reassurance, and closeness interact.",
    },
  ].filter((dimension) => dimension.percentScore > 0);
  return scores;
}

export default function SRRCICompatibilityCard({
  profile,
}: SRRCICompatibilityCardProps) {
  const dimensionScores =
    profile.dimensionScores && profile.dimensionScores.length > 0
      ? profile.dimensionScores
      : buildFallbackDimensions(profile);

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Compatibility Profile
        </div>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Relational, Sexual, and Couple-Dynamics Indicators
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          These dimensions estimate desire alignment, frequency preference,
          novelty orientation, sexual communication, boundary agreement,
          affection synchrony, initiative reciprocity, repair capacity,
          pressure response, and future partner-comparison potential.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
        <div className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Compatibility Summary
        </div>

        <p className="text-sm leading-relaxed text-slate-200">
          {profile.compatibilitySummary}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dimensionScores.map((dimensionScore) => (
          <CompatibilityMetric
            key={dimensionScore.dimension}
            label={dimensionScore.label}
            value={dimensionScore.percentScore}
            alignmentLevel={dimensionScore.alignmentLevel}
            narrative={dimensionScore.narrative}
          />
        ))}
      </div>
    </div>
  );
}
