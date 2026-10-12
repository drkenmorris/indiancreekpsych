"use client";
import { useEffect, useMemo, useState } from "react";

import SRRCIProgressBar from "../components/SRRCIProgressBar";
import SRRCIQuestionCard from "../components/SRRCIQuestionCard";

import {
  getRandomizedSRRCIItems,
} from "../data/srrciItems";

import {
  scoreSRRCI,
} from "../engine/srrciScoring";

import {
  getSRRCIProfile,
  getSRRCIResponses,
  saveSRRCIResponses,
  saveSRRCIResult,
} from "../services/srrciStorage";

import type {
  SRRCIResponse,
  SRRCIResponseValue,
} from "../types/srrciTypes";

interface SRRCIAssessmentPageProps {
  onAssessmentComplete: () => void;
}

export default function SRRCIAssessmentPage({
  onAssessmentComplete,
}: SRRCIAssessmentPageProps) {
  const profile = useMemo(
    () => getSRRCIProfile(),
    [],
  );

  const randomizedItems = useMemo(
    () => getRandomizedSRRCIItems(),
    [],
  );

  const [responses, setResponses] = useState<SRRCIResponse[]>(
    [],
  );

  useEffect(() => {
    const existingResponses = getSRRCIResponses();

    if (existingResponses.length > 0) {
      setResponses(existingResponses);
    }
  }, []);

  const answeredCount = responses.length;

  function handleSelect(
    itemId: string,
    value: SRRCIResponseValue,
  ) {
    setResponses((previous) => {
      const filtered = previous.filter(
        (response) => response.itemId !== itemId,
      );

      const updated = [
        ...filtered,
        {
          itemId,
          value,
        },
      ];

      saveSRRCIResponses(updated);

      return updated;
    });
  }

  function getCurrentValue(
    itemId: string,
  ): SRRCIResponseValue | undefined {
    return responses.find(
      (response) => response.itemId === itemId,
    )?.value as SRRCIResponseValue | undefined;
  }

  function handleSubmitAssessment() {
    if (!profile) {
      window.alert(
        "No SRRCI profile found. Please restart the assessment.",
      );

      return;
    }

    if (responses.length < randomizedItems.length) {
      const confirmed = window.confirm(
        `You have completed ${responses.length} out of ${randomizedItems.length} questions. Submit anyway?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const result = scoreSRRCI(
      profile.id,
      responses,
    );

    saveSRRCIResult(result);

    onAssessmentComplete();
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Omniscient Technologies
          </div>

          <h1 className="text-4xl font-bold">
            Sexual Regulation & Relational Compatibility Inventory
          </h1>

          <div className="mt-2 text-lg text-slate-300">
            Research Edition (SRRCI-R)
          </div>

          <p className="mt-5 max-w-4xl text-slate-400">
            Respond to each statement as honestly as possible
            based upon your typical patterns, experiences,
            impulses, emotions, relational tendencies,
            and behaviors.
          </p>
        </div>

        <div className="mb-8">
          <SRRCIProgressBar
            current={answeredCount}
            total={randomizedItems.length}
          />
        </div>

        <div className="space-y-6">
          {randomizedItems.map((item) => (
            <SRRCIQuestionCard
              key={item.id}
              item={item}
              currentValue={getCurrentValue(item.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={handleSubmitAssessment}
            className="rounded-2xl bg-cyan-500 px-10 py-5 text-lg font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            Complete Assessment
          </button>
        </div>
      </div>
    </div>
  );
}