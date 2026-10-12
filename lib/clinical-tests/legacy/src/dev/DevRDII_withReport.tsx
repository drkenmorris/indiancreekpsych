"use client";
// src/dev/DevRDII_withReport.tsx
import { useMemo, useState } from "react";

import type { Domain, Likert6, AssessmentResponse, AssessmentItem } from "../assessments/rdii/rdiiTypes";
import { rdiiItemsFormA } from "../assessments/rdii/rdiiItemsFormA";
import { buildRDIIReport } from "../assessments/rdii/rdiiScoring";
import type { SubscaleReport } from "../assessments/rdii/rdiiScoring";

const DOMAINS: Array<{ id: Domain; label: string }> = [
  { id: "I_LOVE_INTEGRITY", label: "Domain I — Love Integrity" },
  { id: "II_POSITIVE_BONDING", label: "Domain II — Positive Bonding" },
  { id: "III_NEGATIVE_BONDING", label: "Domain III — Negative Bonding" },
  { id: "IV_RELATIONAL_DAMAGE_PATTERNS", label: "Domain IV — Relational Damage Patterns" },
  { id: "V_PROCESS", label: "Domain V — Process" },
  { id: "VI_SAFETY_POWER", label: "Domain VI — Safety & Power" },
  { id: "VII_HOPE_COLLAPSE", label: "Domain VII — Hope & Entrapment" },
  { id: "VAL_VALIDITY", label: "Validity" },
];

const LIKERT: Array<{ value: Likert6; label: string }> = [
  { value: 1, label: "Never / Strongly Disagree" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Very Often" },
  { value: 6, label: "Always / Strongly Agree" },
];

function Bar({ pct, caption }: { pct: number; caption: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
        <div style={{ width: `${width}%`, height: 10, borderRadius: 999, background: "#333" }} />
      </div>
      <div style={{ fontSize: 12, color: "#555" }}>{caption}</div>
    </div>
  );
}

export default function DevRDIIWithReport() {
  const [domain, setDomain] = useState<Domain>("I_LOVE_INTEGRITY");
  const [responses, setResponses] = useState<AssessmentResponse>({});

  const items = useMemo(
    () => rdiiItemsFormA.filter((it: AssessmentItem) => it.domain === domain),
    [domain]
  );

  const report = useMemo(
    () => buildRDIIReport(rdiiItemsFormA, responses, { domain }),
    [responses, domain]
  );

  function setResponse(id: number, value: Likert6) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  function clearDomain() {
    setResponses((prev) => {
      const next: AssessmentResponse = { ...prev };
      for (const it of items) delete next[it.id];
      return next;
    });
  }

  const subscaleEntries = useMemo(() => {
    // Make Object.entries strongly typed so TS doesn't treat values as unknown.
    return Object.entries(report.subscales) as Array<[string, SubscaleReport]>;
  }, [report.subscales]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>RDII Dev Playground (Report)</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 14 }}>Domain:</label>
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)} style={{ padding: 8 }}>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          <button onClick={clearDomain} style={{ padding: "8px 10px" }}>
            Clear domain
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it: AssessmentItem) => (
            <div key={it.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                #{it.id} • {it.subscale} {it.reverse ? "(reverse)" : ""}
              </div>

              <div style={{ fontSize: 15, marginTop: 6 }}>{it.text}</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {LIKERT.map((opt) => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <input
                      type="radio"
                      name={`q_${it.id}`}
                      checked={responses[it.id] === opt.value}
                      onChange={() => setResponse(it.id, opt.value)}
                    />
                    {opt.value}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Domain snapshot</div>

          <div style={{ fontSize: 13, color: "#555" }}>
            Answered {report.answeredItems} / {report.totalItems}
          </div>

          {report.validityFlags.length > 0 && (
            <div style={{ border: "1px solid #cc0077", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700 }}>Validity flags</div>
              <ul style={{ margin: "8px 0 0 18px" }}>
                {report.validityFlags.map((f: string, idx: number) => (
                  <li key={idx} style={{ fontSize: 13 }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ fontWeight: 700 }}>Subscale bars</div>

          <div style={{ display: "grid", gap: 10 }}>
            {subscaleEntries.map(([key, s]) => (
              <div key={key} style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {Number.isFinite(s.score) ? s.score.toFixed(0) : "—"} / 100
                  </div>
                </div>
                <Bar
                  pct={Number.isFinite(s.score) ? s.score : 0}
                  caption={`${s.band} • T≈${Number.isFinite(s.t) ? s.t.toFixed(0) : "—"}`}
                />
                <div style={{ fontSize: 12, color: "#444" }}>{s.narrative}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
