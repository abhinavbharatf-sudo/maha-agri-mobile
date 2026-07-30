// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 6 - Scheduler & 10 Cron Jobs Tests
// ============================================================================

import { LocalCronSchedulerAdapter } from '../src/modules/integration/adapters/scheduler/local-cron-scheduler.adapter';
import { ScheduledTasksService } from '../src/modules/integration/services/scheduled-tasks.service';

describe('ScheduledTasksService (Scheduler Test)', () => {
  let adapter: LocalCronSchedulerAdapter;
  let service: ScheduledTasksService;

  beforeEach(() => {
    adapter = new LocalCronSchedulerAdapter();
    service = new ScheduledTasksService(adapter);
    service.onModuleInit();
  });

  it('should register 10 scheduled cron jobs', async () => {
    const jobs = service.getJobConfigs();
    expect(jobs.count).toBe(10);
  });

  it('should manually trigger a cron job and record execution log', async () => {
    const res = await service.triggerJob('JOB_DAILY_DASHBOARD_STATS');
    expect(res.status).toBe('SUCCESS');
    expect(res.jobId).toBe('JOB_DAILY_DASHBOARD_STATS');

    const history = service.getExecutionLogs();
    expect(history.count).toBeGreaterThanOrEqual(1);
  });
});
