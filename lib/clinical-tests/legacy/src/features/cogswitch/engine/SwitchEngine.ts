// src/features/cogswitch/engine/SwitchEngine.ts

import type {
  TaskResult,
  TaskRunnerAggregate,
  TaskPerformanceMetrics,
} from './TaskRunner';

export interface TaskTransitionAnalysis {
  fromTaskId?: string;
  toTaskId: string;
  transitionType: 'initial' | 'repeat' | 'switch';
  switchCostMs?: number;
  recoveryLatencyMs?: number;
  interferenceScore?: number;
}

export interface SwitchEngineReport {
  transitions: TaskTransitionAnalysis[];
  aggregate: Pick<
    TaskRunnerAggregate,
    | 'meanSwitchCostMs'
    | 'meanRecoveryLatencyMs'
    | 'meanInterferenceScore'
    | 'fatigueEffectMs'
  >;
}

function mean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function slope(values: number[]): number | undefined {
  if (values.length < 2) return undefined;

  const n = values.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const xMean = mean(xs)!;
  const yMean = mean(values)!;

  const numerator = xs.reduce((sum, x, i) => {
    return sum + (x - xMean) * (values[i] - yMean);
  }, 0);

  const denominator = xs.reduce((sum, x) => {
    return sum + (x - xMean) ** 2;
  }, 0);

  if (denominator === 0) return undefined;
  return numerator / denominator;
}

function computeInterferenceScore(metrics: TaskPerformanceMetrics): number | undefined {
  const rt = metrics.reactionMeanMs ?? 0;
  const accPenalty = 100 - (metrics.accuracyPct ?? 100);
  const omissions = metrics.omissionCount ?? 0;
  const commissions = metrics.commissionCount ?? 0;

  const score = rt * 0.15 + accPenalty * 2 + omissions * 8 + commissions * 10;
  return Number.isFinite(score) ? Math.round(score) : undefined;
}

export class SwitchEngine {
  static analyze(results: TaskResult[]): SwitchEngineReport {
    const transitions: TaskTransitionAnalysis[] = [];

    for (let i = 0; i < results.length; i += 1) {
      const current = results[i];
      const previous = results[i - 1];

      if (!previous) {
        transitions.push({
          fromTaskId: undefined,
          toTaskId: current.taskId,
          transitionType: 'initial',
          switchCostMs: undefined,
          recoveryLatencyMs: undefined,
          interferenceScore: computeInterferenceScore(current.metrics),
        });
        continue;
      }

      const transitionType =
        previous.taskId === current.taskId ? 'repeat' : 'switch';

      const prevRt = previous.metrics.reactionMeanMs;
      const currRt = current.metrics.reactionMeanMs;

      const switchCostMs =
        transitionType === 'switch' &&
        typeof prevRt === 'number' &&
        typeof currRt === 'number'
          ? Math.max(0, currRt - prevRt)
          : 0;

      const recoveryLatencyMs =
        typeof current.metrics.recoveryLatencyMs === 'number'
          ? current.metrics.recoveryLatencyMs
          : switchCostMs;

      const interferenceScore =
        typeof current.metrics.interferenceScore === 'number'
          ? current.metrics.interferenceScore
          : computeInterferenceScore(current.metrics);

      transitions.push({
        fromTaskId: previous.taskId,
        toTaskId: current.taskId,
        transitionType,
        switchCostMs,
        recoveryLatencyMs,
        interferenceScore,
      });
    }

    const switchCosts = transitions
      .map((t) => t.switchCostMs)
      .filter((v): v is number => typeof v === 'number');

    const recoveryLatencies = transitions
      .map((t) => t.recoveryLatencyMs)
      .filter((v): v is number => typeof v === 'number');

    const interferenceScores = transitions
      .map((t) => t.interferenceScore)
      .filter((v): v is number => typeof v === 'number');

    const reactionSeries = results
      .map((r) => r.metrics.reactionMeanMs)
      .filter((v): v is number => typeof v === 'number');

    const fatigueSlope = slope(reactionSeries);

    return {
      transitions,
      aggregate: {
        meanSwitchCostMs: mean(switchCosts),
        meanRecoveryLatencyMs: mean(recoveryLatencies),
        meanInterferenceScore: mean(interferenceScores),
        fatigueEffectMs: fatigueSlope,
      },
    };
  }
}