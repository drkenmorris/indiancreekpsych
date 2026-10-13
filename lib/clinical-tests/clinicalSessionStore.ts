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
  /** Isolated ASQ/ASEQ QA state: never include another assessment suite. */
  exportAsq(): Record<string,string> {
    return Object.fromEntries([...memory.entries()].filter(([key]) =>
      key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")
    ));
  },
  /** Replace only ASQ state when restoring an administrator-controlled snapshot. */
  importAsq(payload: Record<string,string>): void {
    for (const key of [...memory.keys()]) {
      if (key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")) memory.delete(key);
    }
    for (const [key,value] of Object.entries(payload)) {
      if ((key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")) &&
          typeof value === "string" && value.length < 1000000) memory.set(key,value);
    }
  },
};
