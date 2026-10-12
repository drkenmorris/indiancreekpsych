"use client";
/**
 * ADMIN QA ONLY. Memory-only legacy questionnaire state.
 * Never write PHI to localStorage/sessionStorage or publish answers in URLs.
 * State is intentionally lost on full reload; no server clinical persistence
 * is connected until reviewed Supabase tables and access policies exist.
 */
const memory = new Map<string, string>();
export const clinicalSessionStore = {
  getItem(key: string): string | null { return memory.get(key) ?? null; },
  setItem(key: string, value: string): void { memory.set(key, String(value)); },
  removeItem(key: string): void { memory.delete(key); },
  clear(): void { memory.clear(); },
};
