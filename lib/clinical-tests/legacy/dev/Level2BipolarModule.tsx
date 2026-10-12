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
 * Level-2 Bipolar Module (prescreening / triage; not diagnostic)
 *
 * Design goals:
 * - Lay-friendly wording
 * - Focus on distinct high-energy / activated mood states
 * - Includes:
 *   - elevated or irritable mood
 *   - decreased need for sleep
 *   - racing thoughts
 *   - increased speech/activity
 *   - impulsive/risky behavior
 *   - inflated confidence
 *   - episodic distinctness
 *   - impairment
 *   - depression history context
 *
 * Scoring:
 * - Symptom "present" if >= PRESENT_THRESHOLD
 * - Bipolar-spectrum activation pattern "strong" if:
 *   - mood activation core present
 *   - decreased sleep need or racing/activity cluster present
 *   - total present symptoms >= 5
 *   - distinct-episode duration and impact endorsed
 */

type Likert0to4 = 0 | 1 | 2 | 3 | 4;

const LIKERT_LABELS: Record<Likert0to4, string> = {
  0: "0 — Not at all",
  1: "1 — Rarely",
  2: "2 — Sometimes",
  3: "3 — Often / clearly present",
  4: "4 — Very strongly / repeatedly present",
};

const LIKERT_VALUES: Likert0to4[] = [0, 1, 2, 3, 4];

const PRESENT_THRESHOLD: Likert0to4 = 3;
const IMPAIR_THRESHOLD: Likert0to4 = 2;

type SymptomId =
  | "elevated_or_irritable"
  | "less_sleep"
  | "racing_thoughts"
  | "more_talkative"
  | "more_goal_directed"
  | "restless_agitated"
  | "inflated_confidence"
  | "impulsive_risky"
  | "others_noticed_change";

type Answers = Record<string, Likert0to4 | boolean>;

type Symptom = {
  id: SymptomId;
  title: string;
  text: string;
};

const CURRENT_DOMAIN: Level1DomainId = "bipolar";

const SYMPTOMS: Symptom[] = [
  {
    id: "elevated_or_irritable",
    title: "Unusually up or irritable",
    text: "I have had clear periods where I felt unusually energized, intensely driven, unusually upbeat, or much more irritable than normal for me.",
  },
  {
    id: "less_sleep",
    title: "Needed much less sleep",
    text: "During those periods, I needed much less sleep than usual and still felt energized rather than tired.",
  },
  {
    id: "racing_thoughts",
    title: "Racing thoughts",
    text: "During those periods, my thoughts moved unusually fast or jumped rapidly from one thing to another.",
  },
  {
    id: "more_talkative",
    title: "More talkative",
    text: "During those periods, I talked much more than usual, felt pressure to keep talking, or found it hard to slow down.",
  },
  {
    id: "more_goal_directed",
    title: "Unusually driven or active",
    text: "During those periods, I became unusually productive, busy, restless, ambitious, or driven to start many things.",
  },
  {
    id: "restless_agitated",
    title: "Agitated or wound up",
    text: "During those periods, I felt internally revved up, physically agitated, or unable to settle.",
  },
  {
    id: "inflated_confidence",
    title: "Unusually confident",
    text: "During those periods, I felt unusually powerful, confident, important, gifted, or certain in ways that were noticeably above my baseline.",
  },
  {
    id: "impulsive_risky",
    title: "Risky or impulsive behavior",
    text: "During those periods, I made unusually impulsive or risky choices involving spending, sex, driving, business, substances, conflict, or major decisions.",
  },
  {
    id: "others_noticed_change",
    title: "Others noticed a change",
    text: "Other people noticed that I was acting very different from my usual self during these periods.",
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

export default function Level2BipolarModule() {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const s of SYMPTOMS) init[s.id] = 0;
    init["episode_duration"] = 0;
    init["impairment"] = 0;
    init["depression_history"] = false;
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

  const moodCore = symptomPresence.elevated_or_irritable;
  const activationCore =
    symptomPresence.less_sleep ||
    symptomPresence.racing_thoughts ||
    symptomPresence.more_talkative ||
    symptomPresence.more_goal_directed;

  const presentCount = useMemo(
    () => SYMPTOMS.reduce((acc, s) => acc + (symptomPresence[s.id] ? 1 : 0), 0),
    [symptomPresence]
  );

  const durationOk = (answers["episode_duration"] as Likert0to4) >= 3;
  const impairmentOk = (answers["impairment"] as Likert0to4) >= IMPAIR_THRESHOLD;

  const bipolarStrong = moodCore && activationCore && presentCount >= 5 && durationOk && impairmentOk;

  const safetyFlag =
    (answers["impulsive_risky"] as Likert0to4) >= 4 &&
    ((answers["less_sleep"] as Likert0to4) >= 4 || (answers["inflated_confidence"] as Likert0to4) >= 4);

  const results = useMemo(() => {
    const notes: string[] = [];

    if (!moodCore) notes.push("The activated mood core was not strongly endorsed.");
    if (!activationCore) notes.push("The activation cluster (sleep/thoughts/activity/speech) was not strongly endorsed.");
    if (presentCount < 5) notes.push("Fewer than 5 activation-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("A distinct episode duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Impact or consequences were not clearly endorsed.");

    let summary: string;
    if (bipolarStrong) {
      summary =
        "Your answers suggest a strong activated mood-state pattern that may warrant bipolar-spectrum follow-up. This does not diagnose bipolar disorder, but it suggests careful evaluation may be important.";
    } else if (moodCore && (activationCore || impairmentOk)) {
      summary =
        "Your answers suggest meaningful periods of activated mood or energy, though they do not reach the strongest threshold in this screener.";
    } else {
      summary =
        "Your answers do not strongly suggest a distinct high-energy mood-state pattern based on this screener.";
    }

    return { summary, notes };
  }, [activationCore, bipolarStrong, durationOk, impairmentOk, moodCore, presentCount]);

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 2 — High Energy & Mood Shifts Check</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
        This is a self-check to understand activated mood-state patterns. It is not a diagnosis.
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
          <div style={{ fontWeight: 950, marginBottom: 6 }}>High-activation note</div>
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>
            Your answers suggest a high-intensity activated state with reduced sleep and risky behavior. If this is
            current and escalating, urgent clinical contact may be appropriate.
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div>
          <MiniHeader title="Distinct high-energy periods" />
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
            id="episode_duration"
            title="Distinct episode"
            text="These changes happened in a distinct period that lasted long enough to clearly stand out from my usual self."
            value={answers["episode_duration"] as Likert0to4}
            onChange={setLikert}
          />

          <LikertCard
            id="impairment"
            title="Impact or consequences"
            text="These periods caused problems, concern from others, conflict, bad decisions, or noticeable disruption in my life."
            value={answers["impairment"] as Likert0to4}
            onChange={setLikert}
          />

          <MiniHeader title="Context (screen only)" />
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Have you also had significant low periods?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Have you also had periods of strong depression, low motivation, or hopelessness at other times in your life?
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!answers["depression_history"]}
                onChange={(e) => setBool("depression_history", e.target.checked)}
              />
              <span>Yes, I have also had significant depressive periods</span>
            </label>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Could substances or a medical issue explain it?</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Do you think these periods may have been driven by medication, stimulants, substances, sleep deprivation, or
              a medical condition?
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
                Mood activation core present: <strong>{moodCore ? "Yes" : "No"}</strong>
              </div>
              <div>
                Activation cluster present: <strong>{activationCore ? "Yes" : "No"}</strong>
              </div>
              <div>
                Symptoms crossing threshold: <strong>{presentCount}</strong> / 9
              </div>
              <div>
                Distinct episode duration: <strong>{durationOk ? "Yes" : "No"}</strong>
              </div>
              <div>
                Impact: <strong>{impairmentOk ? "Yes" : "No"}</strong>
              </div>
              <div style={{ marginTop: 6 }}>
                Pattern: <strong>{bipolarStrong ? "Strong" : "Not strong"}</strong>
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
                  clinicalSessionStore.setItem("asq_level2_bipolar_answers", JSON.stringify(answers));
                  alert("Saved Level-2 answers to local storage (asq_level2_bipolar_answers).");
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem("asq_level2_bipolar_answers");
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