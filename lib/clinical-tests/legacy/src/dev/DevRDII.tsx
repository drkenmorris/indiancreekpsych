"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/dev/DevRDII.tsx
import { useEffect, useMemo, useState } from "react";

import { RDII_META } from "../assessments/rdii/rdiiMeta";
import { buildItemView } from "../assessments/rdii/rdiiPresentation";
import { rdiiStorageKey } from "../assessments/rdii/rdiiStorage";
import { rdiiItemsFormA } from "../assessments/rdii/rdiiItemsFormA";
import { buildRDIIReport } from "../assessments/rdii/rdiiScoring";

import type { AssessmentResponse, Domain, Likert6 } from "../assessments/rdii/rdiiTypes";

const ALL_DOMAINS: Domain[] = [
  "I_LOVE_INTEGRITY",
  "II_POSITIVE_BONDING",
  "III_NEGATIVE_BONDING",
  "IV_RELATIONAL_DAMAGE_PATTERNS",
  "V_PROCESS",
  "VI_SAFETY_POWER",
  "VII_HOPE_COLLAPSE",
  "VAL_VALIDITY",
];

const FORM: "FORM_A_SELF" = "FORM_A_SELF";
const INSTANCE_ID = "dev";

function Bar({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
      <div style={{ width: `${width}%`, height: 10, borderRadius: 999, background: "#333" }} />
    </div>
  );
}

export default function DevRDII() {
  const [domain, setDomain] = useState<Domain>("I_LOVE_INTEGRITY");
  const [responses, setResponses] = useState<AssessmentResponse>({});

  const storageKey = rdiiStorageKey(INSTANCE_ID, FORM);

  useEffect(() => {
    const raw = clinicalSessionStore.getItem(storageKey);
    if (!raw) return;
    try {
      setResponses(JSON.parse(raw) as AssessmentResponse);
    } catch {
      // ignore malformed cache
    }
  }, [storageKey]);

  useEffect(() => {
    clinicalSessionStore.setItem(storageKey, JSON.stringify(responses));
  }, [storageKey, responses]);

  const viewItems = useMemo(() => buildItemView(rdiiItemsFormA, "DEV_BY_DOMAIN", { domain }), [domain]);

  const report = useMemo(() => buildRDIIReport(rdiiItemsFormA, responses, { domain }), [responses, domain]);

  const sortedSubscales = useMemo(() => {
    return Object.entries(report.subscales)
      .slice()
      .sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [report.subscales]);

  function setAnswer(itemId: number, v: Likert6) {
    setResponses((prev) => ({ ...prev, [itemId]: v }));
  }

  function clearAll() {
    clinicalSessionStore.removeItem(storageKey);
    setResponses({});
  }

  function clearDomain() {
    setResponses((prev) => {
      const next: AssessmentResponse = { ...prev };
      for (const it of viewItems) delete next[it.id];
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ marginTop: 0 }}>{RDII_META.instrument} — Dev (By Domain)</h2>

      <div style={{ opacity: 0.85, marginBottom: 10 }}>
        <div>
          <strong>{RDII_META.scale.prompt}</strong>
        </div>
        <ul style={{ marginTop: 6 }}>
          {RDII_META.scale.anchors.map((a: string) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <label>
          Domain:&nbsp;
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
            {ALL_DOMAINS.map((d: Domain) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={clearDomain}>
          Clear this domain
        </button>

        <button type="button" onClick={clearAll}>
          Clear all (dev)
        </button>
      </div>

      {viewItems.length === 0 ? (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          No items found for this domain yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            {viewItems.map((it) => (
              <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  #{it.id} • {it.subscale} {it.reverse ? "(reverse)" : ""}
                </div>

                <div style={{ marginTop: 6 }}>{it.text}</div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5, 6].map((n: number) => (
                    <label key={n} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`rdii-${it.id}`}
                        checked={responses[it.id] === n}
                        onChange={() => setAnswer(it.id, n as Likert6)}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 800 }}>Live domain snapshot</div>

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

            {report.summary && <div style={{ fontSize: 12, color: "#444" }}>{report.summary}</div>}

            <div style={{ fontWeight: 700 }}>Subscales in this domain</div>

            <div style={{ display: "grid", gap: 10 }}>
              {sortedSubscales.map(([key, s]) => (
                <div key={key} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {Number.isFinite(s.score) ? s.score.toFixed(0) : "—"} / 100
                    </div>
                  </div>
                  <Bar pct={Number.isFinite(s.score) ? s.score : 0} />
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {s.band} • T≈{Number.isFinite(s.t) ? s.t.toFixed(0) : "—"} • {s.answered}/{s.total}
                  </div>
                  <div style={{ fontSize: 12, color: "#444" }}>{s.narrative}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
