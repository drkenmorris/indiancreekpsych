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
 * Level-2 Trauma Module (prescreening / triage; not diagnostic)
 *
 * Design goals:
 * - Lay-friendly wording
 * - Trauma-related stress pattern coverage
 * - Includes:
 *   - exposure acknowledgment
 *   - intrusion/re-experiencing
 *   - avoidance
 *   - threat arousal
 *   - mood/cognitive shifts
 *   - duration
 *   - impairment
 *
 * Scoring:
 * - Symptom "present" if >= PRESENT_THRESHOLD
 * - Trauma pattern "strong" if:
 *   - exposure acknowledged
 *   - intrusion present
 *   - plus at least 4 symptom areas present
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
  | "exposure"
  | "intrusive_memories"
  | "nightmares"
  | "flashback_like"
  | "avoidance"
  | "numbing_detachment"
  | "negative_beliefs"
  | "hypervigilance"
  | "startle_sleep_irritable";

type Answers = Record<string, Likert0to4 | boolean>;

type Symptom = {
  id: SymptomId;
  title: string;
  text: string;
};

const CURRENT_DOMAIN: Level1DomainId = "trauma";

const SYMPTOMS: Symptom[] = [
  {
    id: "exposure",
    title: "Overwhelming event",
    text: "I have experienced one or more events that felt terrifying, violating, life-threatening, or deeply overwhelming.",
  },
  {
    id: "intrusive_memories",
    title: "Unwanted memories",
    text: "The event comes back into my mind even when I do not want it to.",
  },
  {
    id: "nightmares",
    title: "Nightmares",
    text: "I have distressing dreams or sleep disruption connected to what happened.",
  },
  {
    id: "flashback_like",
    title: "Reliving or body reactivation",
    text: "At times it feels as if I am reliving part of it, or my body reacts as though the danger is happening again.",
  },
  {
    id: "avoidance",
    title: "Avoidance",
    text: "I avoid people, places, conversations, thoughts, or reminders connected to what happened.",
  },
  {
    id: "numbing_detachment",
    title: "Numb or detached",
    text: "I feel emotionally numb, disconnected, or less able to feel close to others than before.",
  },
  {
    id: "negative_beliefs",
    title: "Negative beliefs or shame",
    text: "Since what happened, I have carried strong blame, shame, or negative beliefs about myself, others, or the world.",
  },
  {
    id: "hypervigilance",
    title: "On guard",
    text: "I stay on guard, watchful, or tense as if danger could return at any time.",
  },
  {
    id: "startle_sleep_irritable",
    title: "Startle, sleep, or irritability",
    text: "I am more jumpy, irritable, or easily startled, and my sleep has often been affected.",
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

export default function Level2TraumaModule() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const s of SYMPTOMS) init[s.id] = 0;
    init["duration_1m"] = 0;
    init["impairment"] = 0;
    init["ongoing_threat"] = false;
    init["dissociation_context"] = false;
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

  const exposurePresent = symptomPresence.exposure;
  const intrusionPresent =
    symptomPresence.intrusive_memories || symptomPresence.nightmares || symptomPresence.flashback_like;

  const presentCount = useMemo(
    () => SYMPTOMS.reduce((acc, s) => acc + (symptomPresence[s.id] ? 1 : 0), 0),
    [symptomPresence]
  );

  const durationOk = (answers["duration_1m"] as Likert0to4) >= 3;
  const impairmentOk = (answers["impairment"] as Likert0to4) >= IMPAIR_THRESHOLD;

  const traumaStrong =
    exposurePresent && intrusionPresent && presentCount >= 4 && durationOk && impairmentOk;

  const safetyFlag =
    (answers["flashback_like"] as Likert0to4) >= 4 ||
    ((answers["hypervigilance"] as Likert0to4) >= 4 &&
      (answers["startle_sleep_irritable"] as Likert0to4) >= 4);

  const results = useMemo(() => {
    const notes: string[] = [];

    if (!exposurePresent) notes.push("A clearly overwhelming event was not strongly endorsed.");
    if (!intrusionPresent) notes.push("Intrusion/re-experiencing symptoms were not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 trauma-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress/functional impact was not clearly endorsed.");

    let summary: string;
    if (traumaStrong) {
      summary =
        "Your pattern suggests a strong trauma-related stress response pattern. This does not confirm PTSD or another diagnosis, but it suggests follow-up may be important.";
    } else if (exposurePresent && (intrusionPresent || impairmentOk)) {
      summary =
        "Your answers suggest meaningful trauma-related stress symptoms, though they do not reach the strongest screener threshold.";
    } else {
      summary =
        "Your answers do not strongly suggest a broad trauma-related stress pattern based on this screener.";
    }

    return { summary, notes };
  }, [durationOk, exposurePresent, impairmentOk, intrusionPresent, presentCount, traumaStrong]);

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 2 — Trauma & Stress Check</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        This is a self-check to understand trauma-related patterns. It is not a diagnosis.
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
          <div style={{ fontWeight: 950, marginBottom: 6 }}>High-intensity trauma note</div>
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>
            Your answers suggest strong reliving, alarm, or threat-response symptoms. If you feel unsafe, highly
            disoriented, or unable to stabilize, urgent support may be appropriate.
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
            id="duration_1m"
            title="Duration"
            text="This stress pattern has lasted at least a month rather than only briefly."
            value={answers["duration_1m"] as Likert0to4}
            onChange={setLikert}
          />

          <LikertCard
            id="impairment"
            title="Impact"
            text="These symptoms interfere with my relationships, work, sleep, concentration, or daily functioning."
            value={answers["impairment"] as Likert0to4}
            onChange={setLikert}
          />

          <MiniHeader title="Context (screen only)" />
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Ongoing danger or threat?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Is the stress partly related to danger, coercion, abuse, instability, or an ongoing unsafe situation that
              is still happening now?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["ongoing_threat"]}
                onChange={(e) => setBool("ongoing_threat", e.target.checked)}
              />
              <span>Yes, there may still be ongoing threat</span>
            </label>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Detached or unreal during stress?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              When highly stressed, do you also become numb, unreal, disconnected, or lose track of time?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["dissociation_context"]}
                onChange={(e) => setBool("dissociation_context", e.target.checked)}
              />
              <span>Yes, that may also be part of the pattern</span>
            </label>
          </div>
        </div>

        <div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, position: "sticky", top: 12 }}>
            <h3 style={{ marginTop: 0 }}>Summary</h3>

            <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>{results.summary}</div>

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
              <div>
                Overwhelming event signal: <strong>{exposurePresent ? "Yes" : "No"}</strong>
              </div>
              <div>
                Intrusion signal: <strong>{intrusionPresent ? "Yes" : "No"}</strong>
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
                Pattern: <strong>{traumaStrong ? "Strong" : "Not strong"}</strong>
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
                  clinicalSessionStore.setItem("asq_level2_trauma_answers", JSON.stringify(answers));
                  alert("Saved Level-2 answers to local storage (asq_level2_trauma_answers).");
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem("asq_level2_trauma_answers");
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