"use client";
import React from "react";
import { useNavigate } from "@/lib/clinical-tests/navigation";

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  padding: "1rem",
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: "0.9rem",
};

export default function CogSwitchHome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>Cognitive-Motor Switching Module</h2>
      <p style={{ opacity: 0.8 }}>
        Choose an area below to begin building and testing the module inside your dashboard.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Assessment</h3>
          <p style={{ opacity: 0.75 }}>Baseline domain and switch testing shell.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/assessment")}>
            Open Assessment
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Session Briefing</h3>
          <p style={{ opacity: 0.75 }}>Pre-session summary and recommended plan.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/briefing")}>
            Open Briefing
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Training</h3>
          <p style={{ opacity: 0.75 }}>Adaptive session shell for guided training.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/training")}>
            Open Training
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Results</h3>
          <p style={{ opacity: 0.75 }}>Immediate post-session outcome view.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/results")}>
            Open Results
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Reports</h3>
          <p style={{ opacity: 0.75 }}>Longer-form reporting and mode-specific summaries.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/reports")}>
            Open Reports
          </button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Settings</h3>
          <p style={{ opacity: 0.75 }}>Mode, age profile, and future training options.</p>
          <button style={buttonStyle} onClick={() => navigate("/cogswitch/settings")}>
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
}