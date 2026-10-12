"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_REACTION_TASK_CONFIG,
  buildEmptyReactionTrial,
  finalizeReactionTaskResult,
  getRandomDelay,
} from "./reactionTask";
import type {
  ReactionTaskConfig,
  ReactionTrialRecord,
  TaskResult,
  TaskPhase,
} from "../../types/taskTypes";

type ReactionTaskPlayerProps = {
  config?: Partial<ReactionTaskConfig>;
  onComplete?: (result: TaskResult) => void;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  background: "#ffffff",
  padding: "1rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.7rem 1rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "0.95rem",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

export default function ReactionTaskPlayer({
  config,
  onComplete,
}: ReactionTaskPlayerProps) {
  const mergedConfig: ReactionTaskConfig = useMemo(
    () => ({
      ...DEFAULT_REACTION_TASK_CONFIG,
      ...config,
      domain: "REACTION_SPEED",
    }),
    [config]
  );

  const [phase, setPhase] = useState<TaskPhase>("IDLE");
  const [trialIndex, setTrialIndex] = useState(0);
  const [trials, setTrials] = useState<ReactionTrialRecord[]>([]);
  const [message, setMessage] = useState("Press start to begin the reaction task.");
  const [result, setResult] = useState<TaskResult | null>(null);

  const timeoutRef = useRef<number | null>(null);
  const responseTimeoutRef = useRef<number | null>(null);
  const targetShownAtRef = useRef<number | null>(null);
  const targetAreaRef = useRef<HTMLDivElement | null>(null);

  function clearTimers() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (responseTimeoutRef.current !== null) {
      window.clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (phase !== "TARGET_VISIBLE") return;

      if (event.code === "Space" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleResponse();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase, trialIndex, trials]);

  useEffect(() => {
    if (phase === "TARGET_VISIBLE") {
      targetAreaRef.current?.focus();
    }
  }, [phase]);

  function startTask() {
    clearTimers();
    targetShownAtRef.current = null;
    setTrials([]);
    setTrialIndex(0);
    setResult(null);
    setPhase("READY");
    setMessage("Get ready...");
    window.setTimeout(() => {
      beginNextTrial(0, []);
    }, 500);
  }

  function beginNextTrial(nextIndex: number, existingTrials: ReactionTrialRecord[]) {
    if (nextIndex >= mergedConfig.totalTrials) {
      const finalResult = finalizeReactionTaskResult(mergedConfig, existingTrials);
      setResult(finalResult);
      setPhase("COMPLETE");
      setMessage("Task complete.");
      onComplete?.(finalResult);
      return;
    }

    setTrialIndex(nextIndex);
    setPhase("WAITING");
    setMessage("Wait for the target...");

    const delay = getRandomDelay(mergedConfig.minDelayMs, mergedConfig.maxDelayMs);

    timeoutRef.current = window.setTimeout(() => {
      targetShownAtRef.current = performance.now();
      setPhase("TARGET_VISIBLE");
      setMessage("TARGET! Click the green target area, click Respond, or press Space/Enter.");

      responseTimeoutRef.current = window.setTimeout(() => {
        const omissionTrial: ReactionTrialRecord = {
          ...buildEmptyReactionTrial(nextIndex + 1),
          targetShownAt: targetShownAtRef.current,
          respondedAt: null,
          reactionTime: null,
          wasCorrect: false,
          wasOmission: true,
        };

        const updatedTrials = [...existingTrials, omissionTrial];
        setTrials(updatedTrials);
        setMessage("No response detected. Moving to next trial...");
        targetShownAtRef.current = null;

        window.setTimeout(() => {
          beginNextTrial(nextIndex + 1, updatedTrials);
        }, 700);
      }, mergedConfig.responseWindowMs);
    }, delay);
  }

  function handleResponse() {
    if (phase !== "TARGET_VISIBLE") return;
    if (targetShownAtRef.current === null) return;

    const respondedAt = performance.now();
    const reactionTime = respondedAt - targetShownAtRef.current;

    clearTimers();

    const completedTrial: ReactionTrialRecord = {
      ...buildEmptyReactionTrial(trialIndex + 1),
      targetShownAt: targetShownAtRef.current,
      respondedAt,
      reactionTime,
      wasCorrect: true,
      wasOmission: false,
    };

    const updatedTrials = [...trials, completedTrial];
    setTrials(updatedTrials);
    setMessage(`Recorded reaction time: ${Math.round(reactionTime)} ms`);
    targetShownAtRef.current = null;

    window.setTimeout(() => {
      beginNextTrial(trialIndex + 1, updatedTrials);
    }, 700);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Reaction Speed Task</h3>
        <div style={{ fontSize: "0.95rem", color: "#374151", lineHeight: 1.7 }}>
          <div>
            <strong>Trial:</strong>{" "}
            {phase === "COMPLETE"
              ? mergedConfig.totalTrials
              : Math.min(trialIndex + 1, mergedConfig.totalTrials)}{" "}
            / {mergedConfig.totalTrials}
          </div>
          <div>
            <strong>Status:</strong> {phase}
          </div>
          <div>
            <strong>Message:</strong> {message}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div
          ref={targetAreaRef}
          tabIndex={0}
          role="button"
          aria-label="Reaction target area"
          onClick={handleResponse}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              handleResponse();
            }
          }}
          style={{
            minHeight: "140px",
            borderRadius: "0.5rem",
            border: "1px dashed #d1d5db",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: phase === "TARGET_VISIBLE" ? "#dcfce7" : "#f9fafb",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#111827",
            cursor: phase === "TARGET_VISIBLE" ? "pointer" : "default",
            outline: "none",
            userSelect: "none",
          }}
        >
          {phase === "TARGET_VISIBLE" ? "TARGET" : phase === "WAITING" ? "..." : "READY"}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" style={primaryButtonStyle} onClick={startTask}>
            Start Task
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={handleResponse}
            disabled={phase !== "TARGET_VISIBLE"}
          >
            Respond
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h4 style={{ marginTop: 0 }}>Trial Snapshot</h4>
        <div style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7 }}>
          <div>
            <strong>Completed Trials:</strong> {trials.length}
          </div>
          <div>
            <strong>Last Reaction Time:</strong>{" "}
            {trials.length > 0 && trials[trials.length - 1].reactionTime !== null
              ? `${Math.round(trials[trials.length - 1].reactionTime as number)} ms`
              : "—"}
          </div>
        </div>
      </section>

      {result ? (
        <section style={cardStyle}>
          <h4 style={{ marginTop: 0 }}>Task Result</h4>
          <div style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7 }}>
            <div>
              <strong>Accuracy:</strong> {Math.round(result.accuracy * 100)}%
            </div>
            <div>
              <strong>Mean Reaction Time:</strong> {Math.round(result.meanReactionTime)} ms
            </div>
            <div>
              <strong>Variability:</strong> {Math.round(result.variability)} ms
            </div>
            <div>
              <strong>Correct Responses:</strong> {result.correctResponses}
            </div>
            <div>
              <strong>Omissions:</strong> {result.omittedResponses}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}