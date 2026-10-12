"use client";
// src/features/cogswitch/engine/TaskRunner.ts

export type CogTaskId =
  | 'reaction'
  | 'gonogo'
  | 'workingMemory'
  | 'ruleSwitching'
  | (string & {});

export type TaskRunnerStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'aborted'
  | 'error';

export type TaskTransitionType = 'initial' | 'repeat' | 'switch';

export interface CogTaskDefinition<TConfig = unknown> {
  id: CogTaskId;
  title: string;
  description?: string;
  version?: string;
  config?: TConfig;
  estimatedDurationSec?: number;
  tags?: string[];
}

export interface TaskPerformanceMetrics {
  reactionMeanMs?: number;
  reactionMedianMs?: number;
  reactionStdDevMs?: number;
  reactionVariabilityMs?: number;

  accuracyPct?: number;
  omissionCount?: number;
  commissionCount?: number;

  correctCount?: number;
  incorrectCount?: number;
  totalTrials?: number;

  switchCostMs?: number;
  recoveryLatencyMs?: number;
  interferenceScore?: number;
  fatigueDeltaMs?: number;

  inhibitoryControlScore?: number;
  workingMemoryScore?: number;
  sequencingScore?: number;

  [key: string]: number | string | boolean | undefined;
}

export interface TaskTimeline {
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface TaskResult<TSummary = unknown, TRaw = unknown> {
  taskId: CogTaskId;
  taskTitle: string;

  status: 'completed' | 'aborted' | 'error';

  timeline: TaskTimeline;

  metrics: TaskPerformanceMetrics;

  summary?: TSummary;
  raw?: TRaw;

  notes?: string[];
  flags?: string[];
}

export interface TaskRuntimeContext {
  sessionId: string;
  taskIndex: number;
  totalTasks: number;
  transitionType: TaskTransitionType;
  previousTaskId?: CogTaskId;
  startedAt: number;
}

export interface TaskRuntimeItem {
  definition: CogTaskDefinition;
  timeline: TaskTimeline;
  transitionType: TaskTransitionType;
}

export interface TaskRunnerSnapshot {
  sessionId: string;
  status: TaskRunnerStatus;

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  abortedAt?: number;

  currentTaskIndex: number;
  currentTask?: TaskRuntimeItem;
  previousTask?: TaskRuntimeItem;

  totalTasks: number;
  completedTasks: number;
  progressPct: number;

  queue: TaskRuntimeItem[];
  results: TaskResult[];

  aggregate: TaskRunnerAggregate;
  error?: string;
}

export interface TaskRunnerAggregate {
  taskCount: number;
  completedCount: number;

  meanReactionMs?: number;
  meanAccuracyPct?: number;

  totalOmissions: number;
  totalCommissions: number;

  meanSwitchCostMs?: number;
  meanRecoveryLatencyMs?: number;
  meanInterferenceScore?: number;
  fatigueEffectMs?: number;

  domainScores: {
    reactionSpeed?: number;
    inhibitoryControl?: number;
    workingMemory?: number;
    taskSwitching?: number;
    motorSequencing?: number;
  };
}

type TaskRunnerListener = (snapshot: TaskRunnerSnapshot) => void;

export interface TaskRunnerOptions {
  autoAdvance?: boolean;
  transitionDelayMs?: number;
  onCompleteAll?: (snapshot: TaskRunnerSnapshot) => void;
  onTaskStart?: (task: TaskRuntimeItem, snapshot: TaskRunnerSnapshot) => void;
  onTaskComplete?: (result: TaskResult, snapshot: TaskRunnerSnapshot) => void;
  onAbort?: (snapshot: TaskRunnerSnapshot) => void;
  onError?: (error: Error, snapshot: TaskRunnerSnapshot) => void;
}

function safeNow(): number {
  return performance.now();
}

function mean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function generateSessionId(): string {
  return `cogswitch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function scaleInverseMs(ms?: number, best = 220, worst = 900): number | undefined {
  if (ms == null || Number.isNaN(ms)) return undefined;
  const score = 100 - ((ms - best) / (worst - best)) * 100;
  return clamp(Math.round(score), 0, 100);
}

function scalePct(pct?: number): number | undefined {
  if (pct == null || Number.isNaN(pct)) return undefined;
  return clamp(Math.round(pct), 0, 100);
}

export class TaskRunner {
  private readonly options: Required<
    Pick<TaskRunnerOptions, 'autoAdvance' | 'transitionDelayMs'>
  > &
    Omit<TaskRunnerOptions, 'autoAdvance' | 'transitionDelayMs'>;

  private listeners = new Set<TaskRunnerListener>();

  private sessionId = generateSessionId();
  private status: TaskRunnerStatus = 'idle';

  private createdAt = Date.now();
  private startedAt?: number;
  private completedAt?: number;
  private abortedAt?: number;

  private queue: TaskRuntimeItem[] = [];
  private results: TaskResult[] = [];
  private currentTaskIndex = -1;
  private error?: string;

  constructor(tasks: CogTaskDefinition[] = [], options: TaskRunnerOptions = {}) {
    this.options = {
      autoAdvance: options.autoAdvance ?? false,
      transitionDelayMs: options.transitionDelayMs ?? 250,
      onCompleteAll: options.onCompleteAll,
      onTaskStart: options.onTaskStart,
      onTaskComplete: options.onTaskComplete,
      onAbort: options.onAbort,
      onError: options.onError,
    };

    if (tasks.length) {
      this.loadTasks(tasks);
    } else {
      this.status = 'idle';
    }
  }

  subscribe(listener: TaskRunnerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  loadTasks(tasks: CogTaskDefinition[]): void {
    this.resetInternal();

    this.queue = tasks.map((task, index) => {
      const previous = tasks[index - 1];
      const transitionType: TaskTransitionType =
        index === 0 ? 'initial' : previous?.id === task.id ? 'repeat' : 'switch';

      return {
        definition: task,
        timeline: {
          queuedAt: safeNow(),
        },
        transitionType,
      };
    });

    this.status = this.queue.length ? 'ready' : 'idle';
    this.emit();
  }

  start(): void {
    if (!this.queue.length) {
      this.fail(new Error('Cannot start TaskRunner without tasks.'));
      return;
    }

    if (this.status === 'running') return;
    if (this.status === 'completed') return;
    if (this.status === 'aborted') return;

    if (!this.startedAt) {
      this.startedAt = Date.now();
    }

    this.status = 'running';

    if (this.currentTaskIndex < 0) {
      this.currentTaskIndex = 0;
    }

    const current = this.queue[this.currentTaskIndex];
    if (current && !current.timeline.startedAt) {
      current.timeline.startedAt = safeNow();
      this.options.onTaskStart?.(current, this.getSnapshot());
    }

    this.emit();
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.emit();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.emit();
  }

  abort(reason?: string): void {
    this.status = 'aborted';
    this.abortedAt = Date.now();
    if (reason) this.error = reason;
    this.emit();
    this.options.onAbort?.(this.getSnapshot());
  }

  restart(): void {
    const defs = this.queue.map((item) => item.definition);
    this.loadTasks(defs);
    this.start();
  }

  getCurrentTask(): TaskRuntimeItem | undefined {
    if (this.currentTaskIndex < 0) return undefined;
    return this.queue[this.currentTaskIndex];
  }

  getRuntimeContext(): TaskRuntimeContext | undefined {
    const current = this.getCurrentTask();
    if (!current) return undefined;

    return {
      sessionId: this.sessionId,
      taskIndex: this.currentTaskIndex,
      totalTasks: this.queue.length,
      transitionType: current.transitionType,
      previousTaskId: this.currentTaskIndex > 0
        ? this.queue[this.currentTaskIndex - 1]?.definition.id
        : undefined,
      startedAt: current.timeline.startedAt ?? safeNow(),
    };
  }

  completeCurrentTask<TSummary = unknown, TRaw = unknown>(
    payload: Omit<TaskResult<TSummary, TRaw>, 'timeline'> & {
      timeline?: Partial<TaskTimeline>;
    }
  ): void {
    if (this.status !== 'running' && this.status !== 'paused') {
      this.fail(new Error('Cannot complete task while runner is not active.'));
      return;
    }

    const current = this.getCurrentTask();
    if (!current) {
      this.fail(new Error('No active task to complete.'));
      return;
    }

    const completedAt = safeNow();
    const startedAt = current.timeline.startedAt ?? completedAt;
    const durationMs = completedAt - startedAt;

    current.timeline.completedAt = completedAt;
    current.timeline.durationMs = durationMs;

    const result: TaskResult<TSummary, TRaw> = {
      ...payload,
      taskId: current.definition.id,
      taskTitle: current.definition.title,
      timeline: {
        queuedAt: current.timeline.queuedAt,
        startedAt,
        completedAt,
        durationMs,
        ...payload.timeline,
      },
    };

    this.results.push(result);
    this.options.onTaskComplete?.(result, this.getSnapshot());

    const isLastTask = this.currentTaskIndex >= this.queue.length - 1;

    if (isLastTask) {
      this.status = 'completed';
      this.completedAt = Date.now();
      this.emit();
      this.options.onCompleteAll?.(this.getSnapshot());
      return;
    }

    this.currentTaskIndex += 1;

    const nextTask = this.getCurrentTask();
    if (nextTask) {
      nextTask.timeline.startedAt = safeNow() + this.options.transitionDelayMs;
    }

    if (this.options.autoAdvance) {
      if (nextTask) {
        nextTask.timeline.startedAt = safeNow();
        this.options.onTaskStart?.(nextTask, this.getSnapshot());
      }
      this.status = 'running';
    } else {
      this.status = 'ready';
    }

    this.emit();
  }

  markCurrentTaskStarted(): void {
    const current = this.getCurrentTask();
    if (!current) return;

    if (!current.timeline.startedAt) {
      current.timeline.startedAt = safeNow();
      this.options.onTaskStart?.(current, this.getSnapshot());
      this.emit();
    }
  }

  setError(message: string): void {
    this.error = message;
    this.status = 'error';
    this.emit();
  }

  getSnapshot(): TaskRunnerSnapshot {
    const aggregate = this.buildAggregate();

    return {
      sessionId: this.sessionId,
      status: this.status,

      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      abortedAt: this.abortedAt,

      currentTaskIndex: this.currentTaskIndex,
      currentTask: this.getCurrentTask(),
      previousTask:
        this.currentTaskIndex > 0 ? this.queue[this.currentTaskIndex - 1] : undefined,

      totalTasks: this.queue.length,
      completedTasks: this.results.length,
      progressPct: this.queue.length
        ? Math.round((this.results.length / this.queue.length) * 100)
        : 0,

      queue: this.queue,
      results: this.results,
      aggregate,
      error: this.error,
    };
  }

  private buildAggregate(): TaskRunnerAggregate {
    const reactionMeans = this.results
      .map((r) => r.metrics.reactionMeanMs)
      .filter((v): v is number => typeof v === 'number');

    const accuracies = this.results
      .map((r) => r.metrics.accuracyPct)
      .filter((v): v is number => typeof v === 'number');

    const omissions = this.results.reduce(
      (sum, r) => sum + (r.metrics.omissionCount ?? 0),
      0
    );

    const commissions = this.results.reduce(
      (sum, r) => sum + (r.metrics.commissionCount ?? 0),
      0
    );

    const switchCosts = this.results
      .map((r) => r.metrics.switchCostMs)
      .filter((v): v is number => typeof v === 'number');

    const recoveryLatencies = this.results
      .map((r) => r.metrics.recoveryLatencyMs)
      .filter((v): v is number => typeof v === 'number');

    const interferenceScores = this.results
      .map((r) => r.metrics.interferenceScore)
      .filter((v): v is number => typeof v === 'number');

    const fatigueEffects = this.results
      .map((r) => r.metrics.fatigueDeltaMs)
      .filter((v): v is number => typeof v === 'number');

    const meanReactionMs = mean(reactionMeans);
    const meanAccuracyPct = mean(accuracies);

    const inhibitory = mean(
      this.results
        .map((r) => r.metrics.inhibitoryControlScore)
        .filter((v): v is number => typeof v === 'number')
    );

    const wm = mean(
      this.results
        .map((r) => r.metrics.workingMemoryScore)
        .filter((v): v is number => typeof v === 'number')
    );

    const seq = mean(
      this.results
        .map((r) => r.metrics.sequencingScore)
        .filter((v): v is number => typeof v === 'number')
    );

    return {
      taskCount: this.queue.length,
      completedCount: this.results.length,

      meanReactionMs,
      meanAccuracyPct,

      totalOmissions: omissions,
      totalCommissions: commissions,

      meanSwitchCostMs: mean(switchCosts),
      meanRecoveryLatencyMs: mean(recoveryLatencies),
      meanInterferenceScore: mean(interferenceScores),
      fatigueEffectMs: mean(fatigueEffects),

      domainScores: {
        reactionSpeed: scaleInverseMs(meanReactionMs),
        inhibitoryControl: inhibitory ?? scalePct(meanAccuracyPct),
        workingMemory: wm,
        taskSwitching: scaleInverseMs(mean(switchCosts), 40, 450),
        motorSequencing: seq,
      },
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private fail(error: Error): void {
    this.error = error.message;
    this.status = 'error';
    this.emit();
    this.options.onError?.(error, this.getSnapshot());
  }

  private resetInternal(): void {
    this.sessionId = generateSessionId();
    this.status = 'idle';

    this.createdAt = Date.now();
    this.startedAt = undefined;
    this.completedAt = undefined;
    this.abortedAt = undefined;

    this.queue = [];
    this.results = [];
    this.currentTaskIndex = -1;
    this.error = undefined;
  }
}