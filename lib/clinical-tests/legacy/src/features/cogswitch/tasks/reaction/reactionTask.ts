import {
  type ReactionTaskConfig,
  type ReactionTrialRecord,
  type TaskResult,
} from "../../types/taskTypes";

export const DEFAULT_REACTION_TASK_CONFIG: ReactionTaskConfig = {
  taskId: "reaction-speed-v1",
  domain: "REACTION_SPEED",
  totalTrials: 8,
  minDelayMs: 1000,
  maxDelayMs: 2500,
  responseWindowMs: 1500,
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function buildEmptyReactionTrial(trialNumber: number): ReactionTrialRecord {
  return {
    trialNumber,
    targetShownAt: null,
    respondedAt: null,
    reactionTime: null,
    wasCorrect: false,
    wasOmission: false,
  };
}

export function finalizeReactionTaskResult(
  config: ReactionTaskConfig,
  trials: ReactionTrialRecord[]
): TaskResult {
  const reactionTimes = trials
    .map((trial) => trial.reactionTime)
    .filter((value): value is number => typeof value === "number" && value >= 0);

  const correctResponses = trials.filter((trial) => trial.wasCorrect).length;
  const omittedResponses = trials.filter((trial) => trial.wasOmission).length;
  const incorrectResponses = trials.length - correctResponses - omittedResponses;

  const accuracy = trials.length > 0 ? correctResponses / trials.length : 0;

  return {
    taskId: config.taskId,
    domain: config.domain,
    accuracy,
    meanReactionTime: average(reactionTimes),
    reactionTimes,
    variability: standardDeviation(reactionTimes),
    totalTrials: trials.length,
    correctResponses,
    incorrectResponses,
    omittedResponses,
  };
}

export function getRandomDelay(minDelayMs: number, maxDelayMs: number): number {
  const min = Math.min(minDelayMs, maxDelayMs);
  const max = Math.max(minDelayMs, maxDelayMs);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}