"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/selfesteem/CSEQResultsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import CseqResults from "./CseqResults";

type ForcedChoiceAnswer = "A" | "B";
type LikertValue = 0 | 1 | 2 | 3;

type SavedCseqPayload = {
  version?: string;
  createdAtISO?: string;
  respondent?: {
    studentId?: string;
    name?: string;
  };
  likert?: Record<number, LikertValue>;
  forcedChoice?: Record<string, ForcedChoiceAnswer>;
  meta?: any;
};

const STORAGE_KEYS = [
  "asq:cseq:v1",
  "asq:selfEsteem:v1",
];

function safeParse<T>(raw: string | null): T | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  if (raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadLatestPayload(): SavedCseqPayload | null {
  for (const key of STORAGE_KEYS) {
    const parsed = safeParse<SavedCseqPayload>(clinicalSessionStore.getItem(key));
    if (parsed?.likert && Object.keys(parsed.likert).length > 0) return parsed;
  }
  return null;
}

export default function CSEQResultsPage() {
  const navigate = useNavigate();
  const [nonce, setNonce] = useState(0);

  const payload = useMemo(() => {
    void nonce;
    return loadLatestPayload();
  }, [nonce]);

  const response = useMemo(() => {
    return {
      likert: payload?.likert ?? {},
      forcedChoice: payload?.forcedChoice ?? {},
    };
  }, [payload]);

  function clearSaved() {
    if (!confirm("Clear saved CSEQ responses/results from this browser?")) return;
    for (const key of STORAGE_KEYS) {
      try {
        clinicalSessionStore.removeItem(key);
      } catch {
        // ignore
      }
    }
    setNonce((n) => n + 1);
  }

  if (!payload) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>CSEQ Results</h2>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>No saved CSEQ results found</div>
          <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
            This page reads saved CSEQ responses from this device’s local storage. If you haven’t taken the CSEQ on
            this device (or storage was cleared), there won’t be results to show.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/cseq")}>
              Take CSEQ Now
            </button>
            <button type="button" onClick={() => navigate("/")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const createdAt = payload.createdAtISO ? new Date(payload.createdAtISO).toLocaleString() : "—";
  const name = payload.respondent?.name ?? "—";
  const studentId = payload.respondent?.studentId ?? "—";

  return (
    <div style={{ maxWidth: 1020, margin: "0 auto" }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>CSEQ Results</h2>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Student: <b>{name}</b> • ID: <b>{studentId}</b> • Saved: <b>{createdAt}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/cseq")}>
              Take / Edit CSEQ
            </button>
            <button type="button" onClick={clearSaved}>
              Clear Saved CSEQ
            </button>
            <button type="button" onClick={() => navigate("/")}>
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <CseqResults response={response} />
    </div>
  );
}
