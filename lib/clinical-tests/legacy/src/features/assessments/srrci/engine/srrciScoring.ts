import { srrciItems } from "../data/srrciItems";
import {
  SRRCI_CLINICAL_DOMAINS,
  SRRCI_COMPATIBILITY_DIMENSION_LABELS,
  SRRCI_COMPATIBILITY_DOMAINS,
  SRRCI_COUPLE_DYNAMICS_DOMAINS,
  SRRCI_DOMAIN_LABELS,
  SRRCI_HEALTHY_REGULATION_DOMAINS,
  SRRCI_SCORABLE_DOMAINS,
} from "../types/srrciTypes";

import type {
  SRRCIAlignmentLevel,
  SRRCICompatibilityDimension,
  SRRCICompatibilityProfile,
  SRRCIDimensionScore,
  SRRCIDomainCode,
  SRRCIDomainScore,
  SRRCINarrativeSection,
  SRRCIResponse,
  SRRCIResult,
  SRRCISeverityLevel,
  SRRCIValidityProfile,
} from "../types/srrciTypes";

const MAX_ITEM_SCORE = 4;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function getSeverityFromPercent(percentScore: number): SRRCISeverityLevel {
  if (percentScore >= 85) return "extreme";
  if (percentScore >= 70) return "severe";
  if (percentScore >= 55) return "high";
  if (percentScore >= 35) return "moderate";
  if (percentScore >= 18) return "mild";
  return "minimal";
}

function getDomainSeverity(percentScore: number): SRRCISeverityLevel {
  if (percentScore >= 80) return "severe";
  if (percentScore >= 60) return "high";
  if (percentScore >= 40) return "moderate";
  if (percentScore >= 20) return "mild";
  return "minimal";
}

function getStrengthLevel(percentScore: number): SRRCISeverityLevel {
  if (percentScore >= 85) return "extreme";
  if (percentScore >= 70) return "severe";
  if (percentScore >= 55) return "high";
  if (percentScore >= 35) return "moderate";
  if (percentScore >= 18) return "mild";
  return "minimal";
}

function getAlignmentFromPercent(percentScore: number): SRRCIAlignmentLevel {
  if (percentScore >= 85) return "strong_alignment";
  if (percentScore >= 70) return "moderate_alignment";
  if (percentScore >= 50) return "mixed_alignment";
  if (percentScore >= 30) return "significant_mismatch";
  return "severe_mismatch";
}

function getResponseMap(
  responses: SRRCIResponse[],
): Map<string, number> {
  return new Map(responses.map((response) => [response.itemId, response.value]));
}

function getItemScore(
  itemId: string,
  responseMap: Map<string, number>,
): number {
  return responseMap.get(itemId) ?? 0;
}

function getScoredItemValue(
  item: { id: string; reverseScored?: boolean },
  responseMap: Map<string, number>,
): number {
  const value = getItemScore(item.id, responseMap);
  return item.reverseScored ? MAX_ITEM_SCORE - value : value;
}

function scorePercentFromItems(
  items: Array<{ id: string; reverseScored?: boolean }>,
  responseMap: Map<string, number>,
): {
  rawScore: number;
  maxScore: number;
  percentScore: number;
} {
  const rawScore = items.reduce(
    (total, item) => total + getScoredItemValue(item, responseMap),
    0,
  );

  const maxScore = items.length * MAX_ITEM_SCORE;
  const percentScore =
    maxScore > 0 ? clampPercent((rawScore / maxScore) * 100) : 0;

  return {
    rawScore,
    maxScore,
    percentScore,
  };
}

function buildDomainNarrative(
  domain: SRRCIDomainCode,
  percentScore: number,
  _severity: SRRCISeverityLevel,
): string {
  const label = SRRCI_DOMAIN_LABELS[domain];

  if (SRRCI_CLINICAL_DOMAINS.includes(domain)) {
    if (percentScore >= 70) {
      return `${label} is strongly elevated and should be treated as a meaningful sexual-regulation concern. This domain may be contributing to distress, secrecy, conflict, impairment, or repetitive patterns that are difficult to interrupt.`;
    }

    if (percentScore >= 40) {
      return `${label} shows a moderate pattern. This does not automatically indicate pathology, but it suggests an area where stress, desire, attachment, habit, or emotional regulation may be affecting sexual decision-making.`;
    }

    return `${label} is not strongly elevated. Current responses do not suggest this domain is a dominant dysregulation driver.`;
  }

  if (SRRCI_HEALTHY_REGULATION_DOMAINS.includes(domain)) {
    if (percentScore >= 70) {
      return `${label} appears well developed. The respondent reports capacity to experience sexual desire without being controlled by it, preserve boundaries, and integrate sexuality with broader values and responsibilities.`;
    }

    if (percentScore >= 40) {
      return `${label} appears mixed. Some self-control and value-consistency are present, but sexual pressure, frustration, or emotional triggers may still challenge regulation.`;
    }

    return `${label} appears underdeveloped. This may indicate difficulty redirecting sexual impulses, tolerating sexual frustration, or maintaining choices consistent with values and commitments.`;
  }

  if (
    SRRCI_COMPATIBILITY_DOMAINS.includes(domain) ||
    SRRCI_COUPLE_DYNAMICS_DOMAINS.includes(domain)
  ) {
    if (percentScore >= 70) {
      return `${label} appears to be a likely relational strength. The respondent reports patterns that support communication, mutuality, emotional safety, repair, or compatibility.`;
    }

    if (percentScore >= 40) {
      return `${label} appears mixed. This area may function adequately in some conditions while becoming strained under mismatch, rejection, pressure, or poor communication.`;
    }

    return `${label} may be a relational vulnerability. Differences in desire, pacing, affection, boundaries, communication, or repair may require deliberate discussion and mutual adjustment.`;
  }

  return `${label} was scored for response-integrity purposes.`;
}

function calculateDomainScores(
  responseMap: Map<string, number>,
): SRRCIDomainScore[] {
  return SRRCI_SCORABLE_DOMAINS.map((domain) => {
    const domainItems = srrciItems.filter((item) => item.domain === domain);
    const score = scorePercentFromItems(domainItems, responseMap);
    const severity = getDomainSeverity(score.percentScore);

    return {
      domain,
      rawScore: score.rawScore,
      maxScore: score.maxScore,
      percentScore: score.percentScore,
      severity,
      label: SRRCI_DOMAIN_LABELS[domain],
      narrative: buildDomainNarrative(domain, score.percentScore, severity),
    };
  }).filter((score) => score.maxScore > 0);
}

function calculateInconsistencyScore(
  responseMap: Map<string, number>,
): number {
  const pairMap = new Map<string, typeof srrciItems>();

  srrciItems.forEach((item) => {
    if (!item.validityPairId) return;

    const existing = pairMap.get(item.validityPairId) ?? [];
    pairMap.set(item.validityPairId, [...existing, item]);
  });

  let inconsistencyScore = 0;

  pairMap.forEach((pairItems) => {
    if (pairItems.length < 2) return;

    const [first, second] = pairItems;
    if (!first || !second) return;

    const firstScore = getScoredItemValue(first, responseMap);
    const secondScore = getScoredItemValue(second, responseMap);

    inconsistencyScore += Math.abs(firstScore - secondScore);
  });

  return inconsistencyScore;
}

function calculateValidityProfile(
  responseMap: Map<string, number>,
): SRRCIValidityProfile {
  const fakingGoodItems = srrciItems.filter((item) => item.domain === "FG");
  const fakingBadItems = srrciItems.filter((item) => item.domain === "FB");

  const fakingGoodScore = fakingGoodItems.reduce(
    (total, item) => total + getItemScore(item.id, responseMap),
    0,
  );

  const fakingBadScore = fakingBadItems.reduce(
    (total, item) => total + getItemScore(item.id, responseMap),
    0,
  );

  const inconsistencyScore = calculateInconsistencyScore(responseMap);
  const notes: string[] = [];

  if (fakingGoodScore >= 24) {
    notes.push("Very elevated idealized or defensive responding detected.");
  } else if (fakingGoodScore >= 18) {
    notes.push("Some idealized or defensive responding may be present.");
  }

  if (fakingBadScore >= 24) {
    notes.push("Very elevated exaggeration, crisis-style, or globally negative responding detected.");
  } else if (fakingBadScore >= 18) {
    notes.push("Some exaggeration or crisis-style responding may be present.");
  }

  if (inconsistencyScore >= 10) {
    notes.push("High inconsistency detected across paired response-integrity items.");
  } else if (inconsistencyScore >= 6) {
    notes.push("Meaningful inconsistency detected across paired response-integrity items.");
  } else if (inconsistencyScore >= 3) {
    notes.push("Mild inconsistency detected across paired response-integrity items.");
  }

  let responseIntegrity: SRRCIValidityProfile["responseIntegrity"] = "acceptable";

  if (fakingGoodScore >= 30 || fakingBadScore >= 30 || inconsistencyScore >= 12) {
    responseIntegrity = "invalid";
  } else if (
    fakingGoodScore >= 24 ||
    fakingBadScore >= 24 ||
    inconsistencyScore >= 8
  ) {
    responseIntegrity = "questionable";
  } else if (
    fakingGoodScore >= 18 ||
    fakingBadScore >= 18 ||
    inconsistencyScore >= 4
  ) {
    responseIntegrity = "caution";
  }

  if (notes.length === 0) {
    notes.push("No major response-integrity concerns detected.");
  }

  const narrative =
    responseIntegrity === "acceptable"
      ? "The response-integrity profile appears acceptable. Scores can be interpreted using normal caution."
      : responseIntegrity === "caution"
        ? "The response-integrity profile suggests mild caution. Scores may still be useful, but interpretation should consider possible defensiveness, exaggeration, or inconsistency."
        : responseIntegrity === "questionable"
          ? "The response-integrity profile is questionable. Results should be interpreted carefully and ideally compared with interview data or collateral context."
          : "The response-integrity profile is invalid or near-invalid. Narrative conclusions should not be treated as dependable without further review.";

  return {
    fakingGoodScore,
    fakingBadScore,
    inconsistencyScore,
    responseIntegrity,
    notes,
    narrative,
  };
}

function calculateDimensionScore(
  dimension: SRRCICompatibilityDimension,
  responseMap: Map<string, number>,
): SRRCIDimensionScore {
  const dimensionItems = srrciItems.filter(
    (item) => item.compatibilityDimension === dimension,
  );

  const score = scorePercentFromItems(dimensionItems, responseMap);
  const label = SRRCI_COMPATIBILITY_DIMENSION_LABELS[dimension];

  return {
    dimension,
    label,
    rawScore: score.rawScore,
    maxScore: score.maxScore,
    percentScore: score.percentScore,
    alignmentLevel: getAlignmentFromPercent(score.percentScore),
    narrative: buildCompatibilityDimensionNarrative(
      label,
      score.percentScore,
      getAlignmentFromPercent(score.percentScore),
    ),
  };
}

function buildCompatibilityDimensionNarrative(
  label: string,
  percentScore: number,
  alignmentLevel: SRRCIAlignmentLevel,
): string {
  if (percentScore >= 75) {
    return `${label} appears to be a likely strength. This area should support relational stability when paired with a partner who shows similar or complementary patterns.`;
  }

  if (percentScore >= 50) {
    return `${label} appears workable but not automatically strong. This area may need direct communication, pacing, and repair skills when preferences differ.`;
  }

  return `${label} may represent a mismatch or vulnerability area. A partner comparison would be especially useful to determine whether the issue is individual difficulty, couple mismatch, or both. Alignment level: ${alignmentLevel}.`;
}

function getDimensionPercent(
  dimensionScores: SRRCIDimensionScore[],
  dimension: SRRCICompatibilityDimension,
): number {
  return (
    dimensionScores.find((score) => score.dimension === dimension)?.percentScore ??
    0
  );
}

function calculateCompatibilityProfile(
  responseMap: Map<string, number>,
): SRRCICompatibilityProfile {
  const dimensions: SRRCICompatibilityDimension[] = [
    "partner_desire",
    "frequency",
    "novelty",
    "communication",
    "boundaries",
    "affection",
    "confidence",
    "satisfaction",
    "initiative",
    "resilience",
    "pacing",
    "repair",
    "pressure_response",
    "integrity",
    "attachment_synchrony",
  ];

  const dimensionScores = dimensions
    .map((dimension) => calculateDimensionScore(dimension, responseMap))
    .filter((score) => score.maxScore > 0);

  const score = (dimension: SRRCICompatibilityDimension): number =>
    getDimensionPercent(dimensionScores, dimension);

  const scoredDimensions = dimensionScores.filter((dimension) => dimension.maxScore > 0);
  const average =
    scoredDimensions.length > 0
      ? clampPercent(
          scoredDimensions.reduce(
            (total, dimension) => total + dimension.percentScore,
            0,
          ) / scoredDimensions.length,
        )
      : 0;

  const compatibilitySummary =
    average >= 75
      ? "Compatibility indicators are generally strong. The profile suggests good potential for mutuality, communication, repair, and sexual-relational integration."
      : average >= 50
        ? "Compatibility indicators are mixed. The relationship may function well with honest communication, but some areas likely require explicit negotiation and repair."
        : "Compatibility indicators show meaningful vulnerability. Partner comparison and careful discussion of desire, boundaries, pacing, communication, and emotional safety would be important.";

  return {
    partnerDesireScore: score("partner_desire"),
    desiredFrequencyScore: score("frequency"),
    noveltyAdventureScore: score("novelty"),
    sexualCommunicationScore: score("communication"),
    boundaryExclusivityScore: score("boundaries"),
    affectionIntimacyScore: score("affection"),
    sexualConfidenceScore: score("confidence"),
    partnerSatisfactionScore: score("satisfaction"),
    initiativeReciprocityScore: score("initiative"),
    relationalResilienceScore: score("resilience"),

    sexualPacingScore: score("pacing"),
    repairCapacityScore: score("repair"),
    pressureResponseScore: score("pressure_response"),
    behavioralIntegrityScore: score("integrity"),
    attachmentSynchronyScore: score("attachment_synchrony"),

    dimensionScores,
    compatibilitySummary,
  };
}

function getDomainPercent(
  domainScores: SRRCIDomainScore[],
  domain: SRRCIDomainCode,
): number {
  return domainScores.find((score) => score.domain === domain)?.percentScore ?? 0;
}

function getPatternFlags(
  domainScores: SRRCIDomainScore[],
): string[] {
  const getScore = (domain: SRRCIDomainCode): number =>
    getDomainPercent(domainScores, domain);

  const flags: string[] = [];

  if (getScore("UDC") >= 60 && getScore("RRI") >= 60) {
    flags.push("Compulsive sexual-behavior pattern");
  }

  if (getScore("PDC") >= 60 && getScore("UDC") >= 50) {
    flags.push("Pornography or digital sexual-content regulation concern");
  }

  if (getScore("ERTS") >= 60 && getScore("TND") >= 50) {
    flags.push("Emotion-regulation, numbing, or dissociation-driven sexuality pattern");
  }

  if (getScore("ENS") >= 60 && getScore("RSD") >= 50) {
    flags.push("Escalation / novelty-seeking risk pattern");
  }

  if (getScore("SRD") >= 60 && getScore("VCS") >= 50) {
    flags.push("Secrecy, shame, and relational trust-damage pattern");
  }

  if (getScore("AED") >= 60 || getScore("VIS") >= 60) {
    flags.push("Attachment, validation, or reassurance-driven sexuality pattern");
  }

  if (getScore("FI") >= 60) {
    flags.push("Functional impairment concern");
  }

  if (getScore("RSD") >= 70) {
    flags.push("Elevated sexual-risk and safety-disregard concern");
  }

  if (getScore("HR") >= 70 && flags.length === 0) {
    flags.push("Healthy sexual-regulation pattern with no dominant dysregulation driver detected");
  }

  if (flags.length === 0) {
    flags.push("No dominant dysregulation pattern detected from current responses.");
  }

  return flags;
}

function getTopDomains(
  domainScores: SRRCIDomainScore[],
  domains: SRRCIDomainCode[],
  minimumScore: number,
  limit: number,
): SRRCIDomainScore[] {
  return domainScores
    .filter((score) => domains.includes(score.domain))
    .filter((score) => score.percentScore >= minimumScore)
    .sort((a, b) => b.percentScore - a.percentScore)
    .slice(0, limit);
}

function buildExecutiveSummary(
  globalSeverity: SRRCISeverityLevel,
  totalPercentScore: number,
  regulationStrengthScore: number,
  validityProfile: SRRCIValidityProfile,
  patternFlags: string[],
): string {
  const integrityClause =
    validityProfile.responseIntegrity === "acceptable"
      ? "Response integrity appears acceptable."
      : `Response integrity is ${validityProfile.responseIntegrity}, so results should be interpreted with appropriate caution.`;

  return `SRRCI-X results indicate a ${globalSeverity} overall sexual-regulation concern level (${totalPercentScore}%). Healthy regulation strength is estimated at ${regulationStrengthScore}%. ${integrityClause} Primary pattern indicators: ${patternFlags.join("; ")}.`;
}

function buildClinicalNarrative(
  domainScores: SRRCIDomainScore[],
): SRRCINarrativeSection[] {
  const elevated = getTopDomains(domainScores, SRRCI_CLINICAL_DOMAINS, 55, 5);
  const healthy = domainScores.find((score) => score.domain === "HR");

  const sections: SRRCINarrativeSection[] = [];

  if (elevated.length > 0) {
    sections.push({
      title: "Primary Clinical Regulation Concerns",
      level: elevated[0]?.severity ?? "moderate",
      body: `The most elevated clinical domains are ${elevated
        .map((score) => `${score.label} (${score.percentScore}%)`)
        .join(", ")}. These areas may help explain whether the profile reflects healthy high libido, emotionally driven sexual coping, compulsive repetition, secrecy, impairment, novelty escalation, or attachment/validation-based sexual activation.`,
      recommendations: [
        "Review the highest domains in interview or self-reflection before drawing conclusions.",
        "Separate high desire from dysregulation by looking for impairment, loss of control, secrecy, escalation, distress, or values conflict.",
      ],
    });
  } else {
    sections.push({
      title: "Clinical Regulation Pattern",
      level: "minimal",
      body: "No major clinical dysregulation domain is strongly elevated. This profile is more consistent with lower dysregulation risk, assuming response integrity is adequate.",
      recommendations: [
        "Continue distinguishing healthy desire from behavior that creates impairment, secrecy, or relational damage.",
      ],
    });
  }

  if (healthy) {
    sections.push({
      title: "Healthy Sexual Regulation",
      level: getStrengthLevel(healthy.percentScore),
      body: healthy.narrative,
      recommendations:
        healthy.percentScore >= 70
          ? ["Use these strengths as anchors for relational communication and boundary repair."]
          : [
              "Strengthen regulation by practicing delay, honest communication, boundary clarity, and values-based decision-making.",
            ],
    });
  }

  return sections;
}

function buildCompatibilityNarrative(
  compatibilityProfile: SRRCICompatibilityProfile,
): SRRCINarrativeSection[] {
  const dimensions = compatibilityProfile.dimensionScores ?? [];
  const strongest = [...dimensions]
    .sort((a, b) => b.percentScore - a.percentScore)
    .slice(0, 3);
  const weakest = [...dimensions]
    .sort((a, b) => a.percentScore - b.percentScore)
    .slice(0, 3);

  const sections: SRRCINarrativeSection[] = [
    {
      title: "Compatibility Overview",
      level: getAlignmentFromPercent(
        dimensions.length > 0
          ? dimensions.reduce((total, item) => total + item.percentScore, 0) /
              dimensions.length
          : 0,
      ),
      body: compatibilityProfile.compatibilitySummary,
      recommendations: [
        "Use partner comparison to separate individual preference from true couple mismatch.",
        "Prioritize explicit conversations about frequency, initiation, boundaries, affection, and repair.",
      ],
    },
  ];

  if (strongest.length > 0) {
    sections.push({
      title: "Likely Compatibility Strengths",
      level: "moderate_alignment",
      body: strongest
        .map((score) => `${score.label}: ${score.percentScore}%`)
        .join("; "),
    });
  }

  if (weakest.length > 0) {
    sections.push({
      title: "Likely Compatibility Vulnerabilities",
      level: "mixed_alignment",
      body: weakest
        .map((score) => `${score.label}: ${score.percentScore}%`)
        .join("; "),
      recommendations: [
        "Treat low scores as discussion targets rather than automatic incompatibility.",
        "Look for repair capacity before concluding that a mismatch is fixed or unchangeable.",
      ],
    });
  }

  return sections;
}

function buildGrowthRecommendations(
  domainScores: SRRCIDomainScore[],
  compatibilityProfile: SRRCICompatibilityProfile,
): string[] {
  const recommendations: string[] = [];
  const getScore = (domain: SRRCIDomainCode): number =>
    getDomainPercent(domainScores, domain);

  if (getScore("UDC") >= 55 || getScore("RRI") >= 55) {
    recommendations.push(
      "Develop a written sexual-regulation plan that identifies triggers, early-warning cues, delay strategies, and repair steps after slips.",
    );
  }

  if (getScore("ERTS") >= 55 || getScore("TND") >= 55) {
    recommendations.push(
      "Build non-sexual emotional regulation tools so sexuality is not carrying the entire burden of anxiety, loneliness, shame, or emotional pain.",
    );
  }

  if (getScore("SRD") >= 55) {
    recommendations.push(
      "Reduce relational damage by replacing secrecy with structured honesty, boundaries, accountability, and repair conversations.",
    );
  }

  if (getScore("RSD") >= 55) {
    recommendations.push(
      "Address risk and safety directly by defining non-negotiable limits before sexually charged moments occur.",
    );
  }

  if (compatibilityProfile.sexualCommunicationScore < 50) {
    recommendations.push(
      "Improve sexual communication by using calm, specific, non-accusatory language about desire, limits, preferences, and disappointments.",
    );
  }

  if (compatibilityProfile.relationalResilienceScore < 50) {
    recommendations.push(
      "Strengthen repair capacity so sexual mismatch does not automatically become rejection, resentment, withdrawal, or blame.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Continue using honest communication, consent, emotional attunement, and value-consistent choices to protect healthy sexual functioning.",
    );
  }

  return recommendations;
}

function buildSummary(
  globalSeverity: SRRCISeverityLevel,
  validityProfile: SRRCIValidityProfile,
  patternFlags: string[],
): string {
  const patternText = patternFlags.join("; ");

  if (validityProfile.responseIntegrity === "invalid") {
    return `Results should be interpreted with caution because the response-integrity profile was marked invalid. Apparent severity level: ${globalSeverity}. Pattern indicators: ${patternText}.`;
  }

  if (validityProfile.responseIntegrity === "questionable") {
    return `Results show a ${globalSeverity} overall regulation-concern level, but response-integrity concerns suggest caution. Pattern indicators: ${patternText}.`;
  }

  return `Results show a ${globalSeverity} overall sexual-regulation concern level. Pattern indicators: ${patternText}.`;
}

export function scoreSRRCI(
  profileId: string,
  responses: SRRCIResponse[],
): SRRCIResult {
  const responseMap = getResponseMap(responses);

  const clinicalItems = srrciItems.filter(
    (item) => item.category === "clinical",
  );

  const clinicalScore = scorePercentFromItems(clinicalItems, responseMap);
  const totalRawScore = clinicalScore.rawScore;
  const totalMaxScore = clinicalScore.maxScore;
  const totalPercentScore = clinicalScore.percentScore;
  const globalSeverity = getSeverityFromPercent(totalPercentScore);

  const healthyItems = srrciItems.filter(
    (item) => item.category === "healthy_regulation",
  );

  const healthyScore = scorePercentFromItems(healthyItems, responseMap);
  const regulationStrengthScore = healthyScore.percentScore;
  const regulationConcernScore = totalPercentScore;

  const domainScores = calculateDomainScores(responseMap);
  const validityProfile = calculateValidityProfile(responseMap);
  const compatibilityProfile = calculateCompatibilityProfile(responseMap);
  const patternFlags = getPatternFlags(domainScores);

  const executiveSummary = buildExecutiveSummary(
    globalSeverity,
    totalPercentScore,
    regulationStrengthScore,
    validityProfile,
    patternFlags,
  );

  const clinicalNarrative = buildClinicalNarrative(domainScores);
  const compatibilityNarrative =
    buildCompatibilityNarrative(compatibilityProfile);
  const growthRecommendations = buildGrowthRecommendations(
    domainScores,
    compatibilityProfile,
  );

  return {
    profileId,
    completedAt: new Date().toISOString(),

    totalRawScore,
    totalMaxScore,
    totalPercentScore,
    globalSeverity,

    regulationStrengthScore,
    regulationConcernScore,

    domainScores,
    validityProfile,
    compatibilityProfile,

    patternFlags,
    executiveSummary,
    clinicalNarrative,
    compatibilityNarrative,
    growthRecommendations,
    summary: buildSummary(globalSeverity, validityProfile, patternFlags),
  };
}

export function getSRRCIDomainLabel(domain: SRRCIDomainCode): string {
  return SRRCI_DOMAIN_LABELS[domain];
}
