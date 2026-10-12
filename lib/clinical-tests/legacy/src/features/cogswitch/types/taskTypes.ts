export type TaskDomain =
  | "REACTION_SPEED"
  | "INHIBITORY_CONTROL"
  | "ATTENTION_CONTROL"
  | "WORKING_MEMORY"
  | "COGNITIVE_FLEXIBILITY"
  | "VISUAL_SEARCH"
  | "MOTOR_SEQUENCING"
  | "DUAL_TASK";

export type TaskPhase = "IDLE" | "READY" | "WAITING" | "TARGET_VISIBLE" | "COMPLETE";

export interface TaskResult {
  taskId: string;
  domain: TaskDomain;
  accuracy: number;
  meanReactionTime: number;
  reactionTimes: number[];
  variability: number;
  totalTrials: number;
  correctResponses: number;
  incorrectResponses: number;
  omittedResponses: number;
}

export interface ReactionTaskConfig {
  taskId: string;
  domain: "REACTION_SPEED";
  totalTrials: number;
  minDelayMs: number;
  maxDelayMs: number;
  responseWindowMs: number;
}

export interface ReactionTrialRecord {
  trialNumber: number;
  targetShownAt: number | null;
  respondedAt: number | null;
  reactionTime: number | null;
  wasCorrect: boolean;
  wasOmission: boolean;
}