"use client";
// src/features/psychometrics/rtafi/pages/RtafiHouseholdSetupPage.tsx

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import {
  loadRtafiIntakeProfile,
} from '../intake/rtafiIntakeStorage';

import type {
  RtafiAdministrationContext,
} from '../context/rtafiHouseholdContextTypes';

import {
  buildGeneralContext,
  buildHouseholdAContext,
  buildHouseholdBContext,
  buildCaregiverSpecificContext,
  buildSchoolSettingContext,
  buildResidentialSettingContext,
  buildCommunitySettingContext,
} from '../context/rtafiHouseholdItemAdapter';

import './rtafi.css';

interface RtafiHouseholdSetupPageProps {
  onContinue?: (
    contexts: RtafiAdministrationContext[],
  ) => void;
}

export default function RtafiHouseholdSetupPage({
  onContinue,
}: RtafiHouseholdSetupPageProps): ReactElement {
  const intakeProfile =
    useMemo(
      () =>
        loadRtafiIntakeProfile(),
      [],
    );

  const [
    selectedContexts,
    setSelectedContexts,
  ] = useState<
    RtafiAdministrationContext[]
  >([]);

  const householdAName =
    intakeProfile
      ?.primaryGuardian?.name;

  const householdBName =
    intakeProfile
      ?.secondaryGuardian?.name;

  const availableContexts =
    useMemo<
      RtafiAdministrationContext[]
    >(() => {
      const contexts: RtafiAdministrationContext[] =
        [];

      contexts.push(
        buildGeneralContext(),
      );

      if (
        intakeProfile
          ?.hasMultipleHouseholds
      ) {
        contexts.push(
          buildHouseholdAContext(
            householdAName,
          ),
        );

        contexts.push(
          buildHouseholdBContext(
            householdBName,
          ),
        );
      }

      intakeProfile?.caregiverSettings.forEach(
        (setting) => {
          if (
            setting.relationshipToYouth
          ) {
            contexts.push(
              buildCaregiverSpecificContext(
                {
                  contextId:
                    setting.id,

                  caregiverName:
                    setting.label,

                  relationship:
                    setting.relationshipToYouth,

                  displayLabel:
                    setting.label,
                },
              ),
            );
          }

          const description =
            setting.settingDescription.toLowerCase();

          if (
            description.includes(
              'school',
            )
          ) {
            contexts.push(
              buildSchoolSettingContext(
                setting.label ||
                  'School Setting',
              ),
            );
          }

          if (
            description.includes(
              'residential',
            ) ||
            description.includes(
              'foster',
            ) ||
            description.includes(
              'placement',
            )
          ) {
            contexts.push(
              buildResidentialSettingContext(
                setting.label ||
                  'Residential Setting',
              ),
            );
          }

          if (
            description.includes(
              'community',
            ) ||
            description.includes(
              'church',
            ) ||
            description.includes(
              'program',
            )
          ) {
            contexts.push(
              buildCommunitySettingContext(
                setting.label ||
                  'Community Setting',
              ),
            );
          }
        },
      );

      return contexts;
    }, [
      intakeProfile,
      householdAName,
      householdBName,
    ]);

  function toggleContext(
    context: RtafiAdministrationContext,
  ): void {
    setSelectedContexts(
      (previous) => {
        const exists =
          previous.some(
            (item) =>
              item.contextId ===
              context.contextId,
          );

        if (exists) {
          return previous.filter(
            (item) =>
              item.contextId !==
              context.contextId,
          );
        }

        return [
          ...previous,
          context,
        ];
      },
    );
  }

  function continueSetup(): void {
    if (
      selectedContexts.length ===
      0
    ) {
      return;
    }

    if (onContinue) {
      onContinue(
        selectedContexts,
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
            Context &
            Household Setup
          </h1>

          <p className="rtafi-description">
            Select the household,
            caregiver, or setting
            contexts that should be
            evaluated during this
            RTAFI administration.
          </p>
        </div>
      </header>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Available Contexts
            </h2>

            <p>
              Multiple contexts may
              be selected for
              comparative
              administration.
            </p>
          </div>
        </div>

        <div className="rtafi-checkbox-grid">
          {availableContexts.map(
            (context) => {
              const selected =
                selectedContexts.some(
                  (item) =>
                    item.contextId ===
                    context.contextId,
                );

              return (
                <button
                  key={
                    context.contextId
                  }
                  type="button"
                  className={`rtafi-checkbox-card ${
                    selected
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    toggleContext(
                      context,
                    )
                  }
                >
                  <div>
                    <strong>
                      {
                        context.displayLabel
                      }
                    </strong>

                    <p
                      style={{
                        marginTop:
                          '0.5rem',
                        lineHeight:
                          1.6,
                        color:
                          '#475569',
                      }}
                    >
                      {
                        context.instructions
                      }
                    </p>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-mode-preview">
          <h2>
            Selected Contexts
          </h2>

          {selectedContexts.length ===
          0 ? (
            <p>
              No contexts selected
              yet.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent:
                  'center',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              {selectedContexts.map(
                (context) => (
                  <div
                    key={
                      context.contextId
                    }
                    className="rtafi-mode-badge"
                  >
                    {
                      context.displayLabel
                    }
                  </div>
                ),
              )}
            </div>
          )}

          <p
            style={{
              marginTop: '1.5rem',
            }}
          >
            Contextualized testing
            allows emotional,
            attachment, trauma, and
            relational functioning
            to be compared across
            different caregiving
            environments.
          </p>
        </div>
      </section>

      <section className="rtafi-footer">
        <button
          type="button"
          className="rtafi-submit-button"
          disabled={
            selectedContexts.length ===
            0
          }
          onClick={
            continueSetup
          }
        >
          Continue To
          Contextualized RTAFI
        </button>
      </section>
    </div>
  );
}