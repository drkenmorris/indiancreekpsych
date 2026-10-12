"use client";
// src/features/psychometrics/rtafi/components/RtafiDomainSummaryCard.tsx

import type { ReactElement } from 'react';

import type {
  RtafiDomainScore,
  RtafiSubscaleScore,
} from '../types/rtafiTypes';

interface RtafiDomainSummaryCardProps {
  domainScore: RtafiDomainScore;
  expanded?: boolean;
  showSubscales?: boolean;
}

function getSeverityClass(severity?: string): string {
  switch (severity) {
    case 'Minimal':
      return 'severity-minimal';
    case 'Mild':
      return 'severity-mild';
    case 'Moderate':
      return 'severity-moderate';
    case 'Elevated':
      return 'severity-elevated';
    case 'Severe':
      return 'severity-severe';
    default:
      return '';
  }
}

function SubscaleRow({
  subscale,
}: {
  subscale: RtafiSubscaleScore;
}): ReactElement {
  return (
    <div className="rtafi-subscale-row">
      <div className="rtafi-subscale-left">
        <div className="rtafi-subscale-name">
          {subscale.subscale}
        </div>

        <div className="rtafi-subscale-meta">
          {subscale.itemCount} items
        </div>
      </div>

      <div className="rtafi-subscale-right">
        <div className="rtafi-subscale-score">
          {subscale.meanScore.toFixed(2)}
        </div>

        <div
          className={`rtafi-subscale-severity ${getSeverityClass(
            subscale.severityLevel,
          )}`}
        >
          {subscale.severityLevel}
        </div>
      </div>
    </div>
  );
}

export default function RtafiDomainSummaryCard({
  domainScore,
  expanded = true,
  showSubscales = true,
}: RtafiDomainSummaryCardProps): ReactElement {
  const standardizedScore = domainScore.standardizedScore ?? 0;

  return (
    <div className="rtafi-domain-card">
      <div className="rtafi-domain-card-header">
        <div>
          <h3 className="rtafi-domain-title">
            {domainScore.domain}
          </h3>

          <p className="rtafi-domain-subtitle">
            {domainScore.itemCount} total items
          </p>
        </div>

        <div
          className={`rtafi-severity-badge ${getSeverityClass(
            domainScore.severityLevel,
          )}`}
        >
          {domainScore.severityLevel}
        </div>
      </div>

      <div className="rtafi-domain-score-row">
        <div className="rtafi-domain-score-block">
          <span className="rtafi-score-label">Raw Score</span>
          <strong className="rtafi-score-value">
            {domainScore.rawScore}
          </strong>
        </div>

        <div className="rtafi-domain-score-block">
          <span className="rtafi-score-label">Mean Score</span>
          <strong className="rtafi-score-value">
            {domainScore.meanScore.toFixed(2)}
          </strong>
        </div>

        <div className="rtafi-domain-score-block">
          <span className="rtafi-score-label">Standardized</span>
          <strong className="rtafi-score-value">
            {standardizedScore.toFixed(0)}
          </strong>
        </div>
      </div>

      <div className="rtafi-domain-progress">
        <div
          className="rtafi-domain-progress-fill"
          style={{ width: `${standardizedScore}%` }}
        />
      </div>

      {expanded && showSubscales && (
        <div className="rtafi-subscale-list">
          {domainScore.subscaleScores.map((subscale) => (
            <SubscaleRow
              key={subscale.subscale}
              subscale={subscale}
            />
          ))}
        </div>
      )}
    </div>
  );
}