"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/dev/Level2DepressionModule.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import {
  MODULE_ORDER,
  type Level1DomainId,
  type Level1Payload,
  type NextModuleConfig,
} from "./Level2Shared";

/**
 * Level-2 Depressive Module (prescreening / triage; not diagnostic)
 *
 * Design goals:
 * - Lay-friendly wording (no DSM labels shown to client)
 * - DSM-aligned symptom coverage for a Major Depressive Episode (MDE) pattern
 * - Includes:
 *   - 9 symptom clusters (past 2 weeks)
 *   - Duration gate (≥2 weeks)
 *   - Distress/impairment gate
 *   - Bipolar rule-out prompt (screen only)
 *   - Substance/medical context prompt (screen only)
 *
 * Scoring (configurable in-code):
 * - Symptom is "present" if frequency >= PRESENT_THRESHOLD (default 3 = Often / nearly every day)
 * - MDE-pattern is "likely" if:
 *   - (depressed mood OR loss of interest) present
 *   - total present symptoms >= 5
 *   - duration gate endorsed
 *   - impairment/distress >= IMPAIR_THRESHOLD
 *
 * NOTE: This module is intended to be used after Level-1 routes into the Depressive domain,
 * but it can run standalone.
 */

type Likert0to4 = 0 | 1 | 2 | 3 | 4;

const LIKERT_LABELS: Record<Likert0to4, string> = {
  0: "0 — Not at all",
  1: "1 — Rarely",
  2: "2 — Sometimes",
  3: "3 — Often / most days",
  4: "4 — Almost always / nearly every day",
};

const LIKERT_VALUES: Likert0to4[] = [0, 1, 2, 3, 4];

// Tunables
const PRESENT_THRESHOLD: Likert0to4 = 3;
const IMPAIR_THRESHOLD: Likert0to4 = 2;

type SymptomId =
  | "dep_mood"
  | "anhedonia"
  | "sleep"
  | "appetite"
  | "psychomotor"
  | "fatigue"
  | "worthless_guilt"
  | "concentration"
  | "death_thoughts";

type Answers = Record<string, Likert0to4 | boolean>;

type Symptom = {
  id: SymptomId;
  title: string;
  text: string;
};

const CURRENT_DOMAIN: Level1DomainId = "depressive";

const SYMPTOMS: Symptom[] = [
  {
    id: "dep_mood",
    title: "Low mood",
    text: "During the past 2 weeks, I have felt down, sad, empty, or hopeless for much of the day.",
  },
  {
    id: "anhedonia",
    title: "Loss of interest",
    text: "During the past 2 weeks, I have lost interest or pleasure in activities I usually enjoy.",
  },
  {
    id: "sleep",
    title: "Sleep change",
    text: "During the past 2 weeks, my sleep has been noticeably different than usual (trouble falling asleep, waking often, waking too early, or sleeping much more).",
  },
  {
    id: "appetite",
    title: "Appetite or weight change",
    text: "During the past 2 weeks, my appetite has changed a lot (much less or much more), or my weight has noticeably changed (without trying).",
  },
  {
    id: "psychomotor",
    title: "Slowed down or restless",
    text: "During the past 2 weeks, I have felt slowed down (moving/speaking more slowly) or unusually restless/fidgety.",
  },
  {
    id: "fatigue",
    title: "Low energy",
    text: "During the past 2 weeks, I have had very low energy or fatigue most of the time.",
  },
  {
    id: "worthless_guilt",
    title: "Worthlessness or guilt",
    text: "During the past 2 weeks, I have felt worthless or excessively guilty (more than makes sense for the situation).",
  },
  {
    id: "concentration",
    title: "Focus or decisions",
    text: "During the past 2 weeks, I have had trouble concentrating, thinking clearly, or making decisions.",
  },
  {
    id: "death_thoughts",
    title: "Thoughts about death",
    text: "During the past 2 weeks, I have had frequent thoughts about death, wishing I wouldn’t wake up, or thoughts of harming myself.",
  },
];

function getNextEligibleModule(
  currentDomain: Level1DomainId,
  level1Info: Level1Payload | null
): NextModuleConfig | null {
  const routed = Array.isArray(level1Info?.routedDomains) ? level1Info.routedDomains : [];
  const currentIndex = MODULE_ORDER.findIndex((m) => m.domainId === currentDomain);
  if (currentIndex < 0) return null;

  for (let i = currentIndex + 1; i < MODULE_ORDER.length; i += 1) {
    if (routed.includes(MODULE_ORDER[i].domainId)) {
      return MODULE_ORDER[i];
    }
  }

  return null;
}

function MiniHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        margin: "14px 0 8px 0",
        padding: "6px 10px",
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: "#374151",
      }}
    >
      {title}
    </div>
  );
}

function LikertCard(props: {
  id: string;
  title?: string;
  text: string;
  value: Likert0to4;
  onChange: (id: string, v: Likert0to4) => void;
}) {
  const { id, title, text, value, onChange } = props;
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
      {title ? <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div> : null}
      <div style={{ marginBottom: 10 }}>{text}</div>

      <div style={{ display: "grid", gap: 6 }}>
        {LIKERT_VALUES.map((val) => (
          <label key={val} style={{ display: "flex", gap: 8, cursor: "pointer" }}>
            <input type="radio" name={id} checked={value === val} onChange={() => onChange(id, val)} />
            <span>{LIKERT_LABELS[val]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Level2DepressionModule() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const s of SYMPTOMS) init[s.id] = 0;
    init["duration_2w"] = 0;
    init["impairment"] = 0;
    init["mania_ruleout"] = false;
    init["substance_medical"] = false;
    return init;
  });

  const setLikert = (id: string, v: Likert0to4) => setAnswers((p) => ({ ...p, [id]: v }));
  const setBool = (id: string, v: boolean) => setAnswers((p) => ({ ...p, [id]: v }));

  const level1Raw =
    typeof window !== "undefined" ? clinicalSessionStore.getItem("asq_level1_payload") : null;

  const level1Info = useMemo(() => {
    if (!level1Raw) return null;
    try {
      return JSON.parse(level1Raw) as Level1Payload;
    } catch {
      return null;
    }
  }, [level1Raw]);

  const nextEligibleModule = useMemo(
    () => getNextEligibleModule(CURRENT_DOMAIN, level1Info),
    [level1Info]
  );

  const symptomPresence = useMemo(() => {
    const present: Record<SymptomId, boolean> = {} as Record<SymptomId, boolean>;
    for (const s of SYMPTOMS) {
      const v = answers[s.id] as Likert0to4;
      present[s.id] = v >= PRESENT_THRESHOLD;
    }
    return present;
  }, [answers]);

  const corePresent = symptomPresence.dep_mood || symptomPresence.anhedonia;

  const presentCount = useMemo(() => {
    return SYMPTOMS.reduce((acc, s) => acc + (symptomPresence[s.id] ? 1 : 0), 0);
  }, [symptomPresence]);

  const durationOk = (answers["duration_2w"] as Likert0to4) >= 3;
  const impairmentOk = (answers["impairment"] as Likert0to4) >= IMPAIR_THRESHOLD;

  const mdeLikely = corePresent && presentCount >= 5 && durationOk && impairmentOk;
  const safetyFlag = (answers["death_thoughts"] as Likert0to4) >= 2;

  const results = useMemo(() => {
    const notes: string[] = [];
    if (!corePresent) notes.push("Core mood signal not strongly endorsed (low mood or loss of interest).");
    if (presentCount < 5) notes.push("Fewer than 5 symptom areas crossed the ‘often/most days’ threshold.");
    if (!durationOk) notes.push("Duration (2+ weeks) not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress/impact not clearly endorsed.");

    let summary: string;
    if (mdeLikely) {
      summary =
        "Your pattern is consistent with a significant depressive episode pattern. This does not confirm a diagnosis, but it suggests a strong reason to consider professional evaluation and support.";
    } else if (corePresent && (presentCount >= 2 || impairmentOk)) {
      summary =
        "Your answers suggest meaningful depressive symptoms, though they do not meet the strongest threshold for a full depressive-episode pattern in this screener.";
    } else {
      summary =
        "Your answers do not strongly suggest a current depressive-episode pattern based on this screener.";
    }

    return { summary, notes };
  }, [corePresent, durationOk, impairmentOk, mdeLikely, presentCount]);

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 2 — Mood & Motivation Check</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        This is a self-check to understand symptom patterns. It is not a diagnosis.
      </div>

      {safetyFlag ? (
        <div
          style={{
            border: "1px solid #b91c1c",
            background: "#fef2f2",
            color: "#7f1d1d",
            padding: 12,
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Safety note</div>
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>
            You indicated some thoughts related to death or self-harm. If you feel unsafe or might act on these thoughts,
            seek immediate help.
            <div style={{ marginTop: 8 }}>
              <strong>U.S.:</strong> Call or text <strong>988</strong>, or call <strong>911</strong>.
            </div>
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              If outside the U.S., use your local emergency number or crisis hotline.
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div>
          <MiniHeader title="Past 2 weeks" />
          {SYMPTOMS.map((s) => (
            <LikertCard
              key={s.id}
              id={s.id}
              title={s.title}
              text={s.text}
              value={answers[s.id] as Likert0to4}
              onChange={setLikert}
            />
          ))}

          <MiniHeader title="Duration and impact" />
          <LikertCard
            id="duration_2w"
            title="Duration"
            text="These symptoms have been present most days for at least 2 weeks."
            value={answers["duration_2w"] as Likert0to4}
            onChange={setLikert}
          />

          <LikertCard
            id="impairment"
            title="Impact"
            text="These symptoms have made it harder for me to function (work/school, relationships, self-care, or responsibilities)."
            value={answers["impairment"] as Likert0to4}
            onChange={setLikert}
          />

          <MiniHeader title="Context (screen only)" />
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Periods of unusually high energy?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Have you had clear periods lasting several days where you felt unusually energized or irritable, needed much
              less sleep, and were more talkative/impulsive than usual?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["mania_ruleout"]}
                onChange={(e) => setBool("mania_ruleout", e.target.checked)}
              />
              <span>Yes (this could change what kind of help fits best)</span>
            </label>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Substance/medical factors?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Do you think alcohol/drugs, medication changes, sleep deprivation, or a medical condition could be driving
              these symptoms?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["substance_medical"]}
                onChange={(e) => setBool("substance_medical", e.target.checked)}
              />
              <span>Possibly</span>
            </label>
          </div>
        </div>

        <div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, position: "sticky", top: 12 }}>
            <h3 style={{ marginTop: 0 }}>Summary</h3>

            <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>{results.summary}</div>

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
              <div>
                Core signal present: <strong>{corePresent ? "Yes" : "No"}</strong>
              </div>
              <div>
                Symptoms crossing threshold: <strong>{presentCount}</strong> / 9
              </div>
              <div>
                Duration (2+ weeks): <strong>{durationOk ? "Yes" : "No"}</strong>
              </div>
              <div>
                Impact: <strong>{impairmentOk ? "Yes" : "No"}</strong>
              </div>
              <div style={{ marginTop: 6 }}>
                Pattern: <strong>{mdeLikely ? "Strong" : "Not strong"}</strong>
              </div>
            </div>

            {results.notes.length ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Why the screener didn’t mark “strong”</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {results.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              {level1Info ? (
                <div>
                  Level-1 context found in local storage (key: <code>asq_level1_payload</code>).
                </div>
              ) : (
                <div>
                  No Level-1 context found. (Optional) The Level-1 screener can store answers to local storage for
                  continuity.
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate("/dev/level1")}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Back to Level 1
              </button>

              <button
                type="button"
                disabled={!nextEligibleModule}
                onClick={() => {
                  if (nextEligibleModule) navigate(nextEligibleModule.path);
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  opacity: nextEligibleModule ? 1 : 0.45,
                }}
                title={nextEligibleModule ? `Open ${nextEligibleModule.label}` : "No later eligible Level 2 module found"}
              >
                {nextEligibleModule
                  ? `Next eligible module — ${nextEligibleModule.label}`
                  : "Next eligible module — none"}
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.setItem("asq_level2_depression_answers", JSON.stringify(answers));
                  alert("Saved Level-2 answers to local storage (asq_level2_depression_answers).");
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem("asq_level2_depression_answers");
                  clinicalSessionStore.removeItem("asq_level1_payload");
                  window.location.reload();
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}