// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 6: Scheduler Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export interface ScheduledJobConfig {
  jobId: string;
  jobName: string;
  cronExpression: string; // e.g., '0 0 * * *'
  category: 'STATISTICS' | 'REMINDERS' | 'RECONCILIATION' | 'CLEANUP' | 'HEALTH';
  isEnabled: boolean;
}

export interface JobExecutionRecord {
  executionId: string;
  jobId: string;
  jobName: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  resultSummary?: string;
  errorLog?: string;
}

export type JobHandler = () => Promise<string | void>;

export interface ISchedulerProvider {
  readonly providerName: string;

  scheduleJob(config: ScheduledJobConfig, handler: JobHandler): void;
  triggerJob(jobId: string): Promise<JobExecutionRecord>;
  pauseJob(jobId: string): boolean;
  resumeJob(jobId: string): boolean;
  getJobConfigs(): ScheduledJobConfig[];
}
