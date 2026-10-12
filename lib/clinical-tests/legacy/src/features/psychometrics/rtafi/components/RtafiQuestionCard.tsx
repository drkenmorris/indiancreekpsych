"use client";
// src/features/psychometrics/rtafi/components/RtafiQuestionCard.tsx

import type { ReactElement } from 'react';

import type {
  RtafiItem,
  RtafiResponseValue,
} from '../types/rtafiTypes';

import { RTAFI_RESPONSE_OPTIONS } from '../types/rtafiTypes';

interface RtafiQuestionCardProps {
  item: RtafiItem;
  selectedValue?: RtafiResponseValue;
  onChange: (itemId: string, value: RtafiResponseValue) => void;
  disabled?: boolean;
  showMetadata?: boolean;
}

export default function RtafiQuestionCard({
  item,
  selectedValue,
  onChange,
  disabled = false,
  showMetadata = false,
}: RtafiQuestionCardProps): ReactElement {
  return (
    <div className="rtafi-question-card">
      <div className="rtafi-question-top">
        <div>
          <span className="rtafi-question-number">
            Item {item.itemNumber}
          </span>

          {showMetadata && (
            <div className="rtafi-question-metadata">
              <span>{item.domain}</span>
              <span>{item.subscale}</span>
            </div>
          )}
        </div>

        {item.reverseScored && (
          <span className="rtafi-reverse-keyed-badge">
            Reverse Keyed
          </span>
        )}
      </div>

      <p className="rtafi-question-text">{item.prompt}</p>

      <div className="rtafi-response-grid">
        {RTAFI_RESPONSE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={
              selectedValue === option.value
                ? 'rtafi-response-button active'
                : 'rtafi-response-button'
            }
            onClick={() => onChange(item.id, option.value)}
          >
            <span className="rtafi-response-value">
              {option.value}
            </span>

            <span className="rtafi-response-label">
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="rtafi-tag-container">
          {item.tags.map((tag) => (
            <span key={tag} className="rtafi-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}