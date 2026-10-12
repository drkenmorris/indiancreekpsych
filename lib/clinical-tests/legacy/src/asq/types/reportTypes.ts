// src/asq/types/reportTypes.ts

export type InformantId = "Student" | "Parent" | "Teacher";

export type SeverityBand = "none" | "mild" | "moderate" | "marked";
export type ConfidenceBand = "high" | "moderate" | "guarded";

export type ValiditySummary = {
  confidence: ConfidenceBand;
  flags: string[];          // human-readable reasons
  notes?: string;           // optional extra context
};

export type FacetResult = {
  facetId: string;          // we’ll tighten this to a FacetId union shortly
  label: string;
  mean: number | null;      // null allowed if unanswered
  answeredCount: number;
  severity: SeverityBand;
};

export type DomainResult = {
  domainId: string;
  label: string;
  mean: number | null;
  answeredCount: number;
};

export type InformantReport = {
  informant: InformantId;
  totalCount: number;
  answeredCount: number;
  validity: ValiditySummary;
  domains: DomainResult[];
  facets: FacetResult[];
};
