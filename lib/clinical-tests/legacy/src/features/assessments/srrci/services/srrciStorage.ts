import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import type {
  SRRCICoupleComparisonResult,
  SRRCIResponse,
  SRRCIResult,
  SRRCIUserProfile,
} from "../types/srrciTypes";

const SRRCI_PROFILE_KEY = "srrci_active_profile";
const SRRCI_RESPONSES_KEY = "srrci_active_responses";
const SRRCI_RESULT_KEY = "srrci_latest_result";
const SRRCI_COUPLE_COMPARISON_KEY = "srrci_latest_couple_comparison";

function isBrowserStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof clinicalSessionStore !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowserStorageAvailable()) return fallback;

  const raw = clinicalSessionStore.getItem(key);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowserStorageAvailable()) return;

  clinicalSessionStore.setItem(key, JSON.stringify(value));
}

function removeStorageItem(key: string): void {
  if (!isBrowserStorageAvailable()) return;

  clinicalSessionStore.removeItem(key);
}

function createStorageId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `srrci_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function saveSRRCIProfile(profile: SRRCIUserProfile): void {
  writeJSON(SRRCI_PROFILE_KEY, profile);
}

export function getSRRCIProfile(): SRRCIUserProfile | null {
  return readJSON<SRRCIUserProfile | null>(SRRCI_PROFILE_KEY, null);
}

export function clearSRRCIProfile(): void {
  removeStorageItem(SRRCI_PROFILE_KEY);
}

export function saveSRRCIResponses(responses: SRRCIResponse[]): void {
  writeJSON(SRRCI_RESPONSES_KEY, responses);
}

export function getSRRCIResponses(): SRRCIResponse[] {
  return readJSON<SRRCIResponse[]>(SRRCI_RESPONSES_KEY, []);
}

export function clearSRRCIResponses(): void {
  removeStorageItem(SRRCI_RESPONSES_KEY);
}

export function saveSRRCIResult(result: SRRCIResult): void {
  writeJSON(SRRCI_RESULT_KEY, result);
}

export function getSRRCIResult(): SRRCIResult | null {
  return readJSON<SRRCIResult | null>(SRRCI_RESULT_KEY, null);
}

export function clearSRRCIResult(): void {
  removeStorageItem(SRRCI_RESULT_KEY);
}

export function saveSRRCICoupleComparison(
  comparison: SRRCICoupleComparisonResult,
): void {
  writeJSON(SRRCI_COUPLE_COMPARISON_KEY, comparison);
}

export function getSRRCICoupleComparison(): SRRCICoupleComparisonResult | null {
  return readJSON<SRRCICoupleComparisonResult | null>(
    SRRCI_COUPLE_COMPARISON_KEY,
    null,
  );
}

export function clearSRRCICoupleComparison(): void {
  removeStorageItem(SRRCI_COUPLE_COMPARISON_KEY);
}

export function clearAllSRRCIData(): void {
  clearSRRCIProfile();
  clearSRRCIResponses();
  clearSRRCIResult();
  clearSRRCICoupleComparison();
}

export function createSRRCIProfile(input: {
  displayName: string;
  age?: number;
  biologicalSex?: SRRCIUserProfile["biologicalSex"];
  genderIdentity?: string;
  relationshipStatus?: SRRCIUserProfile["relationshipStatus"];
  partnerProfileId?: string;
}): SRRCIUserProfile {
  return {
    id: createStorageId(),
    displayName: input.displayName.trim(),
    age: input.age,
    biologicalSex: input.biologicalSex,
    genderIdentity: input.genderIdentity?.trim(),
    relationshipStatus: input.relationshipStatus,
    partnerProfileId: input.partnerProfileId?.trim(),
    createdAt: new Date().toISOString(),
  };
}
