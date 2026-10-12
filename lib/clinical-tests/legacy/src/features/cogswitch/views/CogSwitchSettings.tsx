"use client";
import React, { useMemo, useState } from "react";
import {
  DEFAULT_COGSWITCH_SETTINGS,
  loadCogSwitchSettings,
  resetCogSwitchSettings,
  saveCogSwitchSettings,
  type CogSwitchAgeProfile,
  type CogSwitchMode,
  type CogSwitchSessionStyle,
  type CogSwitchSettings,
} from "../services/persistence/cogSwitchSettingsStorage";

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  background: "#ffffff",
  padding: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  color: "#374151",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  background: "#fff",
  fontSize: "0.9rem",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "0.5rem",
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

function getModeDescription(mode: CogSwitchMode): string {
  switch (mode) {
    case "INDIVIDUAL":
      return "Balanced training for self-improvement, daily use, and general cognitive growth.";
    case "CLINICIAN":
      return "More structured pacing, supportive reinforcement, and clearer progress interpretation for supervised use.";
    case "TEACHER":
      return "Shorter, classroom-friendly structure with emphasis on attention, learning support, and consistency.";
    case "ATHLETIC":
      return "Faster progression, stricter performance emphasis, and stronger focus on reaction and switch efficiency.";
    default:
      return "";
  }
}

function getAgeProfileDescription(ageProfile: CogSwitchAgeProfile): string {
  switch (ageProfile) {
    case "CHILD":
      return "Shorter sessions, simpler instructions, slower difficulty ramp, and stronger encouragement.";
    case "ADOLESCENT":
      return "Moderate pacing with age-appropriate challenge and increasing performance expectations.";
    case "ADULT":
      return "Balanced defaults for general adult learning and performance.";
    case "SENIOR":
      return "Gentler ramp, fatigue-aware pacing, and support for comfort, clarity, and stability.";
    default:
      return "";
  }
}

function getRecommendedDefaults(mode: CogSwitchMode, ageProfile: CogSwitchAgeProfile) {
  const dualTaskRecommended = mode === "ATHLETIC" && ageProfile !== "CHILD";
  const sessionStyleRecommended = "GUIDED";

  return {
    dualTaskRecommended,
    sessionStyleRecommended,
  };
}

export default function CogSwitchSettings() {
  const [settings, setSettings] = useState<CogSwitchSettings>(() => loadCogSwitchSettings());
  const [savedMessage, setSavedMessage] = useState<string>("");

  const recommendations = useMemo(() => {
    return getRecommendedDefaults(settings.mode, settings.ageProfile);
  }, [settings.mode, settings.ageProfile]);

  function updateSetting<K extends keyof CogSwitchSettings>(key: K, value: CogSwitchSettings[K]) {
    setSettings((prev: CogSwitchSettings) => ({
      ...prev,
      [key]: value,
    }));
    setSavedMessage("");
  }

  function applyRecommendedDefaults() {
    setSettings((prev: CogSwitchSettings) => ({
      ...prev,
      dualTaskEnabled: recommendations.dualTaskRecommended,
      sessionStyle: recommendations.sessionStyleRecommended as CogSwitchSessionStyle,
    }));
    setSavedMessage("");
  }

  function handleSaveSettings() {
    try {
      saveCogSwitchSettings(settings);
      setSavedMessage("Settings saved locally.");
    } catch {
      setSavedMessage("Unable to save settings.");
    }
  }

  function handleLoadSettings() {
    try {
      const loaded = loadCogSwitchSettings();
      setSettings(loaded);
      setSavedMessage("Saved settings loaded.");
    } catch {
      setSavedMessage("Unable to load saved settings.");
    }
  }

  function handleResetSettings() {
    try {
      const reset = resetCogSwitchSettings();
      setSettings(reset);
      setSavedMessage("Settings reset to defaults.");
    } catch {
      setSettings(DEFAULT_COGSWITCH_SETTINGS);
      setSavedMessage("Settings reset in memory.");
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>CogSwitch Settings</h2>
      <p style={{ opacity: 0.8, maxWidth: 850 }}>
        Configure the current operating style of the Cog Switch module. These settings will later
        drive assessment defaults, session pacing, switch intensity, reward scaling, and reporting style.
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
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Mode</h3>
          <label style={labelStyle} htmlFor="cogswitch-mode">
            Active mode
          </label>
          <select
            id="cogswitch-mode"
            value={settings.mode}
            onChange={(e) => updateSetting("mode", e.target.value as CogSwitchMode)}
            style={selectStyle}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="CLINICIAN">Clinician</option>
            <option value="TEACHER">Teacher</option>
            <option value="ATHLETIC">Athletic / Coach</option>
          </select>

          <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#4b5563" }}>
            {getModeDescription(settings.mode)}
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Age Profile</h3>
          <label style={labelStyle} htmlFor="cogswitch-age-profile">
            Active age profile
          </label>
          <select
            id="cogswitch-age-profile"
            value={settings.ageProfile}
            onChange={(e) => updateSetting("ageProfile", e.target.value as CogSwitchAgeProfile)}
            style={selectStyle}
          >
            <option value="CHILD">Child</option>
            <option value="ADOLESCENT">Adolescent</option>
            <option value="ADULT">Adult</option>
            <option value="SENIOR">Senior</option>
          </select>

          <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#4b5563" }}>
            {getAgeProfileDescription(settings.ageProfile)}
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Session Controls</h3>

          <label style={labelStyle} htmlFor="cogswitch-session-style">
            Session style
          </label>
          <select
            id="cogswitch-session-style"
            value={settings.sessionStyle}
            onChange={(e) => updateSetting("sessionStyle", e.target.value as CogSwitchSessionStyle)}
            style={selectStyle}
          >
            <option value="GUIDED">Guided</option>
            <option value="SELF_DIRECTED">Self-directed</option>
          </select>

          <div style={checkboxRowStyle}>
            <input
              id="cogswitch-dual-task"
              type="checkbox"
              checked={settings.dualTaskEnabled}
              onChange={(e) => updateSetting("dualTaskEnabled", e.target.checked)}
            />
            <label htmlFor="cogswitch-dual-task" style={{ fontSize: "0.9rem", color: "#374151" }}>
              Enable dual-task as an optional training feature
            </label>
          </div>

          <div style={checkboxRowStyle}>
            <input
              id="cogswitch-override"
              type="checkbox"
              checked={settings.allowRecommendationsOverride}
              onChange={(e) => updateSetting("allowRecommendationsOverride", e.target.checked)}
            />
            <label htmlFor="cogswitch-override" style={{ fontSize: "0.9rem", color: "#374151" }}>
              Allow user to override recommended session plans
            </label>
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Recommended Defaults</h3>
          <div style={{ fontSize: "0.9rem", color: "#4b5563", lineHeight: 1.5 }}>
            Based on the current mode and age profile, the system would currently recommend:
          </div>

          <ul style={{ marginTop: "0.75rem", paddingLeft: "1.2rem", color: "#374151", fontSize: "0.9rem" }}>
            <li>
              Session style: <strong>{recommendations.sessionStyleRecommended}</strong>
            </li>
            <li>
              Dual-task default: <strong>{recommendations.dualTaskRecommended ? "Enabled" : "Disabled"}</strong>
            </li>
          </ul>

          <button type="button" style={buttonStyle} onClick={applyRecommendedDefaults}>
            Apply Recommended Defaults
          </button>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Current Configuration Summary</h3>
        <div style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7 }}>
          <div>
            <strong>Mode:</strong> {settings.mode}
          </div>
          <div>
            <strong>Age profile:</strong> {settings.ageProfile}
          </div>
          <div>
            <strong>Session style:</strong> {settings.sessionStyle}
          </div>
          <div>
            <strong>Dual-task:</strong> {settings.dualTaskEnabled ? "Enabled" : "Disabled"}
          </div>
          <div>
            <strong>Override recommendations:</strong>{" "}
            {settings.allowRecommendationsOverride ? "Allowed" : "Not allowed"}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" style={primaryButtonStyle} onClick={handleSaveSettings}>
            Save Settings
          </button>
          <button type="button" style={buttonStyle} onClick={handleLoadSettings}>
            Load Saved Settings
          </button>
          <button type="button" style={buttonStyle} onClick={handleResetSettings}>
            Reset Defaults
          </button>
        </div>

        {savedMessage ? (
          <div style={{ marginTop: "0.75rem", fontSize: "0.88rem", color: "#4b5563" }}>{savedMessage}</div>
        ) : null}
      </section>
    </div>
  );
}