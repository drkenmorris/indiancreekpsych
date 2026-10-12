"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type StimulusType = "GO" | "NOGO";
type GoNoGoPhase = "IDLE" | "WAITING" | "STIMULUS_VISIBLE" | "COMPLETE";

type GoNoGoTrialRecord = {
  trialNumber: number;
  stimulus: StimulusType;
  responded: boolean;
  wasCorrect: boolean;
  reactionTimeMs: number | null;
};

export type GoNoGoTaskResult = {
  totalTrials: number;
  completedTrials: number;
  accuracyPct: number;
  correctGoResponses: number;
  commissionErrors: number;
  omissions: number;
  meanReactionTimeMs: number | null;
  trials: GoNoGoTrialRecord[];
};

type GoNoGoTaskPlayerProps = {
  onComplete?: (result: GoNoGoTaskResult) => void;
};

const TOTAL_TRIALS = 12;
const GO_PROBABILITY = 0.75;
const MIN_DELAY_MS = 800;
const MAX_DELAY_MS = 1800;
const RESPONSE_WINDOW_MS = 1200;
const INTER_TRIAL_MS = 700;

export default function GoNoGoTaskPlayer({ onComplete }: GoNoGoTaskPlayerProps) {
  const [phase, setPhase] = useState<GoNoGoPhase>("IDLE");
  const [trialIndex, setTrialIndex] = useState(0);
  const [message, setMessage] = useState("Press Start Task to begin the Go / No-Go task.");
  const [stimulus, setStimulus] = useState<StimulusType | null>(null);
  const [trials, setTrials] = useState<GoNoGoTrialRecord[]>([]);

  const stimulusShownAtRef = useRef<number | null>(null);
  const responseRecordedRef = useRef(false);
  const delayTimeoutRef = useRef<number | null>(null);
  const responseTimeoutRef = useRef<number | null>(null);
  const nextTrialTimeoutRef = useRef<number | null>(null);

  const summary = useMemo(() => {
    const goTrials = trials.filter((t) => t.stimulus === "GO");
    const noGoTrials = trials.filter((t) => t.stimulus === "NOGO");

    const correctGoResponses = goTrials.filter((t) => t.wasCorrect).length;
    const commissionErrors = noGoTrials.filter((t) => t.responded).length;
    const omissions = goTrials.filter((t) => !t.responded).length;

    const reactionTimes = goTrials
      .map((t) => t.reactionTimeMs)
      .filter((v): v is number => typeof v === "number");

    const meanReactionTimeMs =
      reactionTimes.length > 0
        ? reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length
        : null;

    const accuracyPct =
      trials.length > 0
        ? (trials.filter((t) => t.wasCorrect).length / trials.length) * 100
        : 0;

    return {
      totalTrials: TOTAL_TRIALS,
      completedTrials: trials.length,
      accuracyPct,
      correctGoResponses,
      commissionErrors,
      omissions,
      meanReactionTimeMs,
      trials,
    };
  }, [trials]);

  function clearTimers() {
    if (delayTimeoutRef.current !== null) {
      window.clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    if (responseTimeoutRef.current !== null) {
      window.clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    if (nextTrialTimeoutRef.current !== null) {
      window.clearTimeout(nextTrialTimeoutRef.current);
      nextTrialTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (phase !== "STIMULUS_VISIBLE") return;
      if (event.code === "Space" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleResponse();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase, stimulus, trialIndex, trials]);

  function randomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
  }

  function nextStimulus(): StimulusType {
    return Math.random() < GO_PROBABILITY ? "GO" : "NOGO";
  }

  function startTask() {
    clearTimers();
    setTrials([]);
    setTrialIndex(0);
    setStimulus(null);
    setPhase("WAITING");
    setMessage("Get ready...");
    responseRecordedRef.current = false;
    stimulusShownAtRef.current = null;

    delayTimeoutRef.current = window.setTimeout(() => {
      beginTrial(0, []);
    }, 500);
  }

  function restartTask() {
    startTask();
  }

  function beginTrial(nextIndex: number, existingTrials: GoNoGoTrialRecord[]) {
    if (nextIndex >= TOTAL_TRIALS) {
      setPhase("COMPLETE");
      setStimulus(null);
      setMessage("Go / No-Go task completed.");
      return;
    }

    setTrialIndex(nextIndex);
    setPhase("WAITING");
    setStimulus(null);
    setMessage("Wait for the stimulus...");

    delayTimeoutRef.current = window.setTimeout(() => {
      const currentStimulus = nextStimulus();
      setStimulus(currentStimulus);
      setPhase("STIMULUS_VISIBLE");
      setMessage(
        currentStimulus === "GO"
          ? "GO stimulus: respond now."
          : "NO-GO stimulus: do NOT respond."
      );

      stimulusShownAtRef.current = performance.now();
      responseRecordedRef.current = false;

      responseTimeoutRef.current = window.setTimeout(() => {
        if (responseRecordedRef.current) return;

        const completedTrial: GoNoGoTrialRecord = {
          trialNumber: nextIndex + 1,
          stimulus: currentStimulus,
          responded: false,
          wasCorrect: currentStimulus === "NOGO",
          reactionTimeMs: null,
        };

        const updatedTrials = [...existingTrials, completedTrial];
        setTrials(updatedTrials);
        setStimulus(null);
        setPhase("WAITING");
        setMessage(
          currentStimulus === "GO"
            ? "Missed GO stimulus. Moving to next trial..."
            : "Correct inhibition. Moving to next trial..."
        );
        stimulusShownAtRef.current = null;

        nextTrialTimeoutRef.current = window.setTimeout(() => {
          beginTrial(nextIndex + 1, updatedTrials);
        }, INTER_TRIAL_MS);
      }, RESPONSE_WINDOW_MS);
    }, randomDelay());
  }

  function handleResponse() {
    if (phase !== "STIMULUS_VISIBLE") return;
    if (stimulus === null) return;
    if (stimulusShownAtRef.current === null) return;
    if (responseRecordedRef.current) return;

    responseRecordedRef.current = true;
    clearTimers();

    const reactionTimeMs = performance.now() - stimulusShownAtRef.current;

    const completedTrial: GoNoGoTrialRecord = {
      trialNumber: trialIndex + 1,
      stimulus,
      responded: true,
      wasCorrect: stimulus === "GO",
      reactionTimeMs,
    };

    const updatedTrials = [...trials, completedTrial];
    setTrials(updatedTrials);
    setStimulus(null);
    setPhase("WAITING");
    setMessage(
      stimulus === "GO"
        ? `GO response recorded: ${Math.round(reactionTimeMs)} ms`
        : "Commission error recorded. Moving to next trial..."
    );
    stimulusShownAtRef.current = null;

    nextTrialTimeoutRef.current = window.setTimeout(() => {
      beginTrial(trialIndex + 1, updatedTrials);
    }, INTER_TRIAL_MS);
  }

  function finishTask() {
    if (phase !== "COMPLETE") return;

    onComplete?.({
      totalTrials: summary.totalTrials,
      completedTrials: summary.completedTrials,
      accuracyPct: summary.accuracyPct,
      correctGoResponses: summary.correctGoResponses,
      commissionErrors: summary.commissionErrors,
      omissions: summary.omissions,
      meanReactionTimeMs: summary.meanReactionTimeMs,
      trials: summary.trials,
    });
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        background: "#ffffff",
        padding: "1rem",
        display: "grid",
        gap: "1rem",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Go / No-Go Task</h3>

      <div style={{ fontSize: "0.95rem", color: "#374151", lineHeight: 1.7 }}>
        <div>
          <strong>Trial:</strong> {Math.min(trialIndex + 1, TOTAL_TRIALS)} / {TOTAL_TRIALS}
        </div>
        <div>
          <strong>Status:</strong> {phase}
        </div>
        <div>
          <strong>Message:</strong> {message}
        </div>
      </div>

      <div
        onClick={phase === "STIMULUS_VISIBLE" ? handleResponse : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && phase === "STIMULUS_VISIBLE") {
            event.preventDefault();
            handleResponse();
          }
        }}
        style={{
          minHeight: "130px",
          borderRadius: "0.5rem",
          border: "1px dashed #d1d5db",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            stimulus === "GO"
              ? "#dcfce7"
              : stimulus === "NOGO"
                ? "#fee2e2"
                : "#f9fafb",
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "#111827",
          cursor: phase === "STIMULUS_VISIBLE" ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        {stimulus === "GO" && "GO"}
        {stimulus === "NOGO" && "NO-GO"}
        {stimulus === null && (phase === "WAITING" ? "..." : "READY")}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            padding: "0.7rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            cursor: "pointer",
          }}
          onClick={startTask}
          disabled={phase === "WAITING" || phase === "STIMULUS_VISIBLE"}
        >
          Start Task
        </button>

        <button
          type="button"
          style={{
            padding: "0.7rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            cursor: "pointer",
          }}
          onClick={restartTask}
        >
          Restart Task
        </button>

        <button
          type="button"
          style={{
            padding: "0.7rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            cursor: phase === "COMPLETE" ? "pointer" : "not-allowed",
            opacity: phase === "COMPLETE" ? 1 : 0.6,
          }}
          onClick={finishTask}
          disabled={phase !== "COMPLETE"}
        >
          Complete Go / No-Go Task
        </button>
      </div>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "0.5rem",
          background: "#ffffff",
          padding: "1rem",
        }}
      >
        <h4 style={{ marginTop: 0 }}>Task Snapshot</h4>
        <div style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7 }}>
          <div>
            <strong>Completed Trials:</strong> {trials.length}
          </div>
          <div>
            <strong>Accuracy:</strong> {Math.round(summary.accuracyPct)}%
          </div>
          <div>
            <strong>Correct GO Responses:</strong> {summary.correctGoResponses}
          </div>
          <div>
            <strong>Commission Errors:</strong> {summary.commissionErrors}
          </div>
          <div>
            <strong>Omissions:</strong> {summary.omissions}
          </div>
          <div>
            <strong>Mean GO Reaction Time:</strong>{" "}
            {summary.meanReactionTimeMs !== null ? `${Math.round(summary.meanReactionTimeMs)} ms` : "—"}
          </div>
        </div>
      </section>
    </div>
  );
}