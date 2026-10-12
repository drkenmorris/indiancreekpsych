"use client";
// src/selfesteem/CseqResults.tsx
import React, { useMemo, useState } from "react";
import { scoreCseq, type CseqReport, type CseqScaleScore, type CseqResponse } from "./cseqScoring";

function pctLabel(pct: number | null) {
  return pct == null ? "—" : `${pct}%`;
}

function bandColor(band: string) {
  // keep simple; no hard-coded colors required, but we do need basic contrast
  // (using neutral grays; you can style later)
  if (band === "Healthy") return "#111827";
  if (band === "Mixed") return "#374151";
  if (band === "Low") return "#6b7280";
  return "#9ca3af";
}

function BarRow({ s }: { s: CseqScaleScore }) {
  const pct = s.pct0to100 ?? 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 70px", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 14 }}>
        <div style={{ fontWeight: 700 }}>{s.label}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {s.nAnswered}/{s.nItems} answered • {s.band}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 999, height: 14, overflow: "hidden", background: "#f9fafb" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#111827", opacity: 0.85 }} />
      </div>

      <div style={{ textAlign: "right", fontWeight: 700, color: bandColor(s.band) }}>{pctLabel(s.pct0to100)}</div>
    </div>
  );
}

function scaleNarrative(id: string, band: CseqScaleScore["band"]) {
  // v1: concise behavior-based narratives
  const low = "Often shows up as inconsistent follow-through, self-doubt under stress, and reliance on external cues for worth or safety.";
  const mixed = "Often shows up as situational strength—stable in supportive contexts, but inconsistent under conflict, fatigue, or evaluation.";
  const healthy = "Often shows up as calm self-trust, stable functioning under pressure, and flexible self-correction without shame collapse.";

  const table: Record<string, { title: string; low: string; mixed: string; healthy: string }> = {
    CORE_WORTH: {
      title: "Intrinsic Self-Worth",
      low: "Worth feels conditional; setbacks, criticism, or not being useful can trigger collapse, shame, or withdrawal.",
      mixed: "Worth is present but fluctuates; tends to dip when productivity drops or relationships feel unstable.",
      healthy: "Worth feels stable; mistakes and low-output days don’t threaten identity or dignity.",
    },
    CORE_ACCEPT: {
      title: "Self-Acceptance & Compassion",
      low: "Inner voice is harsh; mistakes lead to self-attack, rumination, or avoidance rather than learning.",
      mixed: "Can be kind to self sometimes, but slips into self-judgment under fatigue or failure.",
      healthy: "Can self-correct firmly without cruelty; holds flaws and strengths without distortion.",
    },
    CORE_CONF: {
      title: "Self-Confidence",
      low: "Avoids challenges; needs reassurance; uncertainty feels threatening or paralyzing.",
      mixed: "Capable in familiar areas; confidence drops with novel tasks or social evaluation.",
      healthy: "Approaches problems with learning mindset; tolerates uncertainty and recovers after failure.",
    },
    CORE_BOUND: {
      title: "Self-Respect & Boundaries",
      low: "Says yes when meaning no; over-explains; tolerates disrespect to avoid conflict or rejection.",
      mixed: "Can set boundaries but may feel guilt, over-justify, or revert under pressure.",
      healthy: "Can say no cleanly; protects time/energy; tolerates others’ disappointment without self-betrayal.",
    },
    CORE_AGENCY: {
      title: "Agency & Self-Efficacy",
      low: "Feels stuck; waits for circumstances to change; may resign or self-blame globally.",
      mixed: "Can take action but inconsistent; motivation-dependent; setbacks slow momentum.",
      healthy: "Finds options; takes small steps; adjusts strategy without identity collapse.",
    },
    CORE_VALID: {
      title: "Internal Validation",
      low: "Mood and self-view track others’ reactions; fear of disapproval drives choices.",
      mixed: "Sometimes stable, but approval still has outsized impact in key relationships or performance contexts.",
      healthy: "Approves of self internally; can be misunderstood or disliked without panic or over-fixing.",
    },
    CORE_REPAIR: {
      title: "Shame Resilience & Repair",
      low: "Shame leads to hiding, defensiveness, blame, or avoidance; apology feels annihilating.",
      mixed: "Can repair sometimes but may freeze or over-defend when feeling exposed.",
      healthy: "Separates behavior from identity; can apologize, repair, and self-forgive after amends.",
    },
    CORE_RECEIVE: {
      title: "Receiving & Reciprocity",
      low: "Difficulty receiving help; feels weak/indebted; over-functions to avoid needing anyone.",
      mixed: "Can receive in small doses; discomfort rises with dependency or sustained support.",
      healthy: "Accepts help without debt-tracking; shares burdens early; allows care without shame.",
    },
    CORE_REST: {
      title: "Rest, Deservedness & Meaning",
      low: "Rest triggers guilt; joy must be earned; meaning collapses without achievement.",
      mixed: "Can rest sometimes but productivity still governs self-respect in busy seasons.",
      healthy: "Rest is legitimate; joy is allowed; meaning remains beyond output and performance.",
    },

    DET_CONTINGENT: {
      title: "Contingent Worth / Approval Dependence (Protective Display)",
      low: low,
      mixed: mixed,
      healthy: healthy,
    },
    DET_PERF: {
      title: "Perfectionism / Failure Collapse (Protective Display)",
      low: low,
      mixed: mixed,
      healthy: healthy,
    },
    DET_COMPARE: {
      title: "Comparison / Helplessness / Self-Betrayal (Protective Display)",
      low: low,
      mixed: mixed,
      healthy: healthy,
    },

    COR_MORAL: {
      title: "Moral Repair Capacity",
      low: "Moral mistakes feel permanently staining; shame blocks accountability and restoration.",
      mixed: "Can repair sometimes, but may oscillate between self-condemnation and avoidance.",
      healthy: "Holds accountability and dignity together; makes amends without identity collapse.",
    },
    COR_BODY: {
      title: "Body-Based Worth",
      low: "Physical limitation or aging threatens worth; body becomes a source of shame or self-attack.",
      mixed: "Some acceptance, but discouragement rises when health/performance drops.",
      healthy: "Body deserves care; limitations don’t reduce dignity; self-respect remains intact.",
    },
    COR_STABLE: {
      title: "Worth Stability Under Stress",
      low: "Self-esteem collapses during prolonged stress; functioning becomes threat-sensitive.",
      mixed: "Stability varies; strong in calm seasons, more fragile in crisis or conflict.",
      healthy: "Worth stays continuous even during disruption; recovers after setbacks.",
    },
    COR_ENVY: {
      title: "Envy/Resentment Resilience",
      low: "Others’ success feels threatening; resentment or moral superiority may protect self-worth.",
      mixed: "Can celebrate others sometimes; envy spikes in sensitive domains.",
      healthy: "Can appreciate others’ wins without being diminished; envy is noticed without justification.",
    },
  };

  const row = table[id];
  if (!row) return band === "Low" ? low : band === "Healthy" ? healthy : mixed;

  if (band === "Low") return row.low;
  if (band === "Healthy") return row.healthy;
  if (band === "Mixed") return row.mixed;
  return "Not enough data to interpret this scale.";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function CseqResults(props: { response: CseqResponse }) {
  const [showJson, setShowJson] = useState(false);

  const report: CseqReport = useMemo(() => scoreCseq(props.response), [props.response]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>CSEQ Results (v1)</h2>

      <Section title="Composite Summary">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, minWidth: 240 }}>
            <div style={{ fontWeight: 700 }}>Global Indicator</div>
            <div style={{ marginTop: 6 }}>
              Mean (0–3): <b>{report.composite.globalMean0to3 ?? "—"}</b>
            </div>
            <div>
              Percent: <b>{report.composite.globalPct ?? "—"}%</b>
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, flex: 1, minWidth: 320 }}>
            <div style={{ fontWeight: 700 }}>Outcome Profile</div>
            <div style={{ marginTop: 6, fontSize: 15 }}>
              <b>{report.profile.name}</b>
            </div>
            <div style={{ marginTop: 6, lineHeight: 1.35 }}>{report.profile.summary}</div>

            {(report.profile.strengths?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Strength signals</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {report.profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {(report.profile.risks?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Risk signals</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {report.profile.risks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Validity & Response Quality">
        {report.validity.flags.length === 0 ? (
          <div>No validity flags triggered (v1 heuristics).</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {report.validity.flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
          (v1 validity is conservative and heuristic; we’ll refine thresholds after pilot data.)
        </div>
      </Section>

      <Section title="Core Self-Esteem Components (Builders)">
        {report.scales.map((s) => (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <BarRow s={s} />
            <div style={{ marginLeft: 2, fontSize: 14, lineHeight: 1.35, opacity: 0.95 }}>
              {scaleNarrative(s.id, s.band)}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Contributors / Corollaries">
        {report.contributors.map((s) => (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <BarRow s={s} />
            <div style={{ marginLeft: 2, fontSize: 14, lineHeight: 1.35, opacity: 0.95 }}>
              {scaleNarrative(s.id, s.band)}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Detractors (Protective Display)">
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
          These bars are displayed as <b>protective strength</b> (higher = fewer detractor pressures). Raw detractor scoring can be added later.
        </div>

        {report.detractors.map((s) => (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <BarRow s={s} />
            <div style={{ marginLeft: 2, fontSize: 14, lineHeight: 1.35, opacity: 0.95 }}>
              {scaleNarrative(s.id, s.band)}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Full Composite Narrative (v1)">
        <div style={{ lineHeight: 1.45 }}>
          <p style={{ marginTop: 0 }}>
            The CSEQ integrates intrinsic worth beliefs with behavioral supports (boundaries, repair capacity, receiving, and rest tolerance) and
            vulnerability pressures (contingency, perfectionism, comparison threat). Your results suggest the dominant pattern is{" "}
            <b>{report.profile.name}</b>.
          </p>
          <p>
            In practical terms, the highest-scoring supports tend to show up as repeatable strengths in daily functioning, while the lowest supports
            identify the “weak link” where self-esteem is most likely to destabilize under stress, conflict, or evaluation. Detractors indicate
            whether self-worth is being “earned” through approval, performance, or comparison, which often produces oscillation (good days vs bad days)
            rather than stable confidence.
          </p>
          <p style={{ marginBottom: 0 }}>
            If you want the most efficient growth path, strengthen the lowest two core supports, and reduce the strongest detractor pressure. That
            combination usually produces the biggest improvement in stability.
          </p>
        </div>
      </Section>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => setShowJson((v) => !v)}>{showJson ? "Hide JSON" : "Show JSON"}</button>
      </div>

      {showJson && (
        <div style={{ marginTop: 10 }}>
          <textarea
            readOnly
            value={JSON.stringify(report, null, 2)}
            style={{ width: "100%", height: 320, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          />
        </div>
      )}
    </div>
  );
}
