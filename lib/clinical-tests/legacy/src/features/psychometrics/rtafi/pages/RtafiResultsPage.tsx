"use client";
// src/features/psychometrics/rtafi/pages/RtafiResultsPage.tsx

import { useMemo } from 'react';
import type { ReactElement } from 'react';

import type {
  RtafiAssessmentResult,
  RtafiBarScaleDescriptor,
  RtafiCompositeNarrative,
  RtafiDomainNarrative,
  RtafiSubscaleNarrative,
} from '../types/rtafiTypes';

import './rtafi.css';

interface RtafiResultsPageProps {
  result: RtafiAssessmentResult;
}

function scoreColorClass(score: number): string {
  if (score >= 80) return 'rtafi-bar-severe';
  if (score >= 65) return 'rtafi-bar-elevated';
  if (score >= 45) return 'rtafi-bar-moderate';
  if (score >= 25) return 'rtafi-bar-mild';

  return 'rtafi-bar-minimal';
}

function renderBarScale(
  descriptor: RtafiBarScaleDescriptor,
): ReactElement {
  return (
    <div className="rtafi-bar-scale">
      <div className="rtafi-bar-scale-header">
        <span className="rtafi-bar-scale-label">
          {descriptor.label}
        </span>

        <span className="rtafi-bar-scale-score">
          {descriptor.score.toFixed(0)}
        </span>
      </div>

      <div className="rtafi-bar-scale-track">
        <div
          className={`rtafi-bar-scale-fill ${scoreColorClass(
            descriptor.score,
          )}`}
          style={{
            width: `${descriptor.score}%`,
          }}
        />
      </div>

      <div className="rtafi-bar-scale-anchors">
        <span>{descriptor.lowAnchor}</span>

        <span>{descriptor.highAnchor}</span>
      </div>

      <p className="rtafi-bar-scale-interpretation">
        {descriptor.interpretiveText}
      </p>
    </div>
  );
}

function renderSubscaleNarrative(
  subscale: RtafiSubscaleNarrative,
): ReactElement {
  return (
    <div
      key={subscale.subscale}
      className="rtafi-subscale-card"
    >
      <div className="rtafi-subscale-header">
        <div>
          <h4>{subscale.name}</h4>

          <p className="rtafi-subscale-severity">
            {subscale.severityLevel}
          </p>
        </div>

        <div className="rtafi-subscale-score">
          {subscale.score.toFixed(0)}
        </div>
      </div>

      {renderBarScale(subscale.barScale)}

      <div className="rtafi-narrative-block">
        <h5>Construct Definition</h5>

        <p>{subscale.constructDefinition}</p>
      </div>

      <div className="rtafi-narrative-block">
        <h5>Measured Characteristics</h5>

        <ul>
          {subscale.measuredCharacteristics.map(
            (characteristic) => (
              <li key={characteristic}>
                {characteristic}
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="rtafi-narrative-block">
        <h5>Interpretive Narrative</h5>

        <p>{subscale.narrative}</p>
      </div>

      <div className="rtafi-narrative-block">
        <h5>Clinical Meaning</h5>

        <p>{subscale.clinicalMeaning}</p>
      </div>

      <div className="rtafi-caution-box">
        <strong>Interpretive Caution:</strong>

        <p>{subscale.caution}</p>
      </div>
    </div>
  );
}

function renderDomainNarrative(
  domain: RtafiDomainNarrative,
): ReactElement {
  return (
    <section
      key={domain.domain}
      className="rtafi-domain-report-section"
    >
      <div className="rtafi-domain-report-header">
        <div>
          <h2>{domain.name}</h2>

          <p className="rtafi-domain-severity">
            {domain.severityLevel}
          </p>
        </div>

        <div className="rtafi-domain-score">
          {domain.score.toFixed(0)}
        </div>
      </div>

      {renderBarScale(domain.barScale)}

      <div className="rtafi-narrative-grid">
        <div className="rtafi-narrative-card">
          <h3>Construct Definition</h3>

          <p>{domain.constructDefinition}</p>
        </div>

        <div className="rtafi-narrative-card">
          <h3>Measured Characteristics</h3>

          <ul>
            {domain.measuredCharacteristics.map(
              (characteristic) => (
                <li key={characteristic}>
                  {characteristic}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className="rtafi-narrative-card">
        <h3>Interpretive Narrative</h3>

        <p>{domain.narrative}</p>
      </div>

      <div className="rtafi-narrative-card">
        <h3>Clinical Meaning</h3>

        <p>{domain.clinicalMeaning}</p>
      </div>

      <div className="rtafi-caution-box">
        <strong>Interpretive Caution:</strong>

        <p>{domain.caution}</p>
      </div>

      <div className="rtafi-subscale-section">
        <h3>Subscale Analysis</h3>

        {domain.subscaleNarratives.map(
          renderSubscaleNarrative,
        )}
      </div>
    </section>
  );
}

function renderCompositeNarrative(
  composite: RtafiCompositeNarrative,
): ReactElement {
  return (
    <div
      key={composite.code}
      className="rtafi-composite-card"
    >
      <div className="rtafi-composite-header">
        <div>
          <h3>{composite.name}</h3>

          <p>{composite.definition}</p>
        </div>

        <div className="rtafi-composite-score">
          {composite.score.toFixed(0)}
        </div>
      </div>

      {renderBarScale(composite.barScale)}

      <div className="rtafi-narrative-block">
        <h4>Interpretive Narrative</h4>

        <p>{composite.narrative}</p>
      </div>

      <div className="rtafi-narrative-block">
        <h4>Clinical Meaning</h4>

        <p>{composite.clinicalMeaning}</p>
      </div>

      <div className="rtafi-caution-box">
        <strong>Interpretive Caution:</strong>

        <p>{composite.caution}</p>
      </div>
    </div>
  );
}

export default function RtafiResultsPage({
  result,
}: RtafiResultsPageProps): ReactElement {
  const interpretation =
    result.interpretationProfile;

  const domainNarratives = useMemo(
    () => interpretation.domainNarratives,
    [interpretation],
  );

  return (
    <div className="rtafi-results-page">
      <header className="rtafi-results-header">
        <div className="rtafi-results-banner">
          <p className="rtafi-system-name">
            Relational Trauma & Attachment
            Functioning Inventory
          </p>

          <h1>RTAFI Comprehensive Report</h1>

          <p className="rtafi-results-description">
            Multidimensional emotional,
            attachment, trauma-related,
            relational, family-system, and
            resilience functioning profile.
          </p>
        </div>
      </header>

      <section className="rtafi-overview-section">
        <h2>Clinical Overview</h2>

        <p>{interpretation.overview}</p>
      </section>

      <section className="rtafi-composites-section">
        <h2>Composite Indices</h2>

        <div className="rtafi-composites-grid">
          {interpretation.compositeNarratives.map(
            renderCompositeNarrative,
          )}
        </div>
      </section>

      <section className="rtafi-strengths-section">
        <div className="rtafi-two-column-grid">
          <div className="rtafi-info-card">
            <h2>Strength Indicators</h2>

            <ul>
              {interpretation.strengths.map(
                (strength) => (
                  <li key={strength}>
                    {strength}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="rtafi-info-card">
            <h2>Clinical Considerations</h2>

            <ul>
              {interpretation.clinicalConsiderations.map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="rtafi-domain-analysis-section">
        <h2>Domain Analysis</h2>

        {domainNarratives.map(
          renderDomainNarrative,
        )}
      </section>

      <section className="rtafi-validity-section">
        <h2>
          Validity & Response Style Analysis
        </h2>

        <div className="rtafi-validity-card">
          <p>
            {
              interpretation.validityNarrative
                .summary
            }
          </p>

          <div className="rtafi-validity-grid">
            {interpretation.validityNarrative.barScales.map(
              renderBarScale,
            )}
          </div>

          <div className="rtafi-validity-text-grid">
            <div className="rtafi-info-card">
              <h3>
                Defensive Minimization
              </h3>

              <p>
                {
                  interpretation
                    .validityNarrative
                    .defensiveMinimizationNarrative
                }
              </p>
            </div>

            <div className="rtafi-info-card">
              <h3>
                Exaggeration / Amplification
              </h3>

              <p>
                {
                  interpretation
                    .validityNarrative
                    .exaggerationNarrative
                }
              </p>
            </div>

            <div className="rtafi-info-card">
              <h3>
                Inconsistency Analysis
              </h3>

              <p>
                {
                  interpretation
                    .validityNarrative
                    .inconsistencyNarrative
                }
              </p>
            </div>

            <div className="rtafi-info-card">
              <h3>
                Response Reliability
              </h3>

              <p>
                {
                  interpretation
                    .validityNarrative
                    .reliabilityInterpretation
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rtafi-constructs-section">
        <h2>
          Construct Definitions & Clinical
          Framework
        </h2>

        <div className="rtafi-constructs-grid">
          {interpretation.constructDefinitions.map(
            (construct) => (
              <div
                key={construct.code}
                className="rtafi-construct-card"
              >
                <h3>{construct.name}</h3>

                <p>{construct.definition}</p>

                <div className="rtafi-narrative-block">
                  <h4>Measured By</h4>

                  <p>
                    {construct.measuredBy}
                  </p>
                </div>

                <div className="rtafi-narrative-block">
                  <h4>
                    Clinical Meaning
                  </h4>

                  <p>
                    {
                      construct.clinicalMeaning
                    }
                  </p>
                </div>

                <div className="rtafi-caution-box">
                  <strong>
                    Interpretive Caution:
                  </strong>

                  <ul>
                    {construct.interpretiveCautions.map(
                      (caution) => (
                        <li key={caution}>
                          {caution}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="rtafi-cautions-section">
        <div className="rtafi-warning-panel">
          <h2>
            Clinical & Interpretive
            Cautions
          </h2>

          <ul>
            {interpretation.clinicalCautions.map(
              (caution) => (
                <li key={caution}>
                  {caution}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section className="rtafi-followup-section">
        <div className="rtafi-followup-card">
          <h2>
            Recommended Clinical Follow-Up
          </h2>

          <ul>
            {interpretation.recommendedFollowUp.map(
              (item) => (
                <li key={item}>{item}</li>
              ),
            )}
          </ul>
        </div>
      </section>

      <footer className="rtafi-results-footer">
        <div className="rtafi-disclaimer-box">
          <strong>
            Report Disclaimer
          </strong>

          <p>
            {
              interpretation.reportDisclaimer
            }
          </p>
        </div>

        <div className="rtafi-generated-at">
          Report Generated:{' '}
          {new Date(
            result.completedAt,
          ).toLocaleString()}
        </div>
      </footer>
    </div>
  );
}