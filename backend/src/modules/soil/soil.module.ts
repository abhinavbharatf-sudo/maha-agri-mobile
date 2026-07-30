// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Soil Testing Module Assembly (v1.0.2)
// ============================================================================

import { Module } from '@nestjs/common';
import { SoilStateMachineService } from './services/soil-state-machine.service';
import { SoilLifecycleService } from './services/soil-lifecycle.service';
import { SoilLifecycleController } from './controllers/soil-lifecycle.controller';
import { SoilOperationsController } from './controllers/soil-operations.controller';

@Module({
  controllers: [SoilLifecycleController, SoilOperationsController],
  providers: [SoilStateMachineService, SoilLifecycleService],
  exports: [SoilStateMachineService, SoilLifecycleService],
})
export class SoilModule {}
