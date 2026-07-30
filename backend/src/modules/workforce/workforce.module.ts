// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// MAHA-AGRIDOOT Workforce Module Assembly (v1.0)
// ============================================================================

import { Module } from '@nestjs/common';
import { WorkforceStateMachineService } from './services/workforce-state-machine.service';
import { WorkforceLifecycleService } from './services/workforce-lifecycle.service';
import { WorkforceLifecycleController } from './controllers/workforce-lifecycle.controller';

@Module({
  controllers: [WorkforceLifecycleController],
  providers: [WorkforceStateMachineService, WorkforceLifecycleService],
  exports: [WorkforceStateMachineService, WorkforceLifecycleService],
})
export class WorkforceModule {}
