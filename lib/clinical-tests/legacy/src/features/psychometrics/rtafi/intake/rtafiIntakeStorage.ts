import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/features/psychometrics/rtafi/intake/rtafiIntakeStorage.ts

import type { RtafiIntakeProfile } from './rtafiIntakeTypes';

export const RTAFI_INTAKE_STORAGE_KEY = 'rtafi-intake-profile';

export function saveRtafiIntakeProfile(profile: RtafiIntakeProfile): void {
  if (typeof window === 'undefined') {
    return;
  }

  clinicalSessionStore.setItem(
    RTAFI_INTAKE_STORAGE_KEY,
    JSON.stringify(profile),
  );
}

export function loadRtafiIntakeProfile(): RtafiIntakeProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedProfile = clinicalSessionStore.getItem(RTAFI_INTAKE_STORAGE_KEY);

  if (!storedProfile) {
    return null;
  }

  try {
    return JSON.parse(storedProfile) as RtafiIntakeProfile;
  } catch {
    return null;
  }
}

export function clearRtafiIntakeProfile(): void {
  if (typeof window === 'undefined') {
    return;
  }

  clinicalSessionStore.removeItem(RTAFI_INTAKE_STORAGE_KEY);
}

export function updateRtafiIntakeProfile(
  updater: (currentProfile: RtafiIntakeProfile | null) => RtafiIntakeProfile,
): RtafiIntakeProfile {
  const updatedProfile = updater(loadRtafiIntakeProfile());

  saveRtafiIntakeProfile(updatedProfile);

  return updatedProfile;
}

export function hasRtafiIntakeProfile(): boolean {
  return loadRtafiIntakeProfile() !== null;
}