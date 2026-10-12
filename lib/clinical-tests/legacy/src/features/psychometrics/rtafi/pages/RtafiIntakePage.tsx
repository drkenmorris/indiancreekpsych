"use client";
// src/features/psychometrics/rtafi/pages/RtafiIntakePage.tsx

import { useMemo, useState } from 'react';



import type { ReactElement } from 'react';

import type {
  RtafiAdministrationMode,
  RtafiCaregiverSetting,
  RtafiGuardianRegistration,
  RtafiIntakeProfile,
  RtafiRespondentRole,
} from '../intake/rtafiIntakeTypes';

import {
  saveRtafiIntakeProfile,
} from '../intake/rtafiIntakeStorage';

import './rtafi.css';

interface RtafiIntakePageProps {
  onContinue?: (
    mode: RtafiAdministrationMode,
  ) => void;
}

const RESPONDENT_ROLE_OPTIONS: {
  value: RtafiRespondentRole;
  label: string;
}[] = [
  {
    value: 'child_self_report',
    label: 'Child / Adolescent Self Report',
  },
  {
    value: 'parent_guardian_report',
    label: 'Parent / Guardian Assisted',
  },
  {
    value: 'clinician_assisted',
    label: 'Clinician Assisted Administration',
  },
  {
    value: 'research_administered',
    label: 'Research Administration',
  },
];

function buildInitialCaregiverSetting(): RtafiCaregiverSetting {
  return {
    id: crypto.randomUUID(),
    label: '',
    relationshipToYouth: '',
    settingDescription: '',
    approximateTimeSpentPercent: 0,
    notes: '',
  };
}

function determineRecommendedMode(
  hasMultipleHouseholds: boolean,
  hasMultipleCaregivers: boolean,
  hasSchoolOrResidentialSettingConcern: boolean,
): RtafiAdministrationMode {
  if (
    hasMultipleHouseholds
  ) {
    return 'two_household_comparison';
  }

  if (
    hasMultipleCaregivers ||
    hasSchoolOrResidentialSettingConcern
  ) {
    return 'multi_caregiver_setting';
  }

  return 'single_profile';
}

export default function RtafiIntakePage({
  onContinue,
}: RtafiIntakePageProps): ReactElement {
  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [preferredName, setPreferredName] =
    useState('');

  const [age, setAge] =
    useState<number>(14);

  const [gradeLevel, setGradeLevel] =
    useState('');

  const [respondentRole, setRespondentRole] =
    useState<RtafiRespondentRole>(
      'child_self_report',
    );

  const [
    hasMultipleHouseholds,
    setHasMultipleHouseholds,
  ] = useState(false);

  const [
    hasSharedCustodyOrSplitPlacement,
    setHasSharedCustodyOrSplitPlacement,
  ] = useState(false);

  const [
    hasMultipleCaregivers,
    setHasMultipleCaregivers,
  ] = useState(false);

  const [
    hasSchoolOrResidentialSettingConcern,
    setHasSchoolOrResidentialSettingConcern,
  ] = useState(false);

  const [
    primaryConcernSummary,
    setPrimaryConcernSummary,
  ] = useState('');

  const [
    safetyOrUrgencyConcern,
    setSafetyOrUrgencyConcern,
  ] = useState(false);

  const [
    caregiverSettings,
    setCaregiverSettings,
  ] = useState<RtafiCaregiverSetting[]>([
    buildInitialCaregiverSetting(),
  ]);

  const [
    primaryGuardianName,
    setPrimaryGuardianName,
  ] = useState('');

  const [
    primaryGuardianRelationship,
    setPrimaryGuardianRelationship,
  ] = useState('');

  const [
    secondaryGuardianName,
    setSecondaryGuardianName,
  ] = useState('');

  const [
    secondaryGuardianRelationship,
    setSecondaryGuardianRelationship,
  ] = useState('');

  const recommendedMode =
    useMemo(
      () =>
        determineRecommendedMode(
          hasMultipleHouseholds,
          hasMultipleCaregivers,
          hasSchoolOrResidentialSettingConcern,
        ),
      [
        hasMultipleHouseholds,
        hasMultipleCaregivers,
        hasSchoolOrResidentialSettingConcern,
      ],
    );

  function updateCaregiverSetting(
    id: string,
    field:
      | 'label'
      | 'relationshipToYouth'
      | 'settingDescription'
      | 'approximateTimeSpentPercent'
      | 'notes',
    value: string | number,
  ): void {
    setCaregiverSettings(
      (previous) =>
        previous.map((setting) =>
          setting.id === id
            ? {
                ...setting,
                [field]: value,
              }
            : setting,
        ),
    );
  }

  function addCaregiverSetting(): void {
    setCaregiverSettings(
      (previous) => [
        ...previous,
        buildInitialCaregiverSetting(),
      ],
    );
  }

  function removeCaregiverSetting(
    id: string,
  ): void {
    setCaregiverSettings(
      (previous) =>
        previous.filter(
          (setting) =>
            setting.id !== id,
        ),
    );
  }

  function buildGuardian(
    name: string,
    relationship: string,
    householdLabel?:
      | 'household_a'
      | 'household_b',
  ): RtafiGuardianRegistration | undefined {
    if (!name.trim()) {
      return undefined;
    }

    return {
      guardianId:
        crypto.randomUUID(),
      name,
      relationshipToYouth:
        relationship,
      householdLabel,
    };
  }

  function submitIntake(): void {
    const profile: RtafiIntakeProfile =
      {
        intakeId:
          crypto.randomUUID(),

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),

        respondentRole,

        administrationMode:
          recommendedMode,

        youth: {
          youthId:
            crypto.randomUUID(),

          firstName,

          lastName,

          preferredName,

          age,

          gradeLevel,
        },

        primaryGuardian:
          buildGuardian(
            primaryGuardianName,
            primaryGuardianRelationship,
            'household_a',
          ),

        secondaryGuardian:
          buildGuardian(
            secondaryGuardianName,
            secondaryGuardianRelationship,
            'household_b',
          ),

        caregiverSettings,

        hasMultipleHouseholds,

        hasSharedCustodyOrSplitPlacement,

        hasMultipleCaregivers,

        hasSchoolOrResidentialSettingConcern,

        primaryConcernSummary,

        safetyOrUrgencyConcern,

        selectedModeRationale:
          recommendedMode ===
          'single_profile'
            ? 'Single profile administration selected because no major contextual household differentiation was identified.'
            : recommendedMode ===
                'two_household_comparison'
              ? 'Two-household comparison selected due to multiple-household / split-placement structure.'
              : 'Multi-caregiver / multi-setting administration selected because multiple caregiving or contextual settings were identified.',
      };

    saveRtafiIntakeProfile(
      profile,
    );

    if (onContinue) {
      onContinue(
        recommendedMode,
      );
    }
  }

  return (
    <div className="rtafi-page">
      <header className="rtafi-header">
        <div className="rtafi-header-inner">
          <p className="rtafi-system-name">
            Relational Trauma &
            Attachment Functioning
            Inventory
          </p>

          <h1 className="rtafi-title">
            RTAFI Intake Registration
          </h1>

          <p className="rtafi-description">
            This intake process
            determines the most
            appropriate RTAFI
            administration pathway
            based upon household
            structure, caregiving
            environment, and
            contextual relational
            dynamics.
          </p>
        </div>
      </header>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Youth Registration
            </h2>

            <p>
              Demographic &
              administration setup
            </p>
          </div>
        </div>

        <div className="rtafi-form-grid">
          <div className="rtafi-form-field">
            <label>
              First Name
            </label>

            <input
              value={firstName}
              onChange={(event) =>
                setFirstName(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Last Name
            </label>

            <input
              value={lastName}
              onChange={(event) =>
                setLastName(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Preferred Name
            </label>

            <input
              value={
                preferredName
              }
              onChange={(event) =>
                setPreferredName(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>Age</label>

            <input
              type="number"
              min={10}
              max={18}
              value={age}
              onChange={(
                event,
              ) =>
                setAge(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Grade Level
            </label>

            <input
              value={gradeLevel}
              onChange={(event) =>
                setGradeLevel(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Respondent Role
            </label>

            <select
              value={
                respondentRole
              }
              onChange={(
                event,
              ) =>
                setRespondentRole(
                  event.target
                    .value as RtafiRespondentRole,
                )
              }
            >
              {RESPONDENT_ROLE_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Household &
              Context Structure
            </h2>

            <p>
              Determines assessment
              pathway
            </p>
          </div>
        </div>

        <div className="rtafi-checkbox-grid">
          <label className="rtafi-checkbox-card">
            <input
              type="checkbox"
              checked={
                hasMultipleHouseholds
              }
              onChange={(
                event,
              ) =>
                setHasMultipleHouseholds(
                  event.target.checked,
                )
              }
            />

            <span>
              Youth spends time in
              more than one
              household
            </span>
          </label>

          <label className="rtafi-checkbox-card">
            <input
              type="checkbox"
              checked={
                hasSharedCustodyOrSplitPlacement
              }
              onChange={(
                event,
              ) =>
                setHasSharedCustodyOrSplitPlacement(
                  event.target.checked,
                )
              }
            />

            <span>
              Shared custody /
              split placement
            </span>
          </label>

          <label className="rtafi-checkbox-card">
            <input
              type="checkbox"
              checked={
                hasMultipleCaregivers
              }
              onChange={(
                event,
              ) =>
                setHasMultipleCaregivers(
                  event.target.checked,
                )
              }
            />

            <span>
              Multiple caregiving
              adults significantly
              involved
            </span>
          </label>

          <label className="rtafi-checkbox-card">
            <input
              type="checkbox"
              checked={
                hasSchoolOrResidentialSettingConcern
              }
              onChange={(
                event,
              ) =>
                setHasSchoolOrResidentialSettingConcern(
                  event.target.checked,
                )
              }
            />

            <span>
              School, residential,
              foster, or program
              setting concern
            </span>
          </label>
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Guardians /
              Caregivers
            </h2>
          </div>
        </div>

        <div className="rtafi-form-grid">
          <div className="rtafi-form-field">
            <label>
              Primary Guardian
            </label>

            <input
              value={
                primaryGuardianName
              }
              onChange={(event) =>
                setPrimaryGuardianName(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Relationship
            </label>

            <input
              value={
                primaryGuardianRelationship
              }
              onChange={(event) =>
                setPrimaryGuardianRelationship(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Secondary Guardian
            </label>

            <input
              value={
                secondaryGuardianName
              }
              onChange={(event) =>
                setSecondaryGuardianName(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="rtafi-form-field">
            <label>
              Relationship
            </label>

            <input
              value={
                secondaryGuardianRelationship
              }
              onChange={(event) =>
                setSecondaryGuardianRelationship(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Caregiver / Setting
              Mapping
            </h2>
          </div>
        </div>

        {caregiverSettings.map(
          (setting) => (
            <div
              key={setting.id}
              className="rtafi-setting-card"
            >
              <div className="rtafi-form-grid">
                <div className="rtafi-form-field">
                  <label>
                    Setting Label
                  </label>

                  <input
                    value={
                      setting.label
                    }
                    onChange={(
                      event,
                    ) =>
                      updateCaregiverSetting(
                        setting.id,
                        'label',
                        event.target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="rtafi-form-field">
                  <label>
                    Relationship
                  </label>

                  <input
                    value={
                      setting.relationshipToYouth
                    }
                    onChange={(
                      event,
                    ) =>
                      updateCaregiverSetting(
                        setting.id,
                        'relationshipToYouth',
                        event.target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="rtafi-form-field">
                  <label>
                    Approximate %
                    of Time
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={
                      setting.approximateTimeSpentPercent
                    }
                    onChange={(
                      event,
                    ) =>
                      updateCaregiverSetting(
                        setting.id,
                        'approximateTimeSpentPercent',
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                  />
                </div>
              </div>

              <div className="rtafi-form-field">
                <label>
                  Setting
                  Description
                </label>

                <textarea
                  value={
                    setting.settingDescription
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCaregiverSetting(
                      setting.id,
                      'settingDescription',
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <div className="rtafi-form-field">
                <label>
                  Notes
                </label>

                <textarea
                  value={
                    setting.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCaregiverSetting(
                      setting.id,
                      'notes',
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              {caregiverSettings.length >
                1 && (
                <button
                  type="button"
                  className="rtafi-remove-setting-button"
                  onClick={() =>
                    removeCaregiverSetting(
                      setting.id,
                    )
                  }
                >
                  Remove Setting
                </button>
              )}
            </div>
          ),
        )}

        <button
          type="button"
          className="rtafi-submit-button"
          onClick={
            addCaregiverSetting
          }
        >
          Add Additional Setting
        </button>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Clinical Concern
              Summary
            </h2>
          </div>
        </div>

        <div className="rtafi-form-field">
          <label>
            Brief Concern Summary
          </label>

          <textarea
            value={
              primaryConcernSummary
            }
            onChange={(event) =>
              setPrimaryConcernSummary(
                event.target.value,
              )
            }
          />
        </div>

        <label className="rtafi-checkbox-card">
          <input
            type="checkbox"
            checked={
              safetyOrUrgencyConcern
            }
            onChange={(
              event,
            ) =>
              setSafetyOrUrgencyConcern(
                event.target.checked,
              )
            }
          />

          <span>
            There may be
            significant emotional
            safety or urgent
            concern indicators
          </span>
        </label>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-mode-preview">
          <h2>
            Recommended
            Administration Mode
          </h2>

          <div className="rtafi-mode-badge">
            {recommendedMode ===
            'single_profile'
              ? 'Single Profile Administration'
              : recommendedMode ===
                  'two_household_comparison'
                ? 'Two-Household Comparative Administration'
                : 'Multi-Caregiver / Multi-Setting Administration'}
          </div>

          <p>
            The intake system uses
            contextual household,
            caregiver, and
            placement structure to
            recommend the most
            clinically appropriate
            assessment pathway.
          </p>
        </div>
      </section>

      <section className="rtafi-footer">
        <button
          type="button"
          className="rtafi-submit-button"
          onClick={submitIntake}
        >
          Continue To RTAFI
          Administration
        </button>
      </section>
    </div>
  );
}