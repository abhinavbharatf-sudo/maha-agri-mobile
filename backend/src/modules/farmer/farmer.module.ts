// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Shared Farmer Master Module Assembly (v1.0)
// ============================================================================

import { Module } from '@nestjs/common';
import { SharedFarmerStateMachineService } from './services/farmer-state-machine.service';
import { SharedFarmerLifecycleService } from './services/farmer-lifecycle.service';
import { SharedFarmerLifecycleController } from './controllers/farmer-lifecycle.controller';

@Module({
  controllers: [SharedFarmerLifecycleController],
  providers: [SharedFarmerStateMachineService, SharedFarmerLifecycleService],
  exports: [SharedFarmerStateMachineService, SharedFarmerLifecycleService],
})
export class FarmerModule {}
