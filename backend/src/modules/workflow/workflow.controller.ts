// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 10: Workflow & SLA Engine Controller (/api/v1/workflow)
// ============================================================================

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Controller('api/v1/workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('definitions')
  async getDefinitions() {
    return this.workflowService.getDefinitions();
  }

  @Get('tasks')
  async getTasks() {
    return this.workflowService.getTasks();
  }

  @Post('tasks/:id/complete')
  async completeTask(@Param('id') id: string, @Body() body: { remarks?: string }) {
    return this.workflowService.completeTask(id, body?.remarks);
  }
}
