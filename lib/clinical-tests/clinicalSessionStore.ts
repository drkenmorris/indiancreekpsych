"use client";
/**
 * ADMIN QA ONLY. Memory-only legacy questionnaire state.
 * Never write PHI to localStorage/sessionStorage or publish answers in URLs.
 * State is intentionally lost on full reload; no server clinical persistence
 * is connected until reviewed Supabase tables and access policies exist.
 */
const memory = new Map<string, string>();
const listeners=new Set<()=>void>();let revision=0;
const changed=()=>{revision++;listeners.forEach(fn=>fn());};
export const clinicalSessionStore = {
  subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
  revision(){return revision;},
  getItem(key: string): string | null { return memory.get(key) ?? null; },
  setItem(key: string, value: string): void { if(memory.get(key)!==String(value)){memory.set(key,String(value));changed();} },
  removeItem(key: string): void { if(memory.delete(key))changed(); },
  clear(): void { if(memory.size){memory.clear();changed();} },
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
    changed();
  },
};
