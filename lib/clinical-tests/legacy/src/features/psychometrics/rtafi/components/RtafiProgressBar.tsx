"use client";
// src/features/psychometrics/rtafi/components/RtafiProgressBar.tsx

import type { ReactElement } from 'react';

interface RtafiProgressBarProps {
  percentage: number;
  completedItems: number;
  totalItems: number;
  showCounts?: boolean;
  showPercentage?: boolean;
  label?: string;
}

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export default function RtafiProgressBar({
  percentage,
  completedItems,
  totalItems,
  showCounts = true,
  showPercentage = true,
  label = 'Assessment Progress',
}: RtafiProgressBarProps): ReactElement {
  const safePercentage = clampPercentage(percentage);

  return (
    <div className="rtafi-progress-panel">
      <div className="rtafi-progress-header">
        <div className="rtafi-progress-label-group">
          <span className="rtafi-progress-label">{label}</span>

          {showCounts && (
            <span className="rtafi-progress-counts">
              {completedItems} / {totalItems} completed
            </span>
          )}
        </div>

        {showPercentage && (
          <span className="rtafi-progress-percent">
            {safePercentage.toFixed(0)}%
          </span>
        )}
      </div>

      <div className="rtafi-progress-bar">
        <div
          className="rtafi-progress-fill"
          style={{ width: `${safePercentage}%` }}
        />
      </div>

      <div className="rtafi-progress-markers">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}