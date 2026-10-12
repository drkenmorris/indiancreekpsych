// src/assessments/autism/items/autismItemsTeacher.ts
// Teacher-facing item bank used by the lightweight ASQ TeacherForm (LikertQuestion UI).
// This file is intentionally self-contained (no imports) to avoid cross-file type coupling
// while the scoring engine is evolving.

export type AutismTeacherItem = {
  id: string;          // e.g., "T001"
  prompt: string;      // question stem
  domain: string;      // keep domain string-based for now (TeacherForm groups/labels can map later)
  reverse?: boolean;   // optional future reverse scoring
};

export const AUTISM_ITEMS_TEACHER: AutismTeacherItem[] = [
  // Social Interaction
  { id: "T001", prompt: "Initiates interaction with peers without prompting.", domain: "Social" },
  { id: "T002", prompt: "Responds when peers attempt to engage.", domain: "Social" },
  { id: "T003", prompt: "Seems unsure how to join group activities.", domain: "Social" },
  { id: "T004", prompt: "Has difficulty understanding personal space.", domain: "Social" },
  { id: "T005", prompt: "Misreads social cues (tone, facial expressions, body language).", domain: "Social" },
  { id: "T006", prompt: "Prefers to play/work alone even when peers invite participation.", domain: "Social" },
  { id: "T007", prompt: "Has difficulty with back-and-forth conversation with peers.", domain: "Social" },
  { id: "T008", prompt: "Appears unaware of how their behavior affects others.", domain: "Social" },
  { id: "T009", prompt: "Has difficulty making or keeping friendships.", domain: "Social" },
  { id: "T010", prompt: "Talks at peers rather than with peers (one-sided interaction).", domain: "Social" },

  // Communication / Pragmatics
  { id: "T011", prompt: "Has difficulty understanding implied meaning, sarcasm, or jokes.", domain: "Communication" },
  { id: "T012", prompt: "Uses overly formal, unusual, or age-atypical language.", domain: "Communication" },
  { id: "T013", prompt: "Struggles to stay on topic during conversation.", domain: "Communication" },
  { id: "T014", prompt: "Has difficulty adjusting communication to the situation (classroom vs. recess).", domain: "Communication" },
  { id: "T015", prompt: "Has limited use of gestures or facial expressions while speaking.", domain: "Communication" },
  { id: "T016", prompt: "Often misunderstands directions unless they are very explicit.", domain: "Communication" },
  { id: "T017", prompt: "Echoes phrases (from adults/media) or repeats the same lines.", domain: "Communication" },
  { id: "T018", prompt: "Interrupts or speaks over others in a way that seems unaware.", domain: "Communication" },

  // Restricted / Repetitive Behaviors
  { id: "T019", prompt: "Repeats movements (e.g., hand flapping, rocking) especially when excited or stressed.", domain: "RRB" },
  { id: "T020", prompt: "Repeats sounds/words or plays with sounds in a repetitive way.", domain: "RRB" },
  { id: "T021", prompt: "Fixates on specific topics and has trouble shifting attention away from them.", domain: "RRB" },
  { id: "T022", prompt: "Becomes distressed when routines or plans change.", domain: "RRB" },
  { id: "T023", prompt: "Insists on doing tasks in a specific order or 'right way'.", domain: "RRB" },
  { id: "T024", prompt: "Shows repetitive play/learning patterns (same game, same questions).", domain: "RRB" },
  { id: "T025", prompt: "Engages in ritualized behaviors (lining up objects, checking, repeating).", domain: "RRB" },
  { id: "T026", prompt: "Has intense interest in unusual objects or parts of objects.", domain: "RRB" },

  // Sensory Processing
  { id: "T027", prompt: "Is unusually sensitive to sounds (covers ears, distressed by noise).", domain: "Sensory" },
  { id: "T028", prompt: "Is unusually sensitive to lights, visuals, or busy environments.", domain: "Sensory" },
  { id: "T029", prompt: "Is unusually sensitive to touch (clothing tags, textures) or avoids being touched.", domain: "Sensory" },
  { id: "T030", prompt: "Seeks sensory input (touching objects, movement) more than peers.", domain: "Sensory" },
  { id: "T031", prompt: "Has strong preferences/aversions to food textures or smells (noticed at school).", domain: "Sensory" },
  { id: "T032", prompt: "Has difficulty regulating volume of voice or seems unaware of noise level.", domain: "Sensory" },

  // Executive Function / Flexibility
  { id: "T033", prompt: "Has trouble getting started on independent work.", domain: "Executive" },
  { id: "T034", prompt: "Has trouble finishing tasks without frequent prompts.", domain: "Executive" },
  { id: "T035", prompt: "Loses materials or forgets assignments more than peers.", domain: "Executive" },
  { id: "T036", prompt: "Has difficulty transitioning between activities.", domain: "Executive" },
  { id: "T037", prompt: "Shows rigid thinking (black-and-white, rule-bound) that disrupts work/relationships.", domain: "Executive" },
  { id: "T038", prompt: "Becomes stuck on a mistake or cannot move on without reassurance.", domain: "Executive" },
  { id: "T039", prompt: "Has difficulty planning multi-step tasks even with directions.", domain: "Executive" },
  { id: "T040", prompt: "Has difficulty organizing work and materials.", domain: "Executive" },

  // Emotional / Behavioral Regulation
  { id: "T041", prompt: "Has meltdowns/shutdowns that seem linked to overwhelm or change.", domain: "Regulation" },
  { id: "T042", prompt: "Becomes anxious or upset in unpredictable situations.", domain: "Regulation" },
  { id: "T043", prompt: "Has strong reactions to minor frustrations.", domain: "Regulation" },
  { id: "T044", prompt: "Withdraws or 'checks out' when demands increase.", domain: "Regulation" },
  { id: "T045", prompt: "Has difficulty identifying or expressing feelings appropriately.", domain: "Regulation" },
  { id: "T046", prompt: "Needs frequent reassurance to attempt challenging tasks.", domain: "Regulation" },

  // Classroom Learning Impact
  { id: "T047", prompt: "Appears inattentive due to internal preoccupation or daydreaming.", domain: "Classroom" },
  { id: "T048", prompt: "Has difficulty working in groups.", domain: "Classroom" },
  { id: "T049", prompt: "Has difficulty asking for help appropriately.", domain: "Classroom" },
  { id: "T050", prompt: "Struggles with written expression beyond expected level.", domain: "Classroom" },
  { id: "T051", prompt: "Struggles with pragmatic language (knowing what to say and when).", domain: "Classroom" },
  { id: "T052", prompt: "Misinterprets figurative language or non-literal instructions.", domain: "Classroom" },
  { id: "T053", prompt: "Has difficulty following classroom rules that are 'unwritten' or situational.", domain: "Classroom" },
  { id: "T054", prompt: "Performance changes significantly with changes in routine/teacher/environment.", domain: "Classroom" },

  // Strengths / Protective Factors (still useful for a balanced narrative)
  { id: "T055", prompt: "Shows a strong memory for facts/details that supports learning.", domain: "Strengths" },
  { id: "T056", prompt: "Has a focused interest that can be used to motivate engagement.", domain: "Strengths" },
  { id: "T057", prompt: "Responds well to clear, consistent routines and visual supports.", domain: "Strengths" },
  { id: "T058", prompt: "Demonstrates empathy or care for others when prompted or structured.", domain: "Strengths" },
  { id: "T059", prompt: "Uses coping strategies (breaks, fidgets, help cards) effectively when taught.", domain: "Strengths" },
  { id: "T060", prompt: "Builds rapport with adults in the classroom.", domain: "Strengths" },
];

// Back-compat aliases (older code sometimes imports different names)
export const autismItemsTeacher = AUTISM_ITEMS_TEACHER;
export default AUTISM_ITEMS_TEACHER;
