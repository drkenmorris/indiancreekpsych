"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import {
  MODULE_ORDER,
  type Level1DomainId,
  type Level1Payload,
  type NextModuleConfig,
} from "./Level2Shared";

/**
 * Level-2 Anxiety Module (prescreening / triage; not diagnostic)
 *
 * Design goals:
 * - Lay-friendly wording
 * - Broad DSM-aligned anxiety coverage
 * - Includes:
 *   - generalized worry
 *   - panic-like surges
 *   - physical anxiety
 *   - avoidance
 *   - control difficulty
 *   - duration
 *   - impairment
 *   - brief context prompts
 *
 * Scoring (configurable):
 * - Symptom "present" if frequency >= PRESENT_THRESHOLD
 * - Anxiety pattern "strong" if:
 *   - worry/fear core present
 *   - at least 4 symptom areas present
 *   - duration endorsed
 *   - impairment endorsed
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

const PRESENT_THRESHOLD: Likert0to4 = 3;
const IMPAIR_THRESHOLD: Likert0to4 = 2;

type SymptomId =
  | "excessive_worry"
  | "can_not_shut_off"
  | "restless_keyed_up"
  | "muscle_tension"
  | "panic_surges"
  | "physical_alarm"
  | "avoidance"
  | "reassurance"
  | "sleep_disruption";

type Answers = Record<string, Likert0to4 | boolean>;

type Symptom = {
  id: SymptomId;
  title: string;
  text: string;
};

const CURRENT_DOMAIN: Level1DomainId = "anxiety";

const SYMPTOMS: Symptom[] = [
  {
    id: "excessive_worry",
    title: "Persistent worry",
    text: "During the past several months, I have worried excessively about multiple areas of life more days than not.",
  },
  {
    id: "can_not_shut_off",
    title: "Hard to turn off",
    text: "Once I start worrying or feeling afraid, it is hard for me to shut it off or calm my mind.",
  },
  {
    id: "restless_keyed_up",
    title: "Restless or keyed up",
    text: "I often feel keyed up, restless, on edge, or unable to fully relax.",
  },
  {
    id: "muscle_tension",
    title: "Physical tension",
    text: "Anxiety often shows up in my body through tension, tight muscles, shakiness, stomach upset, or similar symptoms.",
  },
  {
    id: "panic_surges",
    title: "Sudden surges",
    text: "I have episodes where fear or discomfort suddenly rises quickly and feels overwhelming.",
  },
  {
    id: "physical_alarm",
    title: "Body alarm reaction",
    text: "During anxious moments, I may have a racing heart, shortness of breath, dizziness, sweating, or a feeling that something is very wrong.",
  },
  {
    id: "avoidance",
    title: "Avoiding because of fear",
    text: "I avoid places, situations, conversations, travel, or responsibilities because of fear, worry, or panic-like feelings.",
  },
  {
    id: "reassurance",
    title: "Repeated checking or reassurance",
    text: "I repeatedly seek reassurance, check things, or mentally review situations because I am afraid something bad will happen.",
  },
  {
    id: "sleep_disruption",
    title: "Sleep affected",
    text: "My anxiety has noticeably disrupted my sleep or made it hard to rest deeply.",
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

export default function Level2AnxietyModule() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const s of SYMPTOMS) init[s.id] = 0;
    init["duration_months"] = 0;
    init["impairment"] = 0;
    init["trigger_specific"] = false;
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
      present[s.id] = (answers[s.id] as Likert0to4) >= PRESENT_THRESHOLD;
    }
    return present;
  }, [answers]);

  const corePresent = symptomPresence.excessive_worry || symptomPresence.panic_surges;

  const presentCount = useMemo(
    () => SYMPTOMS.reduce((acc, s) => acc + (symptomPresence[s.id] ? 1 : 0), 0),
    [symptomPresence]
  );

  const durationOk = (answers["duration_months"] as Likert0to4) >= 3;
  const impairmentOk = (answers["impairment"] as Likert0to4) >= IMPAIR_THRESHOLD;

  const anxietyStrong = corePresent && presentCount >= 4 && durationOk && impairmentOk;

  const safetyFlag =
    (answers["panic_surges"] as Likert0to4) >= 4 &&
    (answers["physical_alarm"] as Likert0to4) >= 4;

  const results = useMemo(() => {
    const notes: string[] = [];

    if (!corePresent) notes.push("Core worry/fear signal was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 anxiety-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer-term duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress/functional impact was not clearly endorsed.");

    let summary: string;
    if (anxietyStrong) {
      summary =
        "Your pattern suggests a strong anxiety-related symptom pattern. This does not diagnose an anxiety disorder, but it does suggest meaningful follow-up may be helpful.";
    } else if (corePresent && (presentCount >= 2 || impairmentOk)) {
      summary =
        "Your answers suggest meaningful anxiety symptoms, though they do not reach the strongest threshold in this screener.";
    } else {
      summary =
        "Your answers do not strongly suggest a broad anxiety pattern based on this screener.";
    }

    return { summary, notes };
  }, [anxietyStrong, corePresent, durationOk, impairmentOk, presentCount]);

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 2 — Worry, Fear & Panic Check</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        This is a self-check to understand anxiety-related patterns. It is not a diagnosis.
      </div>

      {safetyFlag ? (
        <div
          style={{
            border: "1px solid #b45309",
            background: "#fffbeb",
            color: "#92400e",
            padding: 12,
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 6 }}>High-intensity anxiety note</div>
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>
            Your answers suggest intense panic-like body alarm responses. These can feel frightening even when they are
            not medically dangerous, but sudden severe symptoms should still be medically evaluated when appropriate.
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div>
          <MiniHeader title="Main pattern" />
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
            id="duration_months"
            title="Duration"
            text="This pattern has been present for a substantial period of time rather than only briefly."
            value={answers["duration_months"] as Likert0to4}
            onChange={setLikert}
          />

          <LikertCard
            id="impairment"
            title="Impact"
            text="These anxiety symptoms interfere with my work, school, relationships, health, or daily responsibilities."
            value={answers["impairment"] as Likert0to4}
            onChange={setLikert}
          />

          <MiniHeader title="Context (screen only)" />
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Mostly tied to one specific trigger?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Does this fear mainly revolve around one thing, such as social situations, contamination, leaving home,
              trauma reminders, or a specific phobia?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["trigger_specific"]}
                onChange={(e) => setBool("trigger_specific", e.target.checked)}
              />
              <span>Yes, it seems tied to a more specific trigger</span>
            </label>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Substance or medical factors?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Do you think medication, caffeine, substances, sleep deprivation, hormonal shifts, or a medical condition
              may be intensifying this pattern?
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
                Duration: <strong>{durationOk ? "Yes" : "No"}</strong>
              </div>
              <div>
                Impact: <strong>{impairmentOk ? "Yes" : "No"}</strong>
              </div>
              <div style={{ marginTop: 6 }}>
                Pattern: <strong>{anxietyStrong ? "Strong" : "Not strong"}</strong>
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
                <div>No Level-1 context found. The Level-1 screener can store payload for continuity.</div>
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
                  clinicalSessionStore.setItem("asq_level2_anxiety_answers", JSON.stringify(answers));
                  alert("Saved Level-2 answers to local storage (asq_level2_anxiety_answers).");
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem("asq_level2_anxiety_answers");
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