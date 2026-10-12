"use client";
// src/features/psychometrics/rtafi/pages/RtafiHouseholdComparisonPage.tsx

import type { ReactElement } from 'react';

import type {
  RtafiAssessmentResult,
} from '../types/rtafiTypes';

import type {
  RtafiComparativeProfile,
  RtafiCrossContextInterpretation,
} from '../context/rtafiHouseholdContextTypes';



import {
  generateHouseholdDifferenceTable,
  type RtafiHouseholdDifferenceRow,
} from '../narratives/rtafiHouseholdComparisonNarratives';




import './rtafi.css';

interface RtafiHouseholdComparisonPageProps {
  householdAResult: RtafiAssessmentResult;
  householdBResult: RtafiAssessmentResult;

  comparativeProfile: RtafiComparativeProfile;

  interpretation: RtafiCrossContextInterpretation;

  householdALabel?: string;
  householdBLabel?: string;
}

function renderDifferenceBar(
  value: number,
): ReactElement {
  const normalized =
    Math.min(
      Math.max(value, 0),
      40,
    ) / 40;

  const width =
    `${normalized * 100}%`;

  return (
    <div
      style={{
        width: '100%',
        height: '14px',
        borderRadius: '999px',
        overflow: 'hidden',
        background:
          '#dbeafe',
      }}
    >
      <div
        style={{
          width,
          height: '100%',
          borderRadius:
            '999px',
          background:
            'linear-gradient(90deg, #0f62fe 0%, #2563eb 100%)',
        }}
      />
    </div>
  );
}

export default function RtafiHouseholdComparisonPage({
  householdAResult,
  householdBResult,
  comparativeProfile,
  interpretation,
  householdALabel = 'Household A',
  householdBLabel = 'Household B',
}: RtafiHouseholdComparisonPageProps): ReactElement {
  const differenceTable =
    generateHouseholdDifferenceTable(
      {
        comparativeProfile,
      },
    );

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
            Household Comparison
            Analysis
          </h1>

          <p className="rtafi-description">
            Cross-context emotional,
            relational, attachment,
            and trauma comparison
            profile.
          </p>
        </div>
      </header>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Comparative Summary
            </h2>
          </div>
        </div>

        <p
          style={{
            lineHeight: 1.8,
            color: '#334155',
            margin: 0,
          }}
        >
          {
            comparativeProfile.summaryNarrative
          }
        </p>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Context Comparison
            </h2>

            <p>
              Difference magnitude
              across major
              psychological
              constructs
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: '1rem',
          }}
        >



{differenceTable.map(
  (row: RtafiHouseholdDifferenceRow) => (



              <div
                key={
                  row.construct
                }
                style={{
                  border:
                    '1px solid #dbeafe',
                  borderRadius:
                    '18px',
                  padding:
                    '1rem',
                  background:
                    'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
                }}
              >
                <div
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    marginBottom:
                      '0.75rem',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <strong>
                      {
                        row.construct
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      fontWeight:
                        800,
                      color:
                        '#0f172a',
                    }}
                  >
                    {
                      row.severity
                    } difference
                  </div>
                </div>

                {renderDifferenceBar(
                  row.difference,
                )}

                <div
                  style={{
                    marginTop:
                      '0.65rem',
                    fontSize:
                      '0.88rem',
                    color:
                      '#64748b',
                  }}
                >
                  Difference
                  Magnitude:{' '}
                  {
                    row.difference
                  }
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Household Profile
              Snapshot
            </h2>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="rtafi-setting-card">
            <h3
              style={{
                marginTop: 0,
              }}
            >
              {householdALabel}
            </h3>

            <p>
              Trauma Burden:{' '}
              <strong>
                {
                  householdAResult
                    .compositeIndices
                    .traumaBurdenIndex
                }
              </strong>
            </p>

            <p>
              Relational Safety:{' '}
              <strong>
                {
                  householdAResult
                    .compositeIndices
                    .relationalSafetyIndex
                }
              </strong>
            </p>

            <p>
              Attachment Security:{' '}
              <strong>
                {
                  householdAResult
                    .compositeIndices
                    .attachmentSecurityIndex
                }
              </strong>
            </p>

            <p>
              Family Stability:{' '}
              <strong>
                {
                  householdAResult
                    .compositeIndices
                    .familyStabilityIndex
                }
              </strong>
            </p>
          </div>

          <div className="rtafi-setting-card">
            <h3
              style={{
                marginTop: 0,
              }}
            >
              {householdBLabel}
            </h3>

            <p>
              Trauma Burden:{' '}
              <strong>
                {
                  householdBResult
                    .compositeIndices
                    .traumaBurdenIndex
                }
              </strong>
            </p>

            <p>
              Relational Safety:{' '}
              <strong>
                {
                  householdBResult
                    .compositeIndices
                    .relationalSafetyIndex
                }
              </strong>
            </p>

            <p>
              Attachment Security:{' '}
              <strong>
                {
                  householdBResult
                    .compositeIndices
                    .attachmentSecurityIndex
                }
              </strong>
            </p>

            <p>
              Family Stability:{' '}
              <strong>
                {
                  householdBResult
                    .compositeIndices
                    .familyStabilityIndex
                }
              </strong>
            </p>
          </div>
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Interpretive Summary
            </h2>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: '1rem',
          }}
        >
          <div className="rtafi-setting-card">
            <strong>
              Strongest Safety
              Context
            </strong>

            <p
              style={{
                marginBottom: 0,
                lineHeight: 1.7,
              }}
            >
              {
                interpretation.strongestSafetyContext
              }
            </p>
          </div>

          <div className="rtafi-setting-card">
            <strong>
              Highest Stress
              Context
            </strong>

            <p
              style={{
                marginBottom: 0,
                lineHeight: 1.7,
              }}
            >
              {
                interpretation.highestStressContext
              }
            </p>
          </div>

          <div className="rtafi-setting-card">
            <strong>
              Context Sensitivity
              Pattern
            </strong>

            <p
              style={{
                marginBottom: 0,
                lineHeight: 1.7,
              }}
            >
              {
                interpretation.contextSensitivityPattern
              }
            </p>
          </div>

          <div className="rtafi-setting-card">
            <strong>
              Clinical
              Considerations
            </strong>

            <ul
              style={{
                marginTop:
                  '0.75rem',
                lineHeight: 1.8,
                color:
                  '#334155',
              }}
            >
              {interpretation.clinicalConsiderations.map(
                (
                  consideration,
                ) => (
                  <li
                    key={
                      consideration
                    }
                  >
                    {
                      consideration
                    }
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}