// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 6: Local Cron Scheduler Adapter Implementation (Concurrency Guard)
// ============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ISchedulerProvider,
  ScheduledJobConfig,
  JobExecutionRecord,
  JobHandler,
} from './scheduler.adapter.interface';

@Injectable()
export class LocalCronSchedulerAdapter implements ISchedulerProvider {
  readonly providerName = 'LOCAL_CRON_SCHEDULER';
  private readonly logger = new Logger(LocalCronSchedulerAdapter.name);

  private jobs = new Map<string, ScheduledJobConfig>();
  private handlers = new Map<string, JobHandler>();
  private runningLock = new Set<string>(); // Concurrency Protection Guard
  private executionLogs: JobExecutionRecord[] = [];

  scheduleJob(config: ScheduledJobConfig, handler: JobHandler): void {
    this.jobs.set(config.jobId, config);
    this.handlers.set(config.jobId, handler);
    this.logger.log(`[${this.providerName}] Registered Job: ${config.jobName} [Cron: ${config.cronExpression}]`);
  }

  async triggerJob(jobId: string): Promise<JobExecutionRecord> {
    const config = this.jobs.get(jobId);
    const handler = this.handlers.get(jobId);

    if (!config || !handler) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    // Concurrency Protection Check
    if (this.runningLock.has(jobId)) {
      this.logger.warn(`[${this.providerName}] Job ${jobId} is already running in parallel. Skipped duplicate execution.`);
      return {
        executionId: `exec-${Date.now()}`,
        jobId,
        jobName: config.jobName,
        startTime: new Date().toISOString(),
        status: 'FAILED',
        errorLog: 'Concurrency Lock: Parallel execution prevented',
      };
    }

    this.runningLock.add(jobId);
    const startTime = Date.now();
    const startTimeIso = new Date(startTime).toISOString();
    const executionId = `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let record: JobExecutionRecord;

    try {
      this.logger.log(`[${this.providerName}] Executing Job ${config.jobName}...`);
      const result = await handler();
      const endTime = Date.now();

      record = {
        executionId,
        jobId,
        jobName: config.jobName,
        startTime: startTimeIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        status: 'SUCCESS',
        resultSummary: (typeof result === 'string' ? result : 'Completed successfully'),
      };
    } catch (error: any) {
      const endTime = Date.now();
      record = {
        executionId,
        jobId,
        jobName: config.jobName,
        startTime: startTimeIso,
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        status: 'FAILED',
        errorLog: error?.message || 'Execution error',
      };
    } finally {
      this.runningLock.delete(jobId);
    }

    this.executionLogs.push(record);
    return record;
  }

  pauseJob(jobId: string): boolean {
    const config = this.jobs.get(jobId);
    if (config) {
      config.isEnabled = false;
      return true;
    }
    return false;
  }

  resumeJob(jobId: string): boolean {
    const config = this.jobs.get(jobId);
    if (config) {
      config.isEnabled = true;
      return true;
    }
    return false;
  }

  getJobConfigs(): ScheduledJobConfig[] {
    return Array.from(this.jobs.values());
  }

  getExecutionLogs(): JobExecutionRecord[] {
    return this.executionLogs;
  }
}
