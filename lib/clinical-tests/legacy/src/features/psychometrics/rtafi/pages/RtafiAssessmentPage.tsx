"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/features/psychometrics/rtafi/pages/RtafiAssessmentPage.tsx

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactElement } from 'react';

import { RTAFI_ITEMS } from '../data/rtafiItems';

import {
  RTAFI_RESPONSE_OPTIONS,
  type RtafiResponse,
  type RtafiResponseValue,
} from '../types/rtafiTypes';

import {
  scoreRtafiAssessment,
} from '../engine/rtafiScoring';

import './rtafi.css';

const STORAGE_KEY =
  'rtafi-current-responses';

const RESULTS_STORAGE_KEY =
  'rtafi-last-result';

interface RtafiAssessmentPageProps {
  onComplete?: () => void;
}

function buildProgressPercentage(
  responses: RtafiResponse[],
): number {
  return (
    (responses.length /
      RTAFI_ITEMS.length) *
    100
  );
}

function getDomainCounts() {
  return RTAFI_ITEMS.reduce<
    Record<string, number>
  >((accumulator, item) => {
    accumulator[item.domain] =
      (accumulator[item.domain] ??
        0) + 1;

    return accumulator;
  }, {});
}

export default function RtafiAssessmentPage({
  onComplete,
}: RtafiAssessmentPageProps): ReactElement {
  const [responses, setResponses] =
    useState<RtafiResponse[]>([]);

  const [currentPage, setCurrentPage] =
    useState(0);

  const itemsPerPage = 20;

  const totalPages = Math.ceil(
    RTAFI_ITEMS.length / itemsPerPage,
  );

  const progress =
    buildProgressPercentage(
      responses,
    );

  const answeredItemIds =
    useMemo(
      () =>
        new Set(
          responses.map(
            (response) =>
              response.itemId,
          ),
        ),
      [responses],
    );

  const pagedItems = useMemo(() => {
    const start =
      currentPage * itemsPerPage;

    return RTAFI_ITEMS.slice(
      start,
      start + itemsPerPage,
    );
  }, [currentPage]);

  const domainCounts = useMemo(
    () => getDomainCounts(),
    [],
  );

  useEffect(() => {
    const stored =
      clinicalSessionStore.getItem(
        STORAGE_KEY,
      );

    if (!stored) return;

    try {
      const parsed =
        JSON.parse(stored);

      setResponses(parsed);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    clinicalSessionStore.setItem(
      STORAGE_KEY,
      JSON.stringify(responses),
    );
  }, [responses]);

  function updateResponse(
    itemId: string,
    value: RtafiResponseValue,
  ): void {
    setResponses((previous) => {
      const existing =
        previous.find(
          (response) =>
            response.itemId ===
            itemId,
        );

      if (existing) {
        return previous.map(
          (response) =>
            response.itemId ===
            itemId
              ? {
                  ...response,
                  value,
                }
              : response,
        );
      }

      return [
        ...previous,
        {
          itemId,
          value,
        },
      ];
    });
  }

  function getResponseValue(
    itemId: string,
  ): number | null {
    const response =
      responses.find(
        (entry) =>
          entry.itemId === itemId,
      );

    return response
      ? response.value
      : null;
  }

  function submitAssessment(): void {
    if (
      responses.length <
      RTAFI_ITEMS.length * 0.9
    ) {
      alert(
        'Please complete at least 90% of the assessment before generating the report.',
      );

      return;
    }

    const result =
      scoreRtafiAssessment(
        responses,
      );

    clinicalSessionStore.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify(result),
    );

    if (onComplete) {
      onComplete();
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
            RTAFI Research Form
          </h1>

          <p className="rtafi-description">
            Comprehensive multidomain
            emotional, attachment,
            trauma-related, family
            functioning, relational
            safety, and resilience
            assessment for children and
            adolescents ages 10–18.
          </p>
        </div>
      </header>

      <section className="rtafi-progress-panel">
        <div className="rtafi-progress-row">
          <span>
            Assessment Completion
          </span>

          <span>
            {responses.length} /{' '}
            {RTAFI_ITEMS.length}
          </span>
        </div>

        <div className="rtafi-progress-bar">
          <div
            className="rtafi-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <p className="rtafi-progress-note">
          {progress.toFixed(0)}%
          complete
        </p>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Assessment Structure
            </h2>

            <p>
              Total Items:{' '}
              {RTAFI_ITEMS.length}
            </p>
          </div>

          <div>
            {Object.entries(
              domainCounts,
            ).map(
              ([domain, count]) => (
                <p key={domain}>
                  <strong>
                    {domain}
                  </strong>
                  : {count}
                </p>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div className="rtafi-domain-header">
          <div>
            <h2>
              Page{' '}
              {currentPage + 1} of{' '}
              {totalPages}
            </h2>

            <p>
              Items{' '}
              {currentPage *
                itemsPerPage +
                1}{' '}
              -{' '}
              {Math.min(
                (currentPage + 1) *
                  itemsPerPage,
                RTAFI_ITEMS.length,
              )}
            </p>
          </div>
        </div>

        <div className="rtafi-question-list">
          {pagedItems.map((item) => {
            const value =
              getResponseValue(
                item.id,
              );

            return (
              <div
                key={item.id}
                className="rtafi-question-card"
              >
                <div className="rtafi-question-top">
                  <span className="rtafi-question-number">
                    Item{' '}
                    {item.itemNumber}
                  </span>

                  <span className="rtafi-question-subscale">
                    {item.subscale}
                  </span>
                </div>

                <p className="rtafi-question-text">
                  {item.prompt}
                </p>

                <div className="rtafi-response-grid">
                  {RTAFI_RESPONSE_OPTIONS.map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        className={
                          value ===
                          option.value
                            ? 'rtafi-response-button active'
                            : 'rtafi-response-button'
                        }
                        onClick={() =>
                          updateResponse(
                            item.id,
                            option.value,
                          )
                        }
                      >
                        <span className="rtafi-response-value">
                          {
                            option.value
                          }
                        </span>

                        <span className="rtafi-response-label">
                          {
                            option.label
                          }
                        </span>
                      </button>
                    ),
                  )}
                </div>

                {answeredItemIds.has(
                  item.id,
                ) && (
                  <p className="rtafi-progress-note">
                    Response Saved
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rtafi-domain-section">
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="rtafi-submit-button"
            disabled={
              currentPage === 0
            }
            onClick={() =>
              setCurrentPage(
                (previous) =>
                  previous - 1,
              )
            }
          >
            Previous Page
          </button>

          {currentPage <
          totalPages - 1 ? (
            <button
              type="button"
              className="rtafi-submit-button"
              onClick={() =>
                setCurrentPage(
                  (previous) =>
                    previous + 1,
                )
              }
            >
              Next Page
            </button>
          ) : (
            <button
              type="button"
              className="rtafi-submit-button"
              onClick={
                submitAssessment
              }
            >
              Generate Full Report
            </button>
          )}
        </div>
      </section>
    </div>
  );
}