"use client";
import React, { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import { loadCogSwitchSettings } from "../services/persistence/cogSwitchSettingsStorage";

type TrainingBlock = {
  id: string;
  title: string;
  domain: string;
  durationLabel: string;
  instructions: string;
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  background: "#ffffff",
  padding: "1rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

function buildTrainingBlocks(mode: string, dualTaskEnabled: boolean): TrainingBlock[] {
  const baseBlocks: TrainingBlock[] = [
    {
      id: "reaction-speed",
      title: "Reaction Speed Warmup",
      domain: "Reaction Speed",
      durationLabel: "1–2 min",
      instructions: "Respond as quickly as possible when the target appears.",
    },
    {
      id: "working-memory",
      title: "Working Memory Update",
      domain: "Working Memory",
      durationLabel: "2–3 min",
      instructions: "Track recent items and respond when the current item matches the rule.",
    },
    {
      id: "rule-switch",
      title: "Rule Switching",
      domain: "Cognitive Flexibility",
      durationLabel: "2–3 min",
      instructions: "Follow the current rule and adapt quickly when the rule changes.",
    },
  ];

  if (mode === "ATHLETIC") {
    baseBlocks.splice(1, 0, {
      id: "motor-sequencing",
      title: "Motor Sequencing",
      domain: "Motor Sequencing",
      durationLabel: "2–3 min",
      instructions: "Complete the response sequence quickly and accurately.",
    });
  }

  if (mode === "CLINICIAN") {
    baseBlocks.splice(1, 0, {
      id: "attention-control",
      title: "Attention Control",
      domain: "Sustained Attention",
      durationLabel: "2–3 min",
      instructions: "Maintain focus and respond only to the target pattern.",
    });
  }

  if (dualTaskEnabled) {
    baseBlocks.push({
      id: "dual-task",
      title: "Optional Dual-Task Block",
      domain: "Dual Task",
      durationLabel: "1–2 min",
      instructions: "Perform two coordinated demands at the same time while maintaining accuracy.",
    });
  }

  return baseBlocks;
}

export default function CogSwitchTraining() {
  const navigate = useNavigate();
  const settings = loadCogSwitchSettings();

  const blocks = useMemo(
    () => buildTrainingBlocks(settings.mode, settings.dualTaskEnabled),
    [settings.mode, settings.dualTaskEnabled]
  );

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);

  const currentBlock = blocks[currentIndex];
  const sessionComplete = currentIndex >= blocks.length;

  function startSession() {
    setStarted(true);
    setCurrentIndex(0);
    setCompletedBlockIds([]);
  }

  function completeCurrentBlock() {
    if (!currentBlock) return;

    setCompletedBlockIds((prev) =>
      prev.includes(currentBlock.id) ? prev : [...prev, currentBlock.id]
    );
    setCurrentIndex((prev) => prev + 1);
  }

  function resetSession() {
    setStarted(false);
    setCurrentIndex(0);
    setCompletedBlockIds([]);
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>CogSwitch Training</h2>
      <p style={{ opacity: 0.8, maxWidth: 850 }}>
        This is the training shell for the Cog Switch module. It is now using your saved
        settings to generate a session structure and prepare task flow.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Session Configuration</h3>
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
            <div>
              <strong>Blocks in Session:</strong> {blocks.length}
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Training Plan</h3>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", fontSize: "0.9rem" }}>
            {blocks.map((block, index) => {
              const isDone = completedBlockIds.includes(block.id);
              const isCurrent = started && !sessionComplete && currentIndex === index;

              return (
                <li key={block.id} style={{ marginBottom: "0.5rem" }}>
                  <strong>{block.title}</strong> — {block.domain} ({block.durationLabel})
                  {isDone ? " ✓" : isCurrent ? " ← current" : ""}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {!started ? (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Ready to Begin</h3>
          <p style={{ opacity: 0.8 }}>
            Start the training session to enter the first active task block.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" style={primaryButtonStyle} onClick={startSession}>
              Start Session
            </button>
            <button type="button" style={buttonStyle} onClick={() => navigate("/cogswitch/briefing")}>
              Back to Briefing
            </button>
          </div>
        </section>
      ) : sessionComplete ? (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Session Complete</h3>
          <p style={{ opacity: 0.8 }}>
            All training blocks have been completed in this shell session.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => navigate("/cogswitch/results")}
            >
              View Results
            </button>

            <button type="button" style={buttonStyle} onClick={resetSession}>
              Reset Session
            </button>
          </div>
        </section>
      ) : (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Current Block</h3>

          <div style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "#374151" }}>
            <div>
              <strong>Title:</strong> {currentBlock.title}
            </div>
            <div>
              <strong>Domain:</strong> {currentBlock.domain}
            </div>
            <div>
              <strong>Suggested Duration:</strong> {currentBlock.durationLabel}
            </div>
            <div>
              <strong>Instructions:</strong> {currentBlock.instructions}
            </div>
            <div>
              <strong>Progress:</strong> Block {currentIndex + 1} of {blocks.length}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button type="button" style={primaryButtonStyle} onClick={completeCurrentBlock}>
              Complete This Block
            </button>

            <button type="button" style={buttonStyle} onClick={resetSession}>
              Reset Session
            </button>
          </div>
        </section>
      )}
    </div>
  );
}