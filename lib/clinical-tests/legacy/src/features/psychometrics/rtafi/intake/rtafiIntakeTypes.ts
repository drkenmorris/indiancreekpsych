// src/features/psychometrics/rtafi/intake/rtafiIntakeTypes.ts

export type RtafiAdministrationMode =
  | 'single_profile'
  | 'two_household_comparison'
  | 'multi_caregiver_setting';

export type RtafiRespondentRole =
  | 'child_self_report'
  | 'parent_guardian_report'
  | 'clinician_assisted'
  | 'research_administered';

export type RtafiHouseholdLabel =
  | 'household_a'
  | 'household_b'
  | 'other_setting';

export interface RtafiCaregiverSetting {
  id: string;
  label: string;
  relationshipToYouth: string;
  settingDescription: string;
  approximateTimeSpentPercent?: number;
  notes?: string;
}

export interface RtafiYouthRegistration {
  youthId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  age: number;
  dateOfBirth?: string;
  gender?: string;
  gradeLevel?: string;
}

export interface RtafiGuardianRegistration {
  guardianId: string;
  name: string;
  relationshipToYouth: string;
  email?: string;
  phone?: string;
  householdLabel?: RtafiHouseholdLabel;
}

export interface RtafiIntakeProfile {
  intakeId: string;
  createdAt: string;
  updatedAt: string;

  respondentRole: RtafiRespondentRole;

  administrationMode: RtafiAdministrationMode;

  youth: RtafiYouthRegistration;

  primaryGuardian?: RtafiGuardianRegistration;

  secondaryGuardian?: RtafiGuardianRegistration;

  caregiverSettings: RtafiCaregiverSetting[];

  hasMultipleHouseholds: boolean;

  hasSharedCustodyOrSplitPlacement: boolean;

  hasMultipleCaregivers: boolean;

  hasSchoolOrResidentialSettingConcern: boolean;

  primaryConcernSummary?: string;

  safetyOrUrgencyConcern?: boolean;

  selectedModeRationale: string;
}

export interface RtafiIntakeModeRecommendation {
  recommendedMode: RtafiAdministrationMode;
  rationale: string;
}
