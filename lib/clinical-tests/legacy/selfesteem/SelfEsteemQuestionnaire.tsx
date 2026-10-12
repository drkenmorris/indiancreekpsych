"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/selfesteem/SelfEsteemQuestionnaire.tsx
import { useEffect, useMemo, useState } from "react";
import {
  SELF_ESTEEM_LIKERT_ITEMS,
  SELF_ESTEEM_FORCED_CHOICE,
  type LikertValue,
} from "./selfEsteemItemBank";

type ForcedChoiceAnswer = "A" | "B";

export type SelfEsteemResponsePayload = {
  version: string;
  createdAtISO: string;
  respondent: {
    studentId?: string;
    name?: string;
  };
  likert: Record<number, LikertValue>;
  forcedChoice: Record<string, ForcedChoiceAnswer>;
  meta: {
    percentCompleteLikert: number;
    percentCompleteForcedChoice: number;
    validityFlags: string[];
    quickScores: {
      likertMean0to3: number | null;
      likertMeanPct: number | null; // 0..100
    };
  };
};

const STORAGE_KEY = "asq:cseq:v1";

// Basic “validity” groups (simple v1).
const LIE_IDS = new Set<number>([91, 92, 93, 94, 95, 96]);
const FAKING_BAD_IDS = new Set<number>([97, 98, 99, 100, 101, 102]);
const INFREQUENCY_IDS = new Set<number>([103, 104, 105, 106, 107, 108]);

function clampLikert(v: number): LikertValue {
  if (v <= 0) return 0;
  if (v === 1) return 1;
  if (v === 2) return 2;
  return 3;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mean(values: number[]): number | null {
  const arr = values.filter((x) => Number.isFinite(x));
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default function SelfEsteemQuestionnaire(props: {
  studentId?: string;
  studentName?: string;
  onSubmit?: (payload: SelfEsteemResponsePayload) => void;
}) {
  const { studentId, studentName, onSubmit } = props;

  const [likert, setLikert] = useState<Record<number, LikertValue>>({});
  const [forcedChoice, setForcedChoice] = useState<Record<string, ForcedChoiceAnswer>>({});
  const [page, setPage] = useState<"LIKERT" | "FORCED" | "REVIEW">("LIKERT");
  const [filterUnanswered, setFilterUnanswered] = useState(false);

  // Load existing draft
  useEffect(() => {
    const saved = safeParseJSON<SelfEsteemResponsePayload>(clinicalSessionStore.getItem(STORAGE_KEY));
    if (saved?.likert) setLikert(saved.likert);
    if (saved?.forcedChoice) setForcedChoice(saved.forcedChoice);
  }, []);

  const answeredLikertCount = useMemo(() => Object.keys(likert).length, [likert]);
  const answeredFCCount = useMemo(() => Object.keys(forcedChoice).length, [forcedChoice]);

  const percentLikert = Math.round((answeredLikertCount / SELF_ESTEEM_LIKERT_ITEMS.length) * 100);
  const percentFC = Math.round((answeredFCCount / SELF_ESTEEM_FORCED_CHOICE.length) * 100);

  // Autosave
  useEffect(() => {
    const payload = buildPayload();
    try {
      clinicalSessionStore.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota issues in v1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likert, forcedChoice]);

  const likertItemsToShow = useMemo(() => {
    if (!filterUnanswered) return SELF_ESTEEM_LIKERT_ITEMS;
    return SELF_ESTEEM_LIKERT_ITEMS.filter((it) => likert[it.id] === undefined);
  }, [filterUnanswered, likert]);

  function setLikertAnswer(id: number, v: LikertValue) {
    setLikert((prev) => ({ ...prev, [id]: v }));
  }

  function setFCAnswer(id: string, v: ForcedChoiceAnswer) {
    setForcedChoice((prev) => ({ ...prev, [id]: v }));
  }

  function computeValidityFlags(): string[] {
    const flags: string[] = [];

    const lie = mean(
      [...LIE_IDS].map((id) => likert[id]).filter((v) => v !== undefined) as number[]
    );
    const bad = mean(
      [...FAKING_BAD_IDS].map((id) => likert[id]).filter((v) => v !== undefined) as number[]
    );
    const inf = mean(
      [...INFREQUENCY_IDS].map((id) => likert[id]).filter((v) => v !== undefined) as number[]
    );

    // Heuristic thresholds for v1 (tune later)
    if (lie !== null && lie >= 2.4) flags.push("Possible impression management (Lie scale elevated)");
    if (bad !== null && bad >= 2.4) flags.push("Possible negative impression (Faking-bad elevated)");
    if (inf !== null && inf >= 1.6) flags.push("Possible random/unusual responding (Infrequency elevated)");

    // Simple disclosure checks
    const heldBack = likert[110];
    const guessing = likert[113];
    if (heldBack !== undefined && heldBack >= 2) flags.push("Respondent reports holding back (Disclosure caution)");
    if (guessing !== undefined && guessing >= 2) flags.push("Respondent reports guessing (Attention/consistency caution)");

    return flags;
  }

  function computeQuickScores() {
    const values = SELF_ESTEEM_LIKERT_ITEMS
      .map((it) => likert[it.id])
      .filter((v) => v !== undefined) as number[];
    const m = mean(values);
    if (m === null) return { likertMean0to3: null, likertMeanPct: null };
    return { likertMean0to3: Number(m.toFixed(2)), likertMeanPct: Math.round((m / 3) * 100) };
  }

  function buildPayload(): SelfEsteemResponsePayload {
    const validityFlags = computeValidityFlags();
    const quickScores = computeQuickScores();
    return {
      version: "cseq-v1",
      createdAtISO: new Date().toISOString(),
      respondent: { studentId, name: studentName },
      likert,
      forcedChoice,
      meta: {
        percentCompleteLikert: percentLikert,
        percentCompleteForcedChoice: percentFC,
        validityFlags,
        quickScores,
      },
    };
  }

  function handleReset() {
    if (!confirm("Clear all answers for the CSEQ questionnaire?")) return;
    setLikert({});
    setForcedChoice({});
    try {
      clinicalSessionStore.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPage("LIKERT");
  }

  function handleSubmit() {
    const payload = buildPayload();
    try {
      clinicalSessionStore.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    onSubmit?.(payload);
    alert("CSEQ responses retained in temporary QA memory only. Not saved to a patient record.");
    setPage("REVIEW");
  }

  const payloadPreview = useMemo(() => buildPayload(), [likert, forcedChoice]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Comprehensive Self-Esteem Quotient Questionnaire (CSEQ) — v1</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          Likert complete: <b>{percentLikert}%</b>
        </div>
        <div>
          Forced-choice complete: <b>{percentFC}%</b>
        </div>
        <button onClick={() => setPage("LIKERT")} disabled={page === "LIKERT"}>
          Likert Items
        </button>
        <button onClick={() => setPage("FORCED")} disabled={page === "FORCED"}>
          Forced-Choice
        </button>
        <button onClick={() => setPage("REVIEW")} disabled={page === "REVIEW"}>
          Review
        </button>
        <button onClick={handleSubmit}>Save / Submit</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {page === "LIKERT" && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={filterUnanswered}
                onChange={(e) => setFilterUnanswered(e.target.checked)}
              />
              Show unanswered only
            </label>

            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Scale: 0 Not true • 1 Mostly untrue • 2 Mostly true • 3 Very true
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {likertItemsToShow.map((it) => {
              const v = likert[it.id];
              return (
                <div
                  key={it.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 42, fontWeight: 700 }}>{it.id}.</div>
                    <div style={{ flex: 1 }}>{it.text}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    {[0, 1, 2, 3].map((n) => (
                      <label key={n} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="radio"
                          name={`cseq-likert-${it.id}`}
                          checked={v === n}
                          onChange={() => setLikertAnswer(it.id, clampLikert(n))}
                        />
                        {n}
                      </label>
                    ))}

                    {v !== undefined && (
                      <button
                        onClick={() =>
                          setLikert((prev) => {
                            const next = { ...prev };
                            delete next[it.id];
                            return next;
                          })
                        }
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {page === "FORCED" && (
        <>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Choose the option that is <b>more true</b> for you (even if both seem true).
          </div>

          <div style={{ marginTop: 12 }}>
            {SELF_ESTEEM_FORCED_CHOICE.map((fc) => {
              const v = forcedChoice[fc.id];
              return (
                <div
                  key={fc.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{fc.id}</div>

                  <label style={{ display: "block", padding: 8, borderRadius: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`cseq-fc-${fc.id}`}
                      checked={v === "A"}
                      onChange={() => setFCAnswer(fc.id, "A")}
                      style={{ marginRight: 8 }}
                    />
                    <b>A.</b> {fc.a}
                  </label>

                  <label style={{ display: "block", padding: 8, borderRadius: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`cseq-fc-${fc.id}`}
                      checked={v === "B"}
                      onChange={() => setFCAnswer(fc.id, "B")}
                      style={{ marginRight: 8 }}
                    />
                    <b>B.</b> {fc.b}
                  </label>

                  {v && (
                    <button
                      onClick={() =>
                        setForcedChoice((prev) => {
                          const next = { ...prev };
                          delete next[fc.id];
                          return next;
                        })
                      }
                    >
                      Clear
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {page === "REVIEW" && (
        <>
          <h3 style={{ marginTop: 0 }}>Quick Review (v1)</h3>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, minWidth: 260 }}>
              <div style={{ fontWeight: 700 }}>Quick Score</div>
              <div style={{ marginTop: 6 }}>
                Mean (0–3): <b>{payloadPreview.meta.quickScores.likertMean0to3 ?? "—"}</b>
              </div>
              <div>
                Mean (%): <b>{payloadPreview.meta.quickScores.likertMeanPct ?? "—"}%</b>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                (Placeholder summary—full scoring/profile typing can be added next.)
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, flex: 1, minWidth: 320 }}>
              <div style={{ fontWeight: 700 }}>Validity Flags</div>
              {payloadPreview.meta.validityFlags.length === 0 ? (
                <div style={{ marginTop: 6 }}>None triggered (v1 heuristics).</div>
              ) : (
                <ul style={{ marginTop: 6 }}>
                  {payloadPreview.meta.validityFlags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Saved Payload (JSON)</div>
            <textarea
              readOnly
              value={JSON.stringify(payloadPreview, null, 2)}
              style={{
                width: "100%",
                height: 320,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
