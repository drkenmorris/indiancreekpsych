"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import { loadCogSwitchSettings } from "../services/persistence/cogSwitchSettingsStorage";
import ReactionTaskPlayer from "../tasks/reaction/ReactionTaskPlayer";
import GoNoGoTaskPlayer from "../tasks/goNoGo/GoNoGoTaskPlayer";
import type { TaskResult } from "../types/taskTypes";
import { TaskRunner } from "../engine/TaskRunner";

const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  background: "#ffffff",
  padding: "1rem",
};

const buttonStyle: CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

const assessmentTasks = [
  {
    id: "reaction",
    title: "Reaction Speed",
    description: "Simple stimulus-response baseline task",
    estimatedDurationSec: 90,
  },
  {
    id: "gonogo",
    title: "Go / No-Go",
    description: "Measures inhibitory control and commission errors.",
    estimatedDurationSec: 120,
  },
];

export default function CogSwitchAssessment() {
  const navigate = useNavigate();
  const settings = loadCogSwitchSettings();

  const runner = useMemo(() => new TaskRunner(assessmentTasks), []);
  const [runnerSnapshot, setRunnerSnapshot] = useState(runner.getSnapshot());
  const [reactionResult, setReactionResult] = useState<TaskResult | null>(null);

  useEffect(() => {
    return runner.subscribe(setRunnerSnapshot);
  }, [runner]);

  useEffect(() => {
    if (runnerSnapshot.status === "ready") {
      runner.start();
    }
  }, [runner, runnerSnapshot.status]);

  const currentTaskId = runnerSnapshot.currentTask?.definition.id;

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>CogSwitch Assessment</h2>
      <p style={{ opacity: 0.8, maxWidth: 900 }}>
        The assessment module is now beginning to collect real performance data. The first live
        task below measures baseline reaction speed and timing variability.
      </p>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Assessment Context</h3>
        <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#374151" }}>
          <div>
            <strong>Mode:</strong> {settings.mode}
          </div>
          <div>
            <strong>Age Profile:</strong> {settings.ageProfile}
          </div>
          <div>
            <strong>Session Style:</strong> {settings.sessionStyle}
          </div>
          <div>
            <strong>Dual Task:</strong> {settings.dualTaskEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
      </section>

      <section style={{ marginTop: "1rem" }}>
        {currentTaskId === "reaction" && (
          <ReactionTaskPlayer
            onComplete={(result) => {
              setReactionResult(result);

              runner.completeCurrentTask({
                taskId: "reaction",
                taskTitle: "Reaction Speed",
                status: "completed",
                metrics: {
                  reactionMeanMs: result.meanReactionTime,
                  reactionVariabilityMs: result.variability,
                  accuracyPct: result.accuracy * 100,
                  omissionCount: result.omittedResponses ?? 0,
                  correctCount: result.correctResponses ?? 0,
                  totalTrials: (result.correctResponses ?? 0) + (result.omittedResponses ?? 0),
                },
                summary: {
                  label: "Baseline reaction task complete",
                },
                raw: result,
              });
            }}
          />
        )}

        {currentTaskId === "gonogo" && (
          <GoNoGoTaskPlayer
            onComplete={() => {
              runner.completeCurrentTask({
                taskId: "gonogo",
                taskTitle: "Go / No-Go",
                status: "completed",
                metrics: {
                  inhibitoryControlScore: 0,
                },
                summary: {
                  label: "Go / No-Go task complete",
                },
                raw: {},
              });
            }}
          />
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Assessment Status</h3>
        {reactionResult ? (
          <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#374151" }}>
            <div>
              <strong>Reaction task completed:</strong> Yes
            </div>
            <div>
              <strong>Mean reaction time:</strong> {Math.round(reactionResult.meanReactionTime)} ms
            </div>
            <div>
              <strong>Accuracy:</strong> {Math.round(reactionResult.accuracy * 100)}%
            </div>
            <div>
              <strong>Variability:</strong> {Math.round(reactionResult.variability)} ms
            </div>
            <div>
              <strong>Runner progress:</strong> {runnerSnapshot.progressPct}%
            </div>
            <div>
              <strong>Runner status:</strong> {runnerSnapshot.status}
            </div>
            <div>
              <strong>Current task:</strong> {currentTaskId ?? "none"}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            No completed live task yet.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
  <button
    type="button"
    style={buttonStyle}
    onClick={() => {
      runner.loadTasks(assessmentTasks);
      setReactionResult(null);
    }}
  >
    Retest Assessment
  </button>

  <button type="button" style={buttonStyle} onClick={() => navigate("/cogswitch")}>
    Module Home
  </button>

  <button
    type="button"
    style={primaryButtonStyle}
    onClick={() => navigate("/cogswitch/briefing")}
  >
    Go to Briefing
  </button>
</div>
      </section>
    </div>
  );
}