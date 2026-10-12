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
 * Level-2 OCD-Related Module (prescreening / triage; not diagnostic)
 *
 * Design goals:
 * - Lay-friendly wording
 * - Covers intrusive thoughts + repetitive responses
 * - Includes:
 *   - unwanted intrusive thoughts/images/urges
 *   - checking, cleaning, counting, mental rituals, reassurance
 *   - distress
 *   - time cost
 *   - control difficulty
 *   - duration
 *   - impairment
 *
 * Scoring:
 * - Symptom "present" if >= PRESENT_THRESHOLD
 * - OCD-related pattern "strong" if:
 *   - intrusive core present
 *   - ritual/compulsion core present
 *   - total present symptoms >= 5
 *   - duration and impairment endorsed
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
  | "intrusive_thoughts"
  | "hard_to_dismiss"
  | "checking"
  | "cleaning_ordering"
  | "counting_repeating"
  | "mental_rituals"
  | "reassurance_seeking"
  | "time_consuming"
  | "anxiety_if_resisted";

type Answers = Record<string, Likert0to4 | boolean>;

type Symptom = {
  id: SymptomId;
  title: string;
  text: string;
};

const CURRENT_DOMAIN: Level1DomainId = "ocd_related";

const SYMPTOMS: Symptom[] = [
  {
    id: "intrusive_thoughts",
    title: "Intrusive thoughts/images/urges",
    text: "I have unwanted thoughts, images, doubts, or urges that enter my mind repeatedly and feel disturbing or difficult to ignore.",
  },
  {
    id: "hard_to_dismiss",
    title: "Hard to dismiss",
    text: "When these intrusions show up, it feels hard to simply let them pass without reacting to them.",
  },
  {
    id: "checking",
    title: "Checking",
    text: "I repeatedly check things such as locks, appliances, messages, mistakes, safety, health, or whether I may have caused harm.",
  },
  {
    id: "cleaning_ordering",
    title: "Cleaning or arranging",
    text: "I feel driven to clean, wash, organize, or arrange things in a particular way to reduce discomfort or make things feel right.",
  },
  {
    id: "counting_repeating",
    title: "Counting or repeating",
    text: "I repeat actions, words, numbers, or routines until they feel complete, safe, or correct.",
  },
  {
    id: "mental_rituals",
    title: "Mental rituals",
    text: "I silently review, pray, cancel out thoughts, replay events, or mentally neutralize things to reduce anxiety.",
  },
  {
    id: "reassurance_seeking",
    title: "Reassurance",
    text: "I repeatedly ask others for reassurance, confirmation, or certainty because the doubt won’t settle.",
  },
  {
    id: "time_consuming",
    title: "Consumes time",
    text: "These thoughts or habits take a lot of time, energy, or mental space during the day.",
  },
  {
    id: "anxiety_if_resisted",
    title: "Anxiety if resisted",
    text: "If I try not to do the routine or not respond to the thought, my anxiety or discomfort rises noticeably.",
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

export default function Level2OcdModule() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const s of SYMPTOMS) init[s.id] = 0;
    init["duration_months"] = 0;
    init["impairment"] = 0;
    init["insight_limited"] = false;
    init["tic_or_habit_context"] = false;
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

  const intrusiveCore = symptomPresence.intrusive_thoughts || symptomPresence.hard_to_dismiss;
  const ritualCore =
    symptomPresence.checking ||
    symptomPresence.cleaning_ordering ||
    symptomPresence.counting_repeating ||
    symptomPresence.mental_rituals ||
    symptomPresence.reassurance_seeking;

  const presentCount = useMemo(
    () => SYMPTOMS.reduce((acc, s) => acc + (symptomPresence[s.id] ? 1 : 0), 0),
    [symptomPresence]
  );

  const durationOk = (answers["duration_months"] as Likert0to4) >= 3;
  const impairmentOk = (answers["impairment"] as Likert0to4) >= IMPAIR_THRESHOLD;

  const ocdStrong = intrusiveCore && ritualCore && presentCount >= 5 && durationOk && impairmentOk;

  const results = useMemo(() => {
    const notes: string[] = [];

    if (!intrusiveCore) notes.push("The intrusive-thought core was not strongly endorsed.");
    if (!ritualCore) notes.push("The repetitive-response core was not strongly endorsed.");
    if (presentCount < 5) notes.push("Fewer than 5 symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress/functional impact was not clearly endorsed.");

    let summary: string;
    if (ocdStrong) {
      summary =
        "Your answers suggest a strong pattern of intrusive thoughts and repetitive coping habits. This does not diagnose OCD, but it suggests meaningful follow-up may be helpful.";
    } else if (intrusiveCore && (ritualCore || impairmentOk)) {
      summary =
        "Your answers suggest meaningful obsessive-compulsive-style symptoms, though they do not reach the strongest threshold in this screener.";
    } else {
      summary =
        "Your answers do not strongly suggest a broad intrusive-thought/repetitive-ritual pattern based on this screener.";
    }

    return { summary, notes };
  }, [durationOk, impairmentOk, intrusiveCore, ocdStrong, presentCount, ritualCore]);

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 2 — Intrusions & Rituals Check</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        This is a self-check to understand intrusive-thought and repetitive-habit patterns. It is not a diagnosis.
      </div>

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
            text="These thoughts or rituals interfere with my time, concentration, relationships, or daily functioning."
            value={answers["impairment"] as Likert0to4}
            onChange={setLikert}
          />

          <MiniHeader title="Context (screen only)" />
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Does it feel fully reasonable in the moment?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              When this happens, does it sometimes feel like the fear or ritual makes total sense, even if later you see
              it was excessive?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["insight_limited"]}
                onChange={(e) => setBool("insight_limited", e.target.checked)}
              />
              <span>Yes, insight is sometimes limited in the moment</span>
            </label>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Could part of it be habit/tic/sensory-driven?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Do some of the repeated behaviors feel more like a sensory need, habit loop, or tic-like urge than fear of
              something bad happening?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["tic_or_habit_context"]}
                onChange={(e) => setBool("tic_or_habit_context", e.target.checked)}
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
                Intrusive core present: <strong>{intrusiveCore ? "Yes" : "No"}</strong>
              </div>
              <div>
                Repetitive-response core present: <strong>{ritualCore ? "Yes" : "No"}</strong>
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
                Pattern: <strong>{ocdStrong ? "Strong" : "Not strong"}</strong>
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
                  clinicalSessionStore.setItem("asq_level2_ocd_answers", JSON.stringify(answers));
                  alert("Saved Level-2 answers to local storage (asq_level2_ocd_answers).");
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem("asq_level2_ocd_answers");
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