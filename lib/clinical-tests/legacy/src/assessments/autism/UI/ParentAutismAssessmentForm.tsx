"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/assessments/autism/UI/ParentAutismAssessmentForm.tsx

import React, { useEffect, useMemo, useState } from "react";
import { AUTISM_PARENT_ITEM_BANK } from "../items/autismItemsParent";

type AutismItemDomain =
  (typeof AUTISM_PARENT_ITEM_BANK.items)[number]["domain"];

type AutismResponseOptionId = (typeof AUTISM_PARENT_ITEM_BANK.responseOptions)[number]["id"];


// Infer option id type from exported AutismResponseOption

import { scoreAutismAssessment, type AutismRawResponseMap } from "../engine/autismScoring";

import { getCurrentStudentId } from "../../../asq/studentStore";
import type { InformantProfile } from "../../../asq/narrativeEngine";

type ViewMode = "FORM" | "RESULTS";

// Infer the report type directly from the scoring function to avoid export/type drift.
type AutismScoreReport = ReturnType<typeof scoreAutismAssessment>;
type DomainRow = AutismScoreReport["domains"][number];
// 'composites' may not be present on all scoring outputs, infer element type safely.
type CompositeRow = AutismScoreReport extends { composites: Array<infer U> } ? U : never;

function prettyDomainLabel(domain: AutismItemDomain): string {
  const s = String(domain);
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ParentAutismAssessmentForm({
  childName,
  onScoreComplete,
}: {
  childName?: string;
  onScoreComplete?: (r: AutismScoreReport) => void;
}) {
  const [view, setView] = useState<ViewMode>("FORM");
  const [activeDomain, setActiveDomain] = useState<AutismItemDomain | "ALL">("ALL");
  const [responses, setResponses] = useState<AutismRawResponseMap>({});
  const [report, setReport] = useState<AutismScoreReport | null>(null);
  const legacyResponseKey = "asq_legacy_parent_responses_v1";
  useEffect(() => {
    const saved = clinicalSessionStore.getItem(legacyResponseKey);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setResponses(parsed as AutismRawResponseMap);
        }
      } catch { /* Invalid synthetic test draft. */ }
    }
  }, []);
  useEffect(() => {
    clinicalSessionStore.setItem(legacyResponseKey, JSON.stringify(responses));
  }, [responses]);

  const itemsByDomain = useMemo(() => {
    const map = new Map<AutismItemDomain, typeof AUTISM_PARENT_ITEM_BANK.items>();
    for (const it of AUTISM_PARENT_ITEM_BANK.items) {
      const arr = map.get(it.domain) ?? [];
      arr.push(it);
      map.set(it.domain, arr);
    }
    return map;
  }, []);

  const domainList = useMemo(() => {
    const present = new Set<AutismItemDomain>();
    for (const it of AUTISM_PARENT_ITEM_BANK.items) present.add(it.domain);
    return Array.from(present.values()).sort((a, b) => String(a).localeCompare(String(b)));
  }, []);

  const visibleItems = useMemo(() => {
    if (activeDomain === "ALL") return AUTISM_PARENT_ITEM_BANK.items;
    return itemsByDomain.get(activeDomain) ?? [];
  }, [activeDomain, itemsByDomain]);

  const roleOptions = AUTISM_PARENT_ITEM_BANK.responseOptions;

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const it of AUTISM_PARENT_ITEM_BANK.items) {
      if (responses[it.id] !== undefined) n += 1;
    }
    return n;
  }, [responses]);

  const totalCount = AUTISM_PARENT_ITEM_BANK.items.length;

  const handleResponseChange = (itemId: string, optionId: AutismResponseOptionId) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: optionId,
    }));
  };

  const handleScore = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const sid = getCurrentStudentId();
    if (!sid) {
      alert("Select/Create a student first (ASQ → Results / Comparison), then score again.");
      return;
    }

    // ✅ Use unified engine function (call with bank and responses)
    const r = scoreAutismAssessment(AUTISM_PARENT_ITEM_BANK, responses);

    setReport(r);
    clinicalSessionStore.setItem(`asq_legacy_parent_scores_${sid}_v1`, JSON.stringify(r));
    setView("RESULTS");

    // Convert scoring output into the InformantProfile format Results/Comparison expects.
    const normalizeDomainLabelForCombined = (label: string): string => {
      const s = label.toLowerCase();
      if (s.includes("social")) return "Social";
      if (s.includes("commun")) return "Communication";
      if (s.includes("restrict") || s.includes("repetit") || s.includes("rrb")) return "RRB";
      if (s.includes("sensor")) return "Sensory";
      if (s.includes("emotion") || s.includes("regulat")) return "Regulation";
      if (s.includes("execut")) return "Executive";
      if (s.includes("class") || s.includes("school")) return "Classroom";
      if (s.includes("strength")) return "Strengths";
      return label;
    };

    const parentProfile: InformantProfile = {
      informant: "Parent",
      answeredCount: (r as any).completedItemCount ?? 0,
      totalCount: (r as any).totalItemCount ?? 0,
      domains: Array.isArray((r as any).domains)
        ? (r as any).domains
            .map((d: any) => {
              const answered = typeof d.completedItemCount === "number" ? d.completedItemCount : 0;
              const raw = typeof d.rawScore === "number" ? d.rawScore : 0;
              const mean = answered > 0 ? raw / answered : null;

              const label =
                typeof d.label === "string"
                  ? d.label
                  : typeof d.domain === "string"
                  ? d.domain
                  : "Domain";

              return {
                domain: normalizeDomainLabelForCombined(label),
                answeredCount: answered,
                mean,
              };
            })
            .filter((x: any) => typeof x.domain === "string")
        : [],
    };

    clinicalSessionStore.setItem(`asq_profile_parent_${sid}_v1`, JSON.stringify(parentProfile));
    window.dispatchEvent(new Event("asq_profiles_updated"));

    onScoreComplete?.(r);
  };

  const handleBackToForm = () => setView("FORM");

  const handleClear = () => {
    setResponses({});
    clinicalSessionStore.removeItem(legacyResponseKey);
    setReport(null);
    setView("FORM");

    const sid = getCurrentStudentId();
    if (sid) {
      clinicalSessionStore.removeItem(`asq_profile_parent_${sid}_v1`);
      window.dispatchEvent(new Event("asq_profiles_updated"));
    }
  };

  return (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        padding: "1rem",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Parent ASQ Form</h2>
          <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8rem", color: "#4b5563" }}>
            {childName
              ? `This form lets you describe how ${childName} behaves across settings from a parent / caregiver view.`
              : "This form lets you describe how your child behaves across settings from a parent / caregiver view."}
          </p>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            padding: "0.2rem 0.5rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            fontSize: "0.75rem",
            backgroundColor: "#f9fafb",
          }}
        >
          Answered <strong>{answeredCount}</strong> / {totalCount}
        </div>
      </div>

      {view === "FORM" && (
        <form onSubmit={handleScore}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setActiveDomain("ALL")}
              style={{
                padding: "0.25rem 0.6rem",
                borderRadius: "999px",
                border: activeDomain === "ALL" ? "1px solid #4f46e5" : "1px solid #d1d5db",
                backgroundColor: activeDomain === "ALL" ? "#eef2ff" : "#ffffff",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              All
            </button>

            {domainList.map((d) => (
              <button
                key={String(d)}
                type="button"
                onClick={() => setActiveDomain(d)}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: activeDomain === d ? "1px solid #4f46e5" : "1px solid #d1d5db",
                  backgroundColor: activeDomain === d ? "#eef2ff" : "#ffffff",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {prettyDomainLabel(d)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {visibleItems.map((item) => {
              const selectedOption = responses[item.id];
              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    padding: "0.8rem",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.prompt}</div>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    {prettyDomainLabel(item.domain)}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                    {roleOptions.map((opt) => {
                      const optId = String(opt.id) as unknown as AutismResponseOptionId;
                      const checked = selectedOption === optId;

                      return (
                        <label
                          key={String(opt.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.2rem 0.45rem",
                            borderRadius: "999px",
                            border: checked ? "1px solid #4f46e5" : "1px solid #d1d5db",
                            backgroundColor: checked ? "#eef2ff" : "#ffffff",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          <input
                            type="radio"
                            name={item.id}
                            value={String(opt.id)}
                            checked={checked}
                            onChange={() => handleResponseChange(item.id, optId)}
                            style={{ width: "0.8rem", height: "0.8rem" }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {visibleItems.length === 0 && <div style={{ opacity: 0.7 }}>No items in this domain.</div>}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button type="submit" disabled={answeredCount === 0}>
              Score Parent (save for combined report)
            </button>
            <button type="button" onClick={handleClear} style={{ opacity: 0.9 }}>
              Clear
            </button>
          </div>
        </form>
      )}

      {view === "RESULTS" && report && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>Parent Results</div>
              <p style={{ margin: 0, marginTop: "0.2rem", fontSize: "0.75rem", color: "#4b5563" }}>
                Based on {(report as any).completedItemCount} of {(report as any).totalItemCount} items answered.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBackToForm}
              style={{
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Back to questions
            </button>
          </div>

          {/* Composite tiles */}
          {Array.isArray((report as any).composites) && (report as any).composites.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  (report as any).composites.length > 1 ? "repeat(auto-fit, minmax(180px, 1fr))" : "1fr",
                gap: "0.6rem",
              }}
            >
              {(report as any).composites.map((comp: CompositeRow) => (
                <div
                  key={String((comp as any).id)}
                  style={{
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    padding: "0.6rem 0.7rem",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{(comp as any).label}</div>
                  <div style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>
                    <strong>
                      {(comp as any).rawScore?.toFixed?.(1)} / {(comp as any).maxScore?.toFixed?.(1)}
                    </strong>{" "}
                    ({(comp as any).percentOfMax?.toFixed?.(0)}% of possible)
                  </div>
                  <div style={{ fontSize: "0.75rem" }}>
                    Severity band: <strong>{(comp as any).severity?.label ?? "—"}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Domains */}
          <div style={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "0.75rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Domains</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.8fr 0.7fr 1fr",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ fontWeight: 700, opacity: 0.7 }}>Domain</div>
              <div style={{ fontWeight: 700, opacity: 0.7 }}>Score</div>
              <div style={{ fontWeight: 700, opacity: 0.7 }}>Completed</div>
              <div style={{ fontWeight: 700, opacity: 0.7 }}>Notes</div>

              {(report as any).domains?.map?.((d: DomainRow) => (
                <React.Fragment key={String((d as any).domain ?? (d as any).label)}>
                  <div>{(d as any).label}</div>
                  <div>
                    {(d as any).rawScore?.toFixed?.(1)} / {(d as any).maxScore?.toFixed?.(1)} (
                    {(d as any).percentOfMax?.toFixed?.(0)}%)
                  </div>
                  <div>
                    {(d as any).completedItemCount} / {(d as any).totalItemCount}
                  </div>
                  <div>
                    {(d as any).completedItemCount === 0
                      ? "No items answered in this domain yet."
                      : (d as any).completedItemCount < (d as any).totalItemCount
                      ? "Partial data—interpret cautiously."
                      : "Based on all items in this domain."}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}