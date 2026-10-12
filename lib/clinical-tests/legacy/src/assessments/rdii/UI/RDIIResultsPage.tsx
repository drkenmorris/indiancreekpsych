"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/assessments/rdii/UI/RDIIResultsPage.tsx
import { useEffect, useMemo, useState } from "react";

import { RDII_META } from "../rdiiMeta";
import { rdiiItemsFormA } from "../rdiiItemsFormA";
import { rdiiStorageKey } from "../rdiiStorage";
import type { IndexResult } from "../rdiiScoring";
import { buildRDIIReport } from "../rdiiScoring";

import type { AssessmentResponse, FormType } from "../rdiiTypes";

const DEFAULT_INSTANCE_ID = "dev";
const DEFAULT_FORM: FormType = "FORM_A_SELF";

function Bar({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 10, background: "#eee", borderRadius: 999 }}>
      <div style={{ width: `${width}%`, height: 10, borderRadius: 999, background: "#333" }} />
    </div>
  );
}

export default function RDIIResultsPage() {
  const [instanceId] = useState<string>(DEFAULT_INSTANCE_ID);
  const [form] = useState<FormType>(DEFAULT_FORM);
  const [responses, setResponses] = useState<AssessmentResponse>({});

  const storageKey = useMemo(() => rdiiStorageKey(instanceId, form), [instanceId, form]);

  useEffect(() => {
    const raw = clinicalSessionStore.getItem(storageKey);
    if (!raw) {
      setResponses({});
      return;
    }
    try {
      setResponses(JSON.parse(raw) as AssessmentResponse);
    } catch {
      setResponses({});
    }
  }, [storageKey]);

  const report = useMemo(() => buildRDIIReport(rdiiItemsFormA, responses), [responses]);

  const sortedSubscales = useMemo(() => {
    return Object.entries(report.subscales)
      .slice()
      .sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [report.subscales]);

  function clear() {
    clinicalSessionStore.removeItem(storageKey);
    setResponses({});
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{RDII_META.instrument} — Results</h2>
        <div style={{ opacity: 0.75 }}>({form} • instance: {instanceId})</div>
        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={clear} style={{ padding: "8px 10px" }}>
            Clear stored responses
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Completion</div>
          <div style={{ fontSize: 13, color: "#555" }}>
            Answered {report.answeredItems} / {report.totalItems}
          </div>
        </div>

        {report.validityFlags.length > 0 && (
          <div style={{ border: "1px solid #cc0077", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 700 }}>Validity flags</div>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {report.validityFlags.map((f, idx) => (
                <li key={idx} style={{ fontSize: 13 }}>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.summary && <div style={{ fontSize: 13, color: "#444" }}>{report.summary}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {(Object.values(report.indices ?? {}) as IndexResult[]).map((idx) => (
          <div key={idx.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{idx.title}</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                {Number.isFinite(idx.score) ? idx.score.toFixed(0) : "—"} / 100
              </div>
            </div>
            <Bar pct={Number.isFinite(idx.score) ? idx.score : 0} />
            <div style={{ fontSize: 12, color: "#666" }}>{idx.band} • T≈{Number.isFinite(idx.t) ? idx.t.toFixed(0) : "—"}</div>
            <div style={{ fontSize: 12, color: "#444" }}>{idx.narrative}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>Subscales</div>

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
              <div style={{ fontSize: 12, color: "#666" }}>{s.band} • T≈{Number.isFinite(s.t) ? s.t.toFixed(0) : "—"}</div>
              <div style={{ fontSize: 12, color: "#444" }}>{s.narrative}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Notes: RDII scoring is currently criterion-referenced (0–100) with a simple T-like transformation; norms can be layered later.
      </div>
    </div>
  );
}
