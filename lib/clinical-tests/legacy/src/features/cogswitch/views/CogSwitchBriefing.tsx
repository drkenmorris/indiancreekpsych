"use client";
import React from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";

import {
  loadCogSwitchSettings,
  type CogSwitchSettings,
} from "../services/persistence/cogSwitchSettingsStorage";

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

type SessionRecommendation = {
  sessionType: string
  durationMinutes: number
  focusDomains: string[]
  dualTaskIncluded: boolean
}

function generateSessionRecommendation(settings: CogSwitchSettings): SessionRecommendation {

  let duration = 12
  let domains = ["Reaction Speed", "Working Memory", "Rule Switching"]

  if (settings.ageProfile === "CHILD") duration = 6
  if (settings.ageProfile === "ADOLESCENT") duration = 10
  if (settings.ageProfile === "ADULT") duration = 12
  if (settings.ageProfile === "SENIOR") duration = 8

  if (settings.mode === "ATHLETIC") {
    domains = ["Reaction Speed", "Motor Sequencing", "Rule Switching"]
    duration += 4
  }

  if (settings.mode === "CLINICIAN") {
    domains = ["Attention Control", "Working Memory", "Rule Switching"]
  }

  return {
    sessionType: settings.sessionStyle === "GUIDED" ? "Guided Session" : "Self-Directed Session",
    durationMinutes: duration,
    focusDomains: domains,
    dualTaskIncluded: settings.dualTaskEnabled,
  }
}

export default function CogSwitchBriefing() {

  const navigate = useNavigate()

  const settings = loadCogSwitchSettings()

  const recommendation = generateSessionRecommendation(settings)

  return (
    <div style={{ padding: "1rem" }}>

      <h2 style={{ marginTop: 0 }}>Session Briefing</h2>

      <p style={{ opacity: 0.8 }}>
        Based on your current configuration and recent activity, the system has generated
        a recommended training session.
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
          <h3 style={{ marginTop: 0 }}>Active Configuration</h3>

          <div style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>

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
          <h3 style={{ marginTop: 0 }}>Recommended Session</h3>

          <div style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>

            <div>
              <strong>Session Type:</strong> {recommendation.sessionType}
            </div>

            <div>
              <strong>Estimated Duration:</strong> {recommendation.durationMinutes} minutes
            </div>

            <div>
              <strong>Dual Task Included:</strong> {recommendation.dualTaskIncluded ? "Yes" : "No"}
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <strong>Focus Domains:</strong>
            </div>

            <ul style={{ marginTop: "0.25rem" }}>
              {recommendation.focusDomains.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>

          </div>

        </section>

      </div>


      <section style={{ ...cardStyle, marginTop: "1rem" }}>

        <h3 style={{ marginTop: 0 }}>Start Session</h3>

        <p style={{ opacity: 0.8 }}>
          You can begin the recommended session or adjust settings before starting.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>

          <button
            style={primaryButtonStyle}
            onClick={() => navigate("/cogswitch/training")}
          >
            Start Training Session
          </button>

          <button
            style={buttonStyle}
            onClick={() => navigate("/cogswitch/settings")}
          >
            Adjust Settings
          </button>

        </div>

      </section>

    </div>
  )
}