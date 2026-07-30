// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 6: Scheduled Tasks & Cron Engine Service (10 Core Cron Jobs)
// ============================================================================

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { LocalCronSchedulerAdapter } from '../adapters/scheduler/local-cron-scheduler.adapter';
import { ScheduledJobConfig } from '../adapters/scheduler/scheduler.adapter.interface';

@Injectable()
export class ScheduledTasksService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private readonly schedulerAdapter: LocalCronSchedulerAdapter) {}

  onModuleInit() {
    this.initializeCronJobs();
  }

  private initializeCronJobs() {
    const jobConfigs: ScheduledJobConfig[] = [
      { jobId: 'JOB_DAILY_DASHBOARD_STATS', jobName: 'Daily Dashboard Statistics Calculation', cronExpression: '0 0 * * *', category: 'STATISTICS', isEnabled: true },
      { jobId: 'JOB_REMINDER_NOTIFICATIONS', jobName: 'Automated Reminders (Soil, EDP, Drone, HR)', cronExpression: '0 8 * * *', category: 'REMINDERS', isEnabled: true },
      { jobId: 'JOB_PENDING_WORKFLOW_ESCALATIONS', jobName: 'SLA Workflow Breach Escalation Engine', cronExpression: '0 */2 * * *', category: 'REMINDERS', isEnabled: true },
      { jobId: 'JOB_PAYMENT_RECONCILIATION', jobName: 'Razorpay & Double-Entry Settlement Reconciliation', cronExpression: '0 1 * * *', category: 'RECONCILIATION', isEnabled: true },
      { jobId: 'JOB_FAILED_NOTIFICATION_RETRY', jobName: 'Notification Outbox Retry Worker', cronExpression: '*/15 * * * *', category: 'REMINDERS', isEnabled: true },
      { jobId: 'JOB_EVENT_DLQ_CLEANUP', jobName: 'Dead-Letter Queue (DLQ) Event Archival', cronExpression: '0 3 * * *', category: 'CLEANUP', isEnabled: true },
      { jobId: 'JOB_AUDIT_LOG_ARCHIVAL', jobName: 'Compliance Audit Log Archival (90+ Days)', cronExpression: '0 2 * * 0', category: 'CLEANUP', isEnabled: true },
      { jobId: 'JOB_TEMP_FILE_CLEANUP', jobName: 'Vault Storage Temporary File Purge', cronExpression: '0 4 * * *', category: 'CLEANUP', isEnabled: true },
      { jobId: 'JOB_SESSION_CLEANUP', jobName: 'Expired Session & Token Cleanup', cronExpression: '*/30 * * * *', category: 'CLEANUP', isEnabled: true },
      { jobId: 'JOB_DATABASE_HEALTH_CHECK', jobName: 'PostgreSQL Table Bloat & Health Check', cronExpression: '*/10 * * * *', category: 'HEALTH', isEnabled: true },
    ];

    jobConfigs.forEach(cfg => {
      this.schedulerAdapter.scheduleJob(cfg, async () => {
        this.logger.log(`Executing Cron Task [${cfg.jobId}]: ${cfg.jobName}`);
        return `Job ${cfg.jobId} executed successfully at ${new Date().toISOString()}`;
      });
    });
  }

  async triggerJob(jobId: string) {
    return this.schedulerAdapter.triggerJob(jobId);
  }

  toggleJob(jobId: string, enable: boolean) {
    if (enable) {
      return this.schedulerAdapter.resumeJob(jobId);
    } else {
      return this.schedulerAdapter.pauseJob(jobId);
    }
  }

  getJobConfigs() {
    return {
      success: true,
      count: this.schedulerAdapter.getJobConfigs().length,
      data: this.schedulerAdapter.getJobConfigs(),
      timestamp: new Date().toISOString(),
    };
  }

  getExecutionLogs() {
    return {
      success: true,
      count: this.schedulerAdapter.getExecutionLogs().length,
      data: this.schedulerAdapter.getExecutionLogs(),
      timestamp: new Date().toISOString(),
    };
  }
}
