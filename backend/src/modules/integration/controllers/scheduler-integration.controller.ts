// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 6: Scheduler Controller (/api/v1/integration/scheduler)
// ============================================================================

import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ScheduledTasksService } from '../services/scheduled-tasks.service';

export class ToggleJobDto {
  enable!: boolean;
}

@Controller('api/v1/integration/scheduler')
export class SchedulerIntegrationController {
  constructor(private readonly tasksService: ScheduledTasksService) {}

  @Get('jobs')
  async getJobConfigs() {
    return this.tasksService.getJobConfigs();
  }

  @Post('jobs/:id/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerJob(@Param('id') id: string) {
    return this.tasksService.triggerJob(id);
  }

  @Post('jobs/:id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleJob(@Param('id') id: string, @Body() body: ToggleJobDto) {
    const success = this.tasksService.toggleJob(id, body.enable);
    return { success, message: `Job ${id} ${body.enable ? 'resumed' : 'paused'} successfully` };
  }

  @Get('history')
  async getExecutionLogs() {
    return this.tasksService.getExecutionLogs();
  }
}
