// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase C Scale & Reliability Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { ScaleReliabilityService } from './services/scale-reliability.service';
import { ScaleRolloutService } from './services/scale-rollout.service';
import { ScaleOperationsController } from './controllers/scale-operations.controller';

@Module({
  controllers: [ScaleOperationsController],
  providers: [ScaleReliabilityService, ScaleRolloutService],
  exports: [ScaleReliabilityService, ScaleRolloutService],
})
export class ScaleModule {}
