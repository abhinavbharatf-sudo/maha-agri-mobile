// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 10: Workflow Engine Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
