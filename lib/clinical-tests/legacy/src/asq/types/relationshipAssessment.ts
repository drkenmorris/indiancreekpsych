// types/relationshipAssessment.ts
export type Likert6 = 1 | 2 | 3 | 4 | 5 | 6;

export type FormType = "FORM_A_SELF" | "FORM_B_PARTNER";

export type Domain =
  | "I_LOVE_INTEGRITY"
  | "II_POSITIVE_BONDING"
  | "III_NEGATIVE_BONDING"
  | "IV_HORSEMEN_REPAIR"
  | "V_PROCESS"
  | "VI_SAFETY_POWER"
  | "VII_HOPE_COLLAPSE"
  | "VAL_VALIDITY";

export type Subscale =
  // Domain I
  | "I1_REGULATION_PATIENCE"
  | "I2_KINDNESS"
  | "I3_HUMILITY"
  | "I4_HONOR_RESPECT"
  | "I5_INTEGRITY_TRUTH"
  | "I6_MERCY_NO_SCOREKEEPING"
  | "I7_PROTECTIVE_LOYALTY"
  | "I8_ENDURING_COMMITMENT"
  // Domain II
  | "II1_SECURE_BASE"
  | "II2_ADMIRATION_FONDNESS"
  | "II3_EMOTIONAL_INTIMACY"
  | "II4_ENJOYMENT_FRIENDSHIP"
  | "II5_SHARED_MEANING_TEAM"
  | "II6_DEDICATION_WANT_TO"
  | "II7_GROWTH_SUPPORT"
  // ...we’ll add the rest as we go
  ;

export interface AssessmentItem {
  id: number;               // e.g., 1..217
  form: FormType;           // self vs partner form
  domain: Domain;
  subscale: Subscale;
  reverse: boolean;
  text: string;
}

export interface AssessmentResponse {
  [itemId: number]: Likert6; // itemId -> response 1..6
}