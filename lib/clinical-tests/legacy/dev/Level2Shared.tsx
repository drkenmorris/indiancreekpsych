"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";

export type Likert0to4 = 0 | 1 | 2 | 3 | 4;

export const LIKERT_LABELS: Record<Likert0to4, string> = {
  0: "0 — Not at all",
  1: "1 — Rarely",
  2: "2 — Sometimes",
  3: "3 — Often / most days",
  4: "4 — Almost always / nearly every day",
};

export const LIKERT_VALUES: Likert0to4[] = [0, 1, 2, 3, 4];

export type Level1DomainId =
  | "neurodev"
  | "psychotic"
  | "bipolar"
  | "depressive"
  | "anxiety"
  | "ocd_related"
  | "trauma"
  | "dissociative"
  | "somatic"
  | "eating"
  | "elimination"
  | "sleep"
  | "sexual_dysfunction"
  | "gender_dysphoria"
  | "impulse_conduct"
  | "substance"
  | "neurocognitive"
  | "personality_screen"
  | "paraphilic_screen";

export type Level1Payload = {
  routedDomains?: string[];
};

export type NextModuleConfig = {
  domainId: Level1DomainId;
  path: string;
  label: string;
};

export const MODULE_ORDER: NextModuleConfig[] = [
  { domainId: "neurodev", path: "/dev/level2/neurodevelopmental", label: "Attention, Learning & Social Differences" },
  { domainId: "psychotic", path: "/dev/level2/psychotic", label: "Unusual Perceptions & Beliefs" },
  { domainId: "bipolar", path: "/dev/level2/bipolar", label: "High Energy & Mood Shifts" },
  { domainId: "depressive", path: "/dev/level2/depression", label: "Mood & Motivation" },
  { domainId: "anxiety", path: "/dev/level2/anxiety", label: "Worry, Fear & Panic" },
  { domainId: "ocd_related", path: "/dev/level2/ocd", label: "Intrusions & Rituals" },
  { domainId: "trauma", path: "/dev/level2/trauma", label: "Trauma & Stress" },
  { domainId: "dissociative", path: "/dev/level2/dissociative", label: "Detachment & Memory Gaps" },
  { domainId: "somatic", path: "/dev/level2/somatic", label: "Body Concerns & Health Worry" },
  { domainId: "eating", path: "/dev/level2/eating", label: "Eating, Weight & Body Image" },
  { domainId: "elimination", path: "/dev/level2/elimination", label: "Bladder & Bowel Control" },
  { domainId: "sleep", path: "/dev/level2/sleep", label: "Sleep & Daytime Energy" },
  { domainId: "sexual_dysfunction", path: "/dev/level2/sexual-dysfunction", label: "Sexual Well-Being" },
  { domainId: "gender_dysphoria", path: "/dev/level2/gender-dysphoria", label: "Gender-Related Distress" },
  { domainId: "impulse_conduct", path: "/dev/level2/impulse-conduct", label: "Impulse, Anger & Conduct" },
  { domainId: "substance", path: "/dev/level2/substance", label: "Substance Use & Control" },
  { domainId: "neurocognitive", path: "/dev/level2/neurocognitive", label: "Memory & Thinking Changes" },
  { domainId: "personality_screen", path: "/dev/level2/personality", label: "Long-Term Personality Patterns" },
  { domainId: "paraphilic_screen", path: "/dev/level2/paraphilic", label: "Sexual Interest Pattern Screen" },
];

export type SymptomDef = {
  id: string;
  title: string;
  text: string;
};

export type CheckboxCardDef = {
  id: string;
  title: string;
  text: string;
  label: string;
};

export type SummaryRow = {
  label: string;
  value: string;
};

export type SafetyBox = {
  tone?: "danger" | "warning";
  title: string;
  text: string;
};

export type EvaluationArgs = {
  answers: Record<string, Likert0to4 | boolean>;
  presence: Record<string, boolean>;
  presentCount: number;
  durationOk: boolean;
  impairmentOk: boolean;
};

export type EvaluationResult = {
  summary: string;
  notes: string[];
  scoreRows: SummaryRow[];
  safetyBox?: SafetyBox | null;
};

export type GenericLevel2Config = {
  currentDomain: Level1DomainId;
  storageKey: string;
  pageTitle: string;
  introText: string;
  mainHeader: string;
  symptoms: SymptomDef[];
  durationField: {
    id: string;
    title: string;
    text: string;
    threshold: Likert0to4;
  };
  impactField: {
    id: string;
    title: string;
    text: string;
    threshold: Likert0to4;
  };
  contextCards?: CheckboxCardDef[];
  level1FoundText?: string;
  level1MissingText?: string;
  evaluate: (args: EvaluationArgs) => EvaluationResult;
};

function getLevel1Payload(): Level1Payload | null {
  if (typeof window === "undefined") return null;
  const raw = clinicalSessionStore.getItem("asq_level1_payload");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Level1Payload;
  } catch {
    return null;
  }
}

function getNextEligibleModule(
  currentDomain: Level1DomainId,
  level1Info: Level1Payload | null
): NextModuleConfig | null {
  const routed = Array.isArray(level1Info?.routedDomains) ? level1Info.routedDomains : [];
  const currentIndex = MODULE_ORDER.findIndex((m) => m.domainId === currentDomain);
  if (currentIndex < 0) return null;

  for (let i = currentIndex + 1; i < MODULE_ORDER.length; i += 1) {
    if (routed.includes(MODULE_ORDER[i].domainId)) return MODULE_ORDER[i];
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

function CheckboxCard(props: {
  id: string;
  title: string;
  text: string;
  label: string;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
}) {
  const { id, title, text, label, checked, onChange } = props;
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{text}</div>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(id, e.target.checked)} />
        <span>{label}</span>
      </label>
    </div>
  );
}

export default function GenericLevel2Module({ config }: { config: GenericLevel2Config }) {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, Likert0to4 | boolean>>(() => {
    const init: Record<string, Likert0to4 | boolean> = {};
    for (const s of config.symptoms) init[s.id] = 0;
    init[config.durationField.id] = 0;
    init[config.impactField.id] = 0;
    for (const card of config.contextCards ?? []) init[card.id] = false;
    return init;
  });

  const setLikert = (id: string, v: Likert0to4) => setAnswers((p) => ({ ...p, [id]: v }));
  const setBool = (id: string, v: boolean) => setAnswers((p) => ({ ...p, [id]: v }));

  const level1Info = useMemo(() => getLevel1Payload(), []);
  const nextEligibleModule = useMemo(
    () => getNextEligibleModule(config.currentDomain, level1Info),
    [config.currentDomain, level1Info]
  );

  const presence = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of config.symptoms) out[s.id] = (answers[s.id] as Likert0to4) >= 3;
    return out;
  }, [answers, config.symptoms]);

  const presentCount = useMemo(
    () => config.symptoms.reduce((acc, s) => acc + (presence[s.id] ? 1 : 0), 0),
    [config.symptoms, presence]
  );

  const durationOk = (answers[config.durationField.id] as Likert0to4) >= config.durationField.threshold;
  const impairmentOk = (answers[config.impactField.id] as Likert0to4) >= config.impactField.threshold;

  const evaluation = useMemo(
    () => config.evaluate({ answers, presence, presentCount, durationOk, impairmentOk }),
    [answers, config, durationOk, impairmentOk, presence, presentCount]
  );

  const tone = evaluation.safetyBox?.tone ?? "danger";
  const toneStyles =
    tone === "warning"
      ? { border: "1px solid #b45309", background: "#fffbeb", color: "#92400e" }
      : { border: "1px solid #b91c1c", background: "#fef2f2", color: "#7f1d1d" };

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>{config.pageTitle}</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>{config.introText}</div>

      {evaluation.safetyBox ? (
        <div style={{ ...toneStyles, padding: 12, borderRadius: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>{evaluation.safetyBox.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.35 }}>{evaluation.safetyBox.text}</div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div>
          <MiniHeader title={config.mainHeader} />
          {config.symptoms.map((s) => (
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
            id={config.durationField.id}
            title={config.durationField.title}
            text={config.durationField.text}
            value={answers[config.durationField.id] as Likert0to4}
            onChange={setLikert}
          />
          <LikertCard
            id={config.impactField.id}
            title={config.impactField.title}
            text={config.impactField.text}
            value={answers[config.impactField.id] as Likert0to4}
            onChange={setLikert}
          />

          {(config.contextCards?.length ?? 0) > 0 ? (
            <>
              <MiniHeader title="Context (screen only)" />
              {config.contextCards!.map((card) => (
                <CheckboxCard
                  key={card.id}
                  id={card.id}
                  title={card.title}
                  text={card.text}
                  label={card.label}
                  checked={!!answers[card.id]}
                  onChange={setBool}
                />
              ))}
            </>
          ) : null}
        </div>

        <div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, position: "sticky", top: 12 }}>
            <h3 style={{ marginTop: 0 }}>Summary</h3>
            <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>{evaluation.summary}</div>

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
              {evaluation.scoreRows.map((row) => (
                <div key={row.label}>
                  {row.label}: <strong>{row.value}</strong>
                </div>
              ))}
            </div>

            {evaluation.notes.length ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Why the screener didn’t mark “strong”</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {evaluation.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              {level1Info ? (
                <div>{config.level1FoundText ?? <>Level-1 context found in local storage (key: <code>asq_level1_payload</code>).</>}</div>
              ) : (
                <div>{config.level1MissingText ?? "No Level-1 context found. The Level-1 screener can store payload for continuity."}</div>
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
                  clinicalSessionStore.setItem(config.storageKey, JSON.stringify(answers));
                  alert(`Saved Level-2 answers to local storage (${config.storageKey}).`);
                }}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalSessionStore.removeItem(config.storageKey);
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