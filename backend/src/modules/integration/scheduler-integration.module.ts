// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 6: Scheduler Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { LocalCronSchedulerAdapter } from './adapters/scheduler/local-cron-scheduler.adapter';
import { ScheduledTasksService } from './services/scheduled-tasks.service';
import { SchedulerIntegrationController } from './controllers/scheduler-integration.controller';

@Module({
  controllers: [SchedulerIntegrationController],
  providers: [LocalCronSchedulerAdapter, ScheduledTasksService],
  exports: [ScheduledTasksService, LocalCronSchedulerAdapter],
})
export class SchedulerIntegrationModule {}
