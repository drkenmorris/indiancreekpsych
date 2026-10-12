import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
export type CogSwitchMode = "INDIVIDUAL" | "CLINICIAN" | "TEACHER" | "ATHLETIC";
export type CogSwitchAgeProfile = "CHILD" | "ADOLESCENT" | "ADULT" | "SENIOR";
export type CogSwitchSessionStyle = "GUIDED" | "SELF_DIRECTED";

export type CogSwitchSettings = {
  mode: CogSwitchMode;
  ageProfile: CogSwitchAgeProfile;
  dualTaskEnabled: boolean;
  sessionStyle: CogSwitchSessionStyle;
  allowRecommendationsOverride: boolean;
};

export const COGSWITCH_SETTINGS_STORAGE_KEY = "cogswitch_settings";

export const DEFAULT_COGSWITCH_SETTINGS: CogSwitchSettings = {
  mode: "INDIVIDUAL",
  ageProfile: "ADULT",
  dualTaskEnabled: false,
  sessionStyle: "GUIDED",
  allowRecommendationsOverride: true,
};

function isValidMode(value: unknown): value is CogSwitchMode {
  return value === "INDIVIDUAL" || value === "CLINICIAN" || value === "TEACHER" || value === "ATHLETIC";
}

function isValidAgeProfile(value: unknown): value is CogSwitchAgeProfile {
  return value === "CHILD" || value === "ADOLESCENT" || value === "ADULT" || value === "SENIOR";
}

function isValidSessionStyle(value: unknown): value is CogSwitchSessionStyle {
  return value === "GUIDED" || value === "SELF_DIRECTED";
}

export function sanitizeCogSwitchSettings(value: unknown): CogSwitchSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_COGSWITCH_SETTINGS;
  }

  const raw = value as Partial<CogSwitchSettings>;

  return {
    mode: isValidMode(raw.mode) ? raw.mode : DEFAULT_COGSWITCH_SETTINGS.mode,
    ageProfile: isValidAgeProfile(raw.ageProfile) ? raw.ageProfile : DEFAULT_COGSWITCH_SETTINGS.ageProfile,
    dualTaskEnabled:
      typeof raw.dualTaskEnabled === "boolean"
        ? raw.dualTaskEnabled
        : DEFAULT_COGSWITCH_SETTINGS.dualTaskEnabled,
    sessionStyle: isValidSessionStyle(raw.sessionStyle)
      ? raw.sessionStyle
      : DEFAULT_COGSWITCH_SETTINGS.sessionStyle,
    allowRecommendationsOverride:
      typeof raw.allowRecommendationsOverride === "boolean"
        ? raw.allowRecommendationsOverride
        : DEFAULT_COGSWITCH_SETTINGS.allowRecommendationsOverride,
  };
}

export function loadCogSwitchSettings(): CogSwitchSettings {
  try {
    const raw = clinicalSessionStore.getItem(COGSWITCH_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_COGSWITCH_SETTINGS;
    return sanitizeCogSwitchSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_COGSWITCH_SETTINGS;
  }
}

export function saveCogSwitchSettings(settings: CogSwitchSettings): void {
  const cleaned = sanitizeCogSwitchSettings(settings);
  clinicalSessionStore.setItem(COGSWITCH_SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
}

export function resetCogSwitchSettings(): CogSwitchSettings {
  clinicalSessionStore.setItem(
    COGSWITCH_SETTINGS_STORAGE_KEY,
    JSON.stringify(DEFAULT_COGSWITCH_SETTINGS)
  );
  return DEFAULT_COGSWITCH_SETTINGS;
}