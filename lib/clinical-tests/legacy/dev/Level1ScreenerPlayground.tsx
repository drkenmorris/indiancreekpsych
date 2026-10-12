"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import { MODULE_ORDER, type Level1DomainId } from "./Level2Shared";

/**
 * Level 1 DSM Domain Screener — Domain-by-domain wizard
 * - Global SAFETY first with immediate red banner
 * - Separate numbered domains
 * - Domain severity block appears ONLY when domain is Positive (repeated per domain)
 * - Auto-advance:
 *    - NEGATIVE => after gatekeepers completed
 *    - POSITIVE => after severity completed
 * - Routes domains to Level 2 only if:
 *    POSITIVE AND (distress>=criterion OR impairment>=criterion) AND duration meets criterion
 *
 * NOTE: Prescreening only, not diagnostic.
 */

type Likert0to4 = 0 | 1 | 2 | 3 | 4;
type AnswerValue = Likert0to4;

type DomainId =
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

type DomainStatus = "PENDING" | "POSITIVE" | "NEGATIVE";

type DomainRule = {
  number: number;
  id: DomainId;
  softTitle: string;
  softSubtitle: string;
  clinicalTitle: string;
  gateQids: string[];
  screenOnly?: boolean;
  note?: string;
};

type Question = {
  id: string;
  domain: DomainId | "global";
  text: string;
};

type Answers = Record<string, AnswerValue>;
type Touched = Record<string, boolean>;

const LIKERT_LABELS: Record<Likert0to4, string> = {
  0: "0 — Not at all",
  1: "1 — Rarely",
  2: "2 — Sometimes",
  3: "3 — Often",
  4: "4 — Almost always",
};

const LIKERT_VALUES: Likert0to4[] = [0, 1, 2, 3, 4];

const ACTIVATION = {
  anyItemAtOrAbove: 3 as Likert0to4,
  twoItemsAtOrAbove: 2 as Likert0to4,
};

const SAFETY_THRESHOLD: Likert0to4 = 2;

type DomainCriteria = {
  minDistress: Likert0to4;
  minImpair: Likert0to4;
  minDurationResponse: Likert0to4;
  requireDuration: boolean;
};

const DEFAULT_CRITERIA: DomainCriteria = {
  minDistress: 2,
  minImpair: 2,
  minDurationResponse: 3,
  requireDuration: true,
};

const DOMAIN_CRITERIA: Partial<Record<DomainId, DomainCriteria>> = {
  personality_screen: { ...DEFAULT_CRITERIA, minDurationResponse: 4 },
};

function criteriaFor(domainId: DomainId): DomainCriteria {
  return DOMAIN_CRITERIA[domainId] ?? DEFAULT_CRITERIA;
}

function isLikert(v: unknown): v is Likert0to4 {
  return v === 0 || v === 1 || v === 2 || v === 3 || v === 4;
}

const DOMAIN_RULES: DomainRule[] = [
  {
    number: 1,
    id: "neurodev",
    softTitle: "Attention, Learning & Social Differences",
    softSubtitle: "Focus, organization, learning patterns, and social communication styles.",
    clinicalTitle: "Neurodevelopmental Disorders",
    gateQids: ["nd_1", "nd_2", "nd_3"],
  },
  {
    number: 2,
    id: "psychotic",
    softTitle: "Unusual Perceptions & Beliefs",
    softSubtitle:
      "Experiences like hearing/seeing things others don’t, or strongly held beliefs that feel hard to question.",
    clinicalTitle: "Schizophrenia Spectrum / Other Psychotic Disorders",
    gateQids: ["psy_1", "psy_2", "psy_3"],
  },
  {
    number: 3,
    id: "bipolar",
    softTitle: "High-Energy Mood Shifts",
    softSubtitle: "Distinct periods of unusually high energy, reduced sleep need, racing thoughts, or risky behavior.",
    clinicalTitle: "Bipolar and Related Disorders",
    gateQids: ["bp_1", "bp_2", "bp_3"],
  },
  {
    number: 4,
    id: "depressive",
    softTitle: "Low Mood & Loss of Interest",
    softSubtitle: "Persistent sadness, numbness, low energy, or losing interest in what normally matters.",
    clinicalTitle: "Depressive Disorders",
    gateQids: ["dep_1", "dep_2", "dep_3"],
  },
  {
    number: 5,
    id: "anxiety",
    softTitle: "Worry, Fear & Panic",
    softSubtitle: "Excessive worry, avoidance, panic sensations, and physical tension.",
    clinicalTitle: "Anxiety Disorders",
    gateQids: ["anx_1", "anx_2", "anx_3"],
  },
  {
    number: 6,
    id: "ocd_related",
    softTitle: "Intrusive Thoughts & Repetitive Habits",
    softSubtitle: "Unwanted thoughts/images and rituals like checking, reassurance, counting, or cleaning.",
    clinicalTitle: "Obsessive-Compulsive and Related Disorders",
    gateQids: ["ocd_1", "ocd_2", "ocd_3"],
  },
  {
    number: 7,
    id: "trauma",
    softTitle: "Stress After Difficult Experiences",
    softSubtitle: "Feeling on edge, avoiding reminders, nightmares, or reliving moments after overwhelming events.",
    clinicalTitle: "Trauma- and Stressor-Related Disorders",
    gateQids: ["tr_1", "tr_2", "tr_3"],
  },
  {
    number: 8,
    id: "dissociative",
    softTitle: 'Feeling Detached or "On Autopilot"',
    softSubtitle: "Feeling unreal, disconnected from yourself, or having memory gaps.",
    clinicalTitle: "Dissociative Disorders",
    gateQids: ["dis_1", "dis_2"],
  },
  {
    number: 9,
    id: "somatic",
    softTitle: "Body Concerns & Health Worry",
    softSubtitle: "Strong worry about symptoms, frequent checking, or distress about bodily sensations.",
    clinicalTitle: "Somatic Symptom and Related Disorders",
    gateQids: ["som_1", "som_2"],
  },
  {
    number: 10,
    id: "eating",
    softTitle: "Eating, Weight & Body Image Patterns",
    softSubtitle: "Restriction, bingeing, cycling extremes, or intense body/weight concerns.",
    clinicalTitle: "Feeding and Eating Disorders",
    gateQids: ["eat_1", "eat_2"],
  },
  {
    number: 11,
    id: "elimination",
    softTitle: "Bladder or Bowel Control Concerns",
    softSubtitle: "Ongoing accidents or difficulties where control is expected.",
    clinicalTitle: "Elimination Disorders",
    gateQids: ["elim_1", "elim_2"],
  },
  {
    number: 12,
    id: "sleep",
    softTitle: "Sleep & Daytime Energy",
    softSubtitle: "Trouble falling/staying asleep, unrefreshing sleep, or excessive daytime sleepiness.",
    clinicalTitle: "Sleep-Wake Disorders",
    gateQids: ["slp_1", "slp_2"],
  },
  {
    number: 13,
    id: "sexual_dysfunction",
    softTitle: "Sexual Well-Being",
    softSubtitle: "Concerns with desire, arousal, orgasm, or satisfaction that cause distress.",
    clinicalTitle: "Sexual Dysfunctions",
    gateQids: ["sex_1", "sex_2"],
  },
  {
    number: 14,
    id: "gender_dysphoria",
    softTitle: "Gender-Related Distress",
    softSubtitle: "Stress or discomfort related to gender experience and body/social expectations.",
    clinicalTitle: "Gender Dysphoria",
    gateQids: ["gd_1", "gd_2"],
  },
  {
    number: 15,
    id: "impulse_conduct",
    softTitle: "Anger, Impulses & Rule-Breaking",
    softSubtitle: "Difficulty controlling anger, aggression, or impulses that cause problems.",
    clinicalTitle: "Disruptive / Impulse-Control / Conduct Disorders",
    gateQids: ["imp_1", "imp_2"],
  },
  {
    number: 16,
    id: "substance",
    softTitle: "Alcohol, Substances & Compulsive Habits",
    softSubtitle: "Using more than intended, difficulty cutting down, or repeated consequences.",
    clinicalTitle: "Substance-Related and Addictive Disorders",
    gateQids: ["sub_1", "sub_2", "sub_3"],
  },
  {
    number: 17,
    id: "neurocognitive",
    softTitle: "Memory & Thinking Changes",
    softSubtitle: "Noticeable changes in memory, attention, language, or problem-solving compared to earlier.",
    clinicalTitle: "Neurocognitive Disorders",
    gateQids: ["nc_1", "nc_2"],
  },
  {
    number: 18,
    id: "personality_screen",
    softTitle: "Long-Term Relationship & Coping Style Patterns (screen)",
    softSubtitle: "Persistent patterns in relating, emotions, and coping that repeatedly cause problems.",
    clinicalTitle: "Personality Disorders (Screen)",
    gateQids: ["pd_1", "pd_2", "pd_3"],
    screenOnly: true,
    note: "Screen only — deeper follow-up is separate.",
  },
  {
    number: 19,
    id: "paraphilic_screen",
    softTitle: "Sexual Interests That Cause Distress or Problems (screen)",
    softSubtitle: "Concerns that feel out of control, distressing, or have caused problems.",
    clinicalTitle: "Paraphilic Disorders (Screen)",
    gateQids: ["para_1", "para_2"],
    screenOnly: true,
    note: "Screen only — deeper follow-up is separate and optional.",
  },
];

const QUESTIONS: Question[] = [
  { id: "g_selfharm", domain: "global", text: "Recently, I have had thoughts about harming myself or not wanting to be alive." },
  { id: "g_harm_others", domain: "global", text: "Recently, I have had thoughts about seriously harming someone else." },

  { id: "nd_1", domain: "neurodev", text: "Since childhood, I have struggled with attention, distractibility, or staying on task." },
  { id: "nd_2", domain: "neurodev", text: "Since childhood, organization/time management/following multi-step tasks has been persistently difficult." },
  { id: "nd_3", domain: "neurodev", text: "Across my life, I have had persistent differences in social communication compared to peers." },

  { id: "psy_1", domain: "psychotic", text: "I have perceived things (voices, visions, sensations) that others around me did not perceive." },
  { id: "psy_2", domain: "psychotic", text: "I have had beliefs that felt very certain even when others strongly disagreed." },
  { id: "psy_3", domain: "psychotic", text: "At times my thoughts felt disorganized or hard to communicate clearly." },

  { id: "bp_1", domain: "bipolar", text: "I have had periods of unusually high energy or irritability clearly different from my usual self." },
  { id: "bp_2", domain: "bipolar", text: "During these periods, I needed much less sleep and still felt energized." },
  { id: "bp_3", domain: "bipolar", text: "During these periods, I became unusually talkative/fast-thinking/impulsive/risk-taking." },

  { id: "dep_1", domain: "depressive", text: "I have felt down, empty, numb, or hopeless for days at a time or longer." },
  { id: "dep_2", domain: "depressive", text: "I have lost interest or pleasure in activities that normally matter to me." },
  { id: "dep_3", domain: "depressive", text: "My energy/motivation/ability to function has dropped noticeably compared to my usual self." },

  { id: "anx_1", domain: "anxiety", text: "I experience excessive worry or fear that I have difficulty shutting off." },
  { id: "anx_2", domain: "anxiety", text: "I avoid situations or activities because of fear/anxiety/panic-like feelings." },
  { id: "anx_3", domain: "anxiety", text: "Anxiety often shows up in my body (tension, racing heart, restlessness, stomach distress)." },

  { id: "ocd_1", domain: "ocd_related", text: "I have unwanted thoughts/images/urges that intrude repeatedly and feel difficult to dismiss." },
  { id: "ocd_2", domain: "ocd_related", text: "I feel driven to repeat behaviors/mental acts (checking, cleaning, counting, reassurance)." },
  { id: "ocd_3", domain: "ocd_related", text: "These intrusions or repetitive behaviors take significant time or interfere with daily life." },

  { id: "tr_1", domain: "trauma", text: "I have experienced events that felt terrifying, threatening, or deeply overwhelming." },
  { id: "tr_2", domain: "trauma", text: "I have unwanted memories, nightmares, or reliving experiences linked to those events." },
  { id: "tr_3", domain: "trauma", text: "I avoid reminders and/or feel persistently on edge/watchful/easily startled." },

  { id: "dis_1", domain: "dissociative", text: "At times I feel unreal/detached or as if observing myself from the outside." },
  { id: "dis_2", domain: "dissociative", text: "I have unusual gaps in memory (missing chunks of time or events I should remember)." },

  { id: "som_1", domain: "somatic", text: "Physical symptoms/bodily sensations are a major source of distress or preoccupation for me." },
  { id: "som_2", domain: "somatic", text: "I spend significant time worrying about health, monitoring symptoms, or seeking reassurance." },

  { id: "eat_1", domain: "eating", text: "My eating patterns feel out of control or difficult to regulate (restriction, bingeing, cycling extremes)." },
  { id: "eat_2", domain: "eating", text: "Body weight/shape or fear of weight change strongly affects my self-worth or behavior." },

  { id: "elim_1", domain: "elimination", text: "I have had repeated problems with urination control where control is expected." },
  { id: "elim_2", domain: "elimination", text: "I have had repeated problems with bowel control where control is expected." },

  { id: "slp_1", domain: "sleep", text: "I struggle to fall asleep, stay asleep, or wake too early despite trying to sleep." },
  { id: "slp_2", domain: "sleep", text: "I experience problematic daytime sleepiness, unrefreshing sleep, or sudden sleep episodes." },

  { id: "sex_1", domain: "sexual_dysfunction", text: "I have persistent difficulties with sexual desire, arousal, orgasm, or satisfaction." },
  { id: "sex_2", domain: "sexual_dysfunction", text: "These sexual difficulties cause distress for me or strain my relationship(s)." },

  { id: "gd_1", domain: "gender_dysphoria", text: "I experience a persistent mismatch between my internal gender experience and my body/social expectations." },
  { id: "gd_2", domain: "gender_dysphoria", text: "This mismatch has caused significant distress or impairment for me." },

  { id: "imp_1", domain: "impulse_conduct", text: "I have frequent difficulty controlling anger, aggression, or intense irritability." },
  { id: "imp_2", domain: "impulse_conduct", text: "I act impulsively in ways I later regret (spending, risky choices, fights, consequences)." },

  { id: "sub_1", domain: "substance", text: "I use alcohol/drugs/behaviors more than I intend or longer than I intend." },
  { id: "sub_2", domain: "substance", text: "I have tried to cut down or stop and found it difficult." },
  { id: "sub_3", domain: "substance", text: "My use has caused repeated problems in responsibilities, health, safety, or relationships." },

  { id: "nc_1", domain: "neurocognitive", text: "I have noticed a decline in memory/attention/language/thinking compared to my earlier baseline." },
  { id: "nc_2", domain: "neurocognitive", text: "These cognitive changes interfere with daily tasks (finances, meds, driving, safety)." },

  { id: "pd_1", domain: "personality_screen", text: "Over many years, my relationships have been chronically unstable, intense, conflictual, or distant." },
  { id: "pd_2", domain: "personality_screen", text: "Over many years, my patterns in thinking/feeling/behaving repeatedly create problems." },
  { id: "pd_3", domain: "personality_screen", text: "People often react strongly to my long-term style (rigid, dramatic, distant, suspicious, etc.)." },

  { id: "para_1", domain: "paraphilic_screen", text: "Some sexual interests or impulses cause me distress, shame, or worry." },
  { id: "para_2", domain: "paraphilic_screen", text: "My sexual interests/impulses have created problems or I feel I may not have full control over them." },
];

function qById(id: string): Question {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Missing question id: ${id}`);
  return q;
}

function sevId(domainId: DomainId, kind: "distress" | "impair" | "duration"): string {
  return `sev_${domainId}_${kind}`;
}

function computeDomainStatus(
  domain: DomainRule,
  answers: Answers,
  touched: Touched
): { status: DomainStatus; gateComplete: boolean } {
  const gateComplete = domain.gateQids.every((qid) => !!touched[qid]);
  const vals = domain.gateQids
    .map((qid) => answers[qid])
    .filter((v): v is Likert0to4 => isLikert(v));

  if (!gateComplete) {
    const anyHigh = vals.some((v) => v >= ACTIVATION.anyItemAtOrAbove);
    return { status: anyHigh ? "POSITIVE" : "PENDING", gateComplete: false };
  }

  const anyHigh = vals.some((v) => v >= ACTIVATION.anyItemAtOrAbove);
  const countMid = vals.filter((v) => v >= ACTIVATION.twoItemsAtOrAbove).length;
  const positive = anyHigh || countMid >= 2;

  return { status: positive ? "POSITIVE" : "NEGATIVE", gateComplete: true };
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

function SafetyBanner({ onGoSafety }: { onGoSafety: () => void }) {
  return (
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
      <div style={{ fontWeight: 950, marginBottom: 6 }}>Safety flag (immediate attention recommended)</div>
      <div style={{ fontSize: 13, lineHeight: 1.35 }}>
        Your responses suggest possible safety-related thoughts. If you are in danger right now or feel you might act on
        these thoughts, seek immediate help.
        <div style={{ marginTop: 8 }}>
          <strong>U.S.:</strong> Call or text <strong>988</strong>, or call <strong>911</strong>.
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={onGoSafety}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #7f1d1d",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Go to Safety Check-In
        </button>
      </div>
    </div>
  );
}

function LikertQuestionCard(props: {
  labelTop?: string;
  qid: string;
  text: string;
  value: Likert0to4;
  onChange: (qid: string, v: Likert0to4) => void;
}) {
  const { labelTop, qid, text, value, onChange } = props;
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 10 }}>
      {labelTop ? <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{labelTop}</div> : null}
      <div style={{ marginBottom: 10 }}>{text}</div>

      <div style={{ display: "grid", gap: 6 }}>
        {LIKERT_VALUES.map((val) => (
          <label key={val} style={{ display: "flex", gap: 8, cursor: "pointer" }}>
            <input type="radio" name={qid} checked={value === val} onChange={() => onChange(qid, val)} />
            <span>{LIKERT_LABELS[val]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

type Level2LaunchConfig = {
  domainId: Level1DomainId;
  label: string;
  path: string;
};

const LEVEL2_LAUNCHERS: Level2LaunchConfig[] = MODULE_ORDER.map((m) => ({
  domainId: m.domainId,
  label: `Open Level 2 — ${m.label}`,
  path: m.path,
}));

export default function Level1ScreenerPlayground() {
  const navigate = useNavigate();

  type Step = "SAFETY" | DomainId;
  const [step, setStep] = useState<Step>("SAFETY");

  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const q of QUESTIONS) init[q.id] = 0;
    for (const d of DOMAIN_RULES) {
      init[sevId(d.id, "distress")] = 0;
      init[sevId(d.id, "impair")] = 0;
      init[sevId(d.id, "duration")] = 0;
    }
    return init;
  });

  const [touched, setTouched] = useState<Touched>({});

  const setLikert = (qid: string, v: Likert0to4) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    setTouched((prev) => ({ ...prev, [qid]: true }));
  };

  const safetySelfHarm = (answers["g_selfharm"] as Likert0to4) >= SAFETY_THRESHOLD;
  const safetyHarmOthers = (answers["g_harm_others"] as Likert0to4) >= SAFETY_THRESHOLD;
  const showSafetyBanner = safetySelfHarm || safetyHarmOthers;

  const currentDomainIndex = step === "SAFETY" ? -1 : DOMAIN_RULES.findIndex((d) => d.id === step);
  const currentDomain = step === "SAFETY" ? null : DOMAIN_RULES[currentDomainIndex];

  const domainsWithStatus = useMemo(() => {
    return DOMAIN_RULES.map((d) => {
      const res = computeDomainStatus(d, answers, touched);
      return { ...d, status: res.status, gateComplete: res.gateComplete };
    });
  }, [answers, touched]);

  const activatedDomains = useMemo(
    () => domainsWithStatus.filter((d) => d.status === "POSITIVE").map((d) => d.id),
    [domainsWithStatus]
  );

  function isRouteEligible(domainId: DomainId): boolean {
    const d = domainsWithStatus.find((x) => x.id === domainId);
    if (!d || d.status !== "POSITIVE") return false;

    const crit = criteriaFor(domainId);
    const distressId = sevId(domainId, "distress");
    const impairId = sevId(domainId, "impair");
    const durationId = sevId(domainId, "duration");

    const sevDone = !!touched[distressId] && !!touched[impairId] && !!touched[durationId];
    if (!sevDone) return false;

    const distress = answers[distressId] as Likert0to4;
    const impair = answers[impairId] as Likert0to4;
    const duration = answers[durationId] as Likert0to4;

    const meetsSeverity = distress >= crit.minDistress || impair >= crit.minImpair;
    const meetsDuration = !crit.requireDuration || duration >= crit.minDurationResponse;

    return meetsSeverity && meetsDuration;
  }

  const routedDomains = useMemo(
    () => activatedDomains.filter((id) => isRouteEligible(id)),
    [activatedDomains, answers, touched, domainsWithStatus]
  );

  const eligibleLaunchers = useMemo(() => {
    return LEVEL2_LAUNCHERS.filter((launcher) =>
      routedDomains.includes(launcher.domainId as DomainId)
    );
  }, [routedDomains]);

  const nextEligibleLauncher = useMemo(() => {
    if (eligibleLaunchers.length === 0) return null;
    return eligibleLaunchers[0];
  }, [eligibleLaunchers]);

  function goNext() {
    if (step === "SAFETY") {
      setStep(DOMAIN_RULES[0].id);
      return;
    }
    const nextIdx = currentDomainIndex + 1;
    if (nextIdx >= DOMAIN_RULES.length) return;
    setStep(DOMAIN_RULES[nextIdx].id);
  }

  function goPrev() {
    if (step === "SAFETY") return;
    const prevIdx = currentDomainIndex - 1;
    if (prevIdx < 0) {
      setStep("SAFETY");
      return;
    }
    setStep(DOMAIN_RULES[prevIdx].id);
  }

  const lastAutoAdvanceToken = useRef<string>("");

  const currentDomainStatus: DomainStatus | null = useMemo(() => {
    if (!currentDomain) return null;
    return computeDomainStatus(currentDomain, answers, touched).status;
  }, [currentDomain, answers, touched]);

  const currentGateComplete = useMemo(() => {
    if (!currentDomain) return false;
    return computeDomainStatus(currentDomain, answers, touched).gateComplete;
  }, [currentDomain, answers, touched]);

  const severityCompleteForCurrentDomain = useMemo(() => {
    if (!currentDomain) return false;
    const a = sevId(currentDomain.id, "distress");
    const b = sevId(currentDomain.id, "impair");
    const c = sevId(currentDomain.id, "duration");
    return !!touched[a] && !!touched[b] && !!touched[c];
  }, [currentDomain, touched]);

  useEffect(() => {
    if (step === "SAFETY") return;
    if (!currentDomain) return;

    const token = `${currentDomain.id}:${currentDomainStatus}:${currentGateComplete}:${severityCompleteForCurrentDomain}`;
    if (lastAutoAdvanceToken.current === token) return;

    if (currentDomainStatus === "NEGATIVE" && currentGateComplete) {
      lastAutoAdvanceToken.current = token;
      goNext();
      return;
    }
    if (currentDomainStatus === "POSITIVE" && severityCompleteForCurrentDomain) {
      lastAutoAdvanceToken.current = token;
      goNext();
      return;
    }

    lastAutoAdvanceToken.current = token;
  }, [step, currentDomain, currentDomainStatus, currentGateComplete, severityCompleteForCurrentDomain]);

  const payload = useMemo(() => {
    return {
      version: "level1-domain-wizard-clean",
      safety: {
        threshold: SAFETY_THRESHOLD,
        selfHarm: answers["g_selfharm"],
        harmOthers: answers["g_harm_others"],
      },
      activatedDomains,
      routedDomains,
      answers,
      touched,
    };
  }, [answers, touched, activatedDomains, routedDomains]);

  const savePayloadAndNavigate = (path: string) => {
    clinicalSessionStore.setItem("asq_level1_payload", JSON.stringify(payload));
    navigate(path);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Level 1 — Domain Screener</h2>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
        Domains are assessed separately. Follow-up questions appear only in domains that screen positive.
      </div>

      {showSafetyBanner ? <SafetyBanner onGoSafety={() => setStep("SAFETY")} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Steps</h3>

          <button
            type="button"
            onClick={() => setStep("SAFETY")}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: step === "SAFETY" ? "#eef2ff" : "white",
              textAlign: "left",
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            <strong>Safety Check-In</strong>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Immediate support signals</div>
          </button>

          <div style={{ display: "grid", gap: 8 }}>
            {domainsWithStatus.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setStep(d.id)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: step === d.id ? "#eef2ff" : "white",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <strong>
                      {d.number}. {d.softTitle}
                    </strong>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{d.softSubtitle}</div>
                    {d.note ? <div style={{ fontSize: 12, opacity: 0.75 }}>{d.note}</div> : null}
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {d.status === "POSITIVE"
                        ? `Positive · Route: ${isRouteEligible(d.id) ? "YES" : "no"}`
                        : d.status === "NEGATIVE"
                          ? "Negative"
                          : "Pending"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Activated: <strong>{activatedDomains.length}</strong> · Routed to Level 2:{" "}
            <strong>{routedDomains.length}</strong>
          </div>
        </div>

        <div>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            {step === "SAFETY" ? (
              <>
                <h3 style={{ marginTop: 0 }}>Safety Check-In</h3>
                <MiniHeader title="Safety" />

                <LikertQuestionCard
                  labelTop="g_selfharm"
                  qid="g_selfharm"
                  text={qById("g_selfharm").text}
                  value={answers["g_selfharm"] as Likert0to4}
                  onChange={setLikert}
                />

                <LikertQuestionCard
                  labelTop="g_harm_others"
                  qid="g_harm_others"
                  text={qById("g_harm_others").text}
                  value={answers["g_harm_others"] as Likert0to4}
                  onChange={setLikert}
                />
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                  {currentDomain?.number}. {currentDomain?.softTitle}
                </h3>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>{currentDomain?.softSubtitle}</div>

                <MiniHeader title="Quick check" />
                {currentDomain?.gateQids.map((qid) => {
                  const q = qById(qid);
                  return (
                    <LikertQuestionCard
                      key={qid}
                      labelTop={q.id}
                      qid={qid}
                      text={q.text}
                      value={answers[qid] as Likert0to4}
                      onChange={setLikert}
                    />
                  );
                })}

                {currentDomainStatus === "POSITIVE" && currentDomain ? (
                  <>
                    <MiniHeader title="Impact for this area" />
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                      These questions help decide whether this area should continue to a deeper follow-up module.
                    </div>

                    {(() => {
                      const distressId = sevId(currentDomain.id, "distress");
                      const impairId = sevId(currentDomain.id, "impair");
                      const durationId = sevId(currentDomain.id, "duration");
                      const crit = criteriaFor(currentDomain.id);

                      const sevDone =
                        !!touched[distressId] && !!touched[impairId] && !!touched[durationId];
                      const distress = answers[distressId] as Likert0to4;
                      const impair = answers[impairId] as Likert0to4;
                      const duration = answers[durationId] as Likert0to4;

                      const meetsSeverity = distress >= crit.minDistress || impair >= crit.minImpair;
                      const meetsDuration = !crit.requireDuration || duration >= crit.minDurationResponse;
                      const eligible = sevDone && meetsSeverity && meetsDuration;

                      return (
                        <>
                          <LikertQuestionCard
                            labelTop={distressId}
                            qid={distressId}
                            text={`Considering this area only: it causes me significant distress (worry, sadness, fear, shame, overwhelm).`}
                            value={distress}
                            onChange={setLikert}
                          />
                          <LikertQuestionCard
                            labelTop={impairId}
                            qid={impairId}
                            text={`Considering this area only: it interferes with work/school, relationships, health, or daily responsibilities.`}
                            value={impair}
                            onChange={setLikert}
                          />
                          <LikertQuestionCard
                            labelTop={durationId}
                            qid={durationId}
                            text={`Considering this area only: the pattern has been present long enough to matter. (0=brief/one-time, 1=<1 month, 2=1–3 months, 3=3–6+ months, 4=6+ months/persistent).`}
                            value={duration}
                            onChange={setLikert}
                          />

                          <div
                            style={{
                              marginTop: 6,
                              padding: 10,
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div style={{ fontSize: 12, opacity: 0.85 }}>
                              Follow-up eligibility: <strong>{eligible ? "YES" : "Not yet / NO"}</strong>
                              <div style={{ marginTop: 6 }}>
                                Rule: distress ≥ {crit.minDistress} OR impairment ≥ {crit.minImpair} AND duration ≥{" "}
                                {crit.minDurationResponse}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : null}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={goPrev}
              disabled={step === "SAFETY"}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
            >
              Previous
            </button>

            <button
              type="button"
              onClick={goNext}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc" }}
            >
              Next
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                alert("Level 1 payload copied to clipboard.");
              }}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111" }}
            >
              Copy Level 1 Payload
            </button>

            <button
              type="button"
              disabled={!nextEligibleLauncher}
              onClick={() => {
                if (nextEligibleLauncher) savePayloadAndNavigate(nextEligibleLauncher.path);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #111",
                opacity: nextEligibleLauncher ? 1 : 0.45,
              }}
              title={
                nextEligibleLauncher
                  ? `Open ${nextEligibleLauncher.label}`
                  : "No currently wired Level 2 module is eligible"
              }
            >
              {nextEligibleLauncher
                ? nextEligibleLauncher.label
                : "Open next eligible Level 2 — none"}
            </button>
          </div>

          <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Eligible Level 2 Modules</h3>

            {eligibleLaunchers.length > 0 ? (
              <>
                <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
                  These deeper modules are currently eligible based on your Level 1 responses.
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {eligibleLaunchers.map((launcher) => (
                    <button
                      key={launcher.domainId}
                      type="button"
                      onClick={() => savePayloadAndNavigate(launcher.path)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "white",
                        cursor: "pointer",
                      }}
                      title={launcher.label}
                    >
                      {launcher.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                No currently wired Level 2 module is route-eligible yet. Complete the relevant domain gate and impact
                questions to unlock deeper follow-up.
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Live Payload Preview</h3>
            <textarea
              readOnly
              value={JSON.stringify(
                {
                  safety: payload.safety,
                  activatedDomains: payload.activatedDomains,
                  routedDomains: payload.routedDomains,
                },
                null,
                2
              )}
              style={{
                width: "100%",
                minHeight: 200,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}