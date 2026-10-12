// src/asq/behavior.ts
/**
 * Sentinel Behavior & Support data model.
 *
 * IMPORTANT:
 * This file must match what BehaviorLog.tsx actually uses.
 * If this file is too narrow, TypeScript will throw TS2353/TS2678 errors
 * when BehaviorLog creates or compares incidents/discipline values.
 */

/** Who is creating/logging the incident record. */
export type IncidentCreatorRole =
  | "PARENT"
  | "TEACHER"
  | "COUNSELOR"
  | "ADMIN"
  | "PRINCIPAL"
  | "DEAN"
  | "NURSE"
  | "PARA"
  | "OTHER";

/** Which school roles can view shared incidents (simple RBAC). */
export type SchoolViewerRole =
  | "TEACHER"
  | "COUNSELOR"
  | "ADMIN"
  | "PRINCIPAL"
  | "DEAN"
  | "NURSE"
  | "PARA"
  | "OTHER";

/**
 * Keep behavior/setting/trigger as string types to avoid breaking saved data.
 * UI still uses label maps below for common values.
 */
export type BehaviorType = string;
export type SettingType = string;
export type TriggerTag = string;

/** Types of disciplinary actions a school might apply. */
export type DisciplinaryActionType =
  | "NONE"
  | "LOSS_OF_PRIVILEGE"
  | "PARENT_CONTACT"
  | "LUNCH_DETENTION"
  | "AFTER_SCHOOL_DETENTION"
  | "IN_SCHOOL_SUSPENSION"
  | "OUT_OF_SCHOOL_SUSPENSION"
  | "REFERRAL"
  | "RESTORATIVE_CONFERENCE"
  | "SAFETY_PLAN"
  | "EXPULSION"
  | "OTHER";

/** Who decided the disciplinary action. */
export type DisciplinaryDeciderRole =
  | "ADMIN"
  | "PRINCIPAL"
  | "DEAN"
  | "TEACHER"
  | "COUNSELOR"
  | "NURSE"
  | "OTHER";

/** Optional admin/leadership note. */
export type AdminUpdateNote = {
  id: string;
  at: string; // ISO datetime
  authorName?: string;
  authorRole?: DisciplinaryDeciderRole;
  note: string;
};

/**
 * Canonical incident record.
 * Times are ISO strings.
 */
export interface BehaviorIncident {
  id: string;

  /** Legacy field some UIs still reference. */
  timestamp: string;

  /** When the incident happened (best estimate). */
  incidentOccurredAt: string;

  /** When the incident was recorded/reported in the system. */
  reportedAt: string;

  /** Optional reporter metadata */
  reporterName?: string;
  reporterRole: "parent" | "teacher" | "counselor" | "admin" | "other";

  /** Classification */
  behaviorType: BehaviorType;
  setting: SettingType;
  locationNote?: string;

  /**
   * Severity scale:
   * 1 = mild / low impact
   * 2 = moderate
   * 3 = high
   * 4 = severe
   * 5 = critical/safety
   */
  severity: 1 | 2 | 3 | 4 | 5;

  /** Pattern tags */
  triggers: TriggerTag[];

  /** Free-text details */
  description?: string;
  whatHelped?: string;

  /** Who created the record (for audit/context). */
  createdByRole: IncidentCreatorRole;

  /** Backward compatibility (if any older code used creatorRole) */
  creatorRole?: IncidentCreatorRole;

  /** Sharing controls */
  sharedWithSchool?: boolean;
  sharedWithRoles?: SchoolViewerRole[];

  /** Disciplinary action tracking (optional) */
  disciplinaryActionType?: DisciplinaryActionType;
  disciplinaryActionDetails?: string;
  disciplinaryDecidedByName?: string;
  disciplinaryDecidedByRole?: DisciplinaryDeciderRole;
  disciplinaryDecidedAt?: string; // ISO

  /** Admin/leadership updates added after the initial entry */
  adminUpdates?: AdminUpdateNote[];
}

/* ------------------------------------------------------------------ */
/* Labels / UI helpers                                                 */
/* ------------------------------------------------------------------ */

export const BehaviorTypeLabels: Record<string, string> = {
  AGGRESSION: "Aggression",
  DISRUPTION: "Disruption",
  NONCOMPLIANCE: "Noncompliance / Refusal",
  ELOPEMENT: "Elopement / Leaving area",
  SELF_INJURY: "Self-injury",
  ANXIETY_PANIC: "Anxiety / Panic",
  WITHDRAWAL: "Withdrawal / Shutdown",
  OTHER: "Other",
};

export const SettingLabels: Record<string, string> = {
  CLASSROOM: "Classroom",
  HALLWAY: "Hallway / Transition",
  CAFETERIA: "Cafeteria",
  RECESS: "Recess",
  BUS: "Bus / Transportation",
  SPECIALS: "Specials (PE/Music/Art)",
  HOME: "Home",
  COMMUNITY: "Community",
  OTHER: "Other",
};

export const TriggerLabels: Record<string, string> = {
  TRANSITION: "Transition / change",
  SENSORY_NOISE: "Sensory: noise",
  SENSORY_CROWD: "Sensory: crowd",
  DEMAND: "Demand / task",
  SOCIAL_CONFLICT: "Peer conflict",
  UNSTRUCTURED: "Unstructured time",
  FATIGUE: "Fatigue",
  HUNGER: "Hunger / low blood sugar",
  COMMUNICATION_BREAKDOWN: "Communication breakdown",
  UNKNOWN: "Unknown",
};

export const DisciplinaryActionTypeLabels: Record<DisciplinaryActionType, string> = {
  NONE: "None",
  LOSS_OF_PRIVILEGE: "Loss of privilege",
  PARENT_CONTACT: "Parent contacted",
  LUNCH_DETENTION: "Lunch detention",
  AFTER_SCHOOL_DETENTION: "After-school detention",
  IN_SCHOOL_SUSPENSION: "In-school suspension",
  OUT_OF_SCHOOL_SUSPENSION: "Out-of-school suspension",
  REFERRAL: "Referral",
  RESTORATIVE_CONFERENCE: "Restorative conference",
  SAFETY_PLAN: "Safety plan",
  EXPULSION: "Expulsion",
  OTHER: "Other",
};

export const DisciplinaryDeciderRoleLabels: Record<DisciplinaryDeciderRole, string> = {
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  DEAN: "Dean",
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  NURSE: "Nurse",
  OTHER: "Other",
};

export const SchoolViewerRoleLabels: Record<SchoolViewerRole, string> = {
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  DEAN: "Dean",
  NURSE: "Nurse",
  PARA: "Para",
  OTHER: "Other",
};

/**
 * Minimal strategy suggestions used by BehaviorLog.
 * (You can expand this later without changing call sites.)
 */
export function suggestStrategiesForIncident(incident: BehaviorIncident): string[] {
  const out: string[] = [];

  out.push("Preview transitions; use a visual schedule or countdown.");
  out.push("Offer a calm, brief directive; reduce verbal load during escalation.");

  for (const t of incident.triggers ?? []) {
    const key = String(t).toUpperCase();
    if (key.includes("SENSORY") || key.includes("NOISE") || key.includes("CROWD")) {
      out.push("Add sensory supports: headphones, quiet corner, planned sensory breaks.");
    }
    if (key.includes("TRANSITION") || key.includes("CHANGE")) {
      out.push("Use first/then, timers, and a transition object to support shifting.");
    }
    if (key.includes("DEMAND") || key.includes("TASK")) {
      out.push("Chunk tasks; offer a 2-minute 'entry task' to start momentum.");
    }
    if (key.includes("SOCIAL")) {
      out.push('Coach repair scripts: "I need a break" / "Can you say that another way?"');
    }
    if (key.includes("FATIGUE")) {
      out.push("Move demanding tasks earlier; add recovery breaks later in the day.");
    }
  }

  if (incident.severity >= 4) {
    out.push("Ensure safety plan alignment (staff roles, safe space, escalation protocol).");
  }

  return [...new Set(out)];
}
