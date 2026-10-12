"use client";
import React, { useMemo, useState } from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";
import { loadCogSwitchSettings } from "../services/persistence/cogSwitchSettingsStorage";

type ReportView = "SUMMARY" | "INDIVIDUAL" | "CLINICIAN" | "TEACHER" | "ATHLETIC";

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  background: "#ffffff",
  padding: "1rem",
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "0.55rem 0.85rem",
  borderRadius: "0.375rem",
  border: active ? "1px solid #c7d2fe" : "1px solid #d1d5db",
  background: active ? "#eef2ff" : "#f9fafb",
  cursor: "pointer",
  fontSize: "0.9rem",
});

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

function getDefaultReportView(mode: string): ReportView {
  switch (mode) {
    case "CLINICIAN":
      return "CLINICIAN";
    case "TEACHER":
      return "TEACHER";
    case "ATHLETIC":
      return "ATHLETIC";
    case "INDIVIDUAL":
    default:
      return "INDIVIDUAL";
  }
}

function buildPlaceholderNarrative(view: ReportView): string {
  switch (view) {
    case "INDIVIDUAL":
      return "This individual report view is designed to present understandable progress indicators, including reaction speed, switching efficiency, and improvement trends over time.";
    case "CLINICIAN":
      return "This clinician-facing report will later summarize attention control, working memory, switch cost, recovery efficiency, fatigue patterns, and suggested next-step interventions.";
    case "TEACHER":
      return "This teacher-facing report will later emphasize classroom-relevant indicators such as focus consistency, transition tolerance, and brief training recommendations.";
    case "ATHLETIC":
      return "This performance report will later emphasize reaction benchmarks, switch speed, task transition stability, and pressure-readiness indicators.";
    case "SUMMARY":
    default:
      return "This summary report is the neutral cross-mode overview and will later aggregate the most important metrics from recent sessions.";
  }
}

function buildPlaceholderMetrics(mode: string) {
  const base = [
    { label: "Reaction Speed", value: "312 ms" },
    { label: "Accuracy", value: "89%" },
    { label: "Switch Cost", value: "+126 ms" },
    { label: "Recovery After Switch", value: "3 trials" },
  ];

  if (mode === "CLINICIAN") {
    base.push({ label: "Attention Stability", value: "78%" });
  }

  if (mode === "TEACHER") {
    base.push({ label: "Transition Consistency", value: "81%" });
  }

  if (mode === "ATHLETIC") {
    base.push({ label: "Motor Sequencing Efficiency", value: "84%" });
  }

  return base;
}

export default function CogSwitchReports() {
  const navigate = useNavigate();
  const settings = loadCogSwitchSettings();

  const defaultView = useMemo(() => getDefaultReportView(settings.mode), [settings.mode]);
  const [activeView, setActiveView] = useState<ReportView>(defaultView);

  const metrics = useMemo(() => buildPlaceholderMetrics(settings.mode), [settings.mode]);
  const narrative = useMemo(() => buildPlaceholderNarrative(activeView), [activeView]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>CogSwitch Reports</h2>
      <p style={{ opacity: 0.8, maxWidth: 900 }}>
        This reporting shell is now wired for multiple output styles. Later, these report views
        will be generated from real task, switch, fatigue, and training history data.
      </p>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Report Views</h3>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" style={tabButtonStyle(activeView === "SUMMARY")} onClick={() => setActiveView("SUMMARY")}>
            Summary
          </button>
          <button type="button" style={tabButtonStyle(activeView === "INDIVIDUAL")} onClick={() => setActiveView("INDIVIDUAL")}>
            Individual
          </button>
          <button type="button" style={tabButtonStyle(activeView === "CLINICIAN")} onClick={() => setActiveView("CLINICIAN")}>
            Clinician
          </button>
          <button type="button" style={tabButtonStyle(activeView === "TEACHER")} onClick={() => setActiveView("TEACHER")}>
            Teacher
          </button>
          <button type="button" style={tabButtonStyle(activeView === "ATHLETIC")} onClick={() => setActiveView("ATHLETIC")}>
            Athletic / Coach
          </button>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Current Report Context</h3>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#374151" }}>
            <div>
              <strong>Active Report View:</strong> {activeView}
            </div>
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

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Metric Snapshot</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  border: "1px solid #f1f5f9",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{metric.label}</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Narrative Interpretation</h3>
        <p style={{ marginBottom: 0, color: "#374151", lineHeight: 1.7 }}>{narrative}</p>
      </section>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Next Actions</h3>
        <p style={{ opacity: 0.8 }}>
          Continue training, return to the session briefing, or go back to module home.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => navigate("/cogswitch/training")}
          >
            Continue Training
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate("/cogswitch/briefing")}
          >
            Back to Briefing
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate("/cogswitch")}
          >
            Module Home
          </button>
        </div>
      </section>
    </div>
  );
}