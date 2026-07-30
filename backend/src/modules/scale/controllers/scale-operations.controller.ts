// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase C Scale & Reliability Controller (/api/v1/scale)
// REST Endpoints for Statewide Multi-Tenant Operations & Reliability
// ============================================================================

import { Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ScaleReliabilityService } from '../services/scale-reliability.service';
import { ScaleRolloutService } from '../services/scale-rollout.service';

@Controller('api/v1/scale')
export class ScaleOperationsController {
  constructor(
    private readonly reliabilityService: ScaleReliabilityService,
    private readonly rolloutService: ScaleRolloutService,
  ) {}

  @Get('health-checks')
  async getServiceHealthChecks() {
    return this.reliabilityService.getServiceHealthChecks();
  }

  @Post('dr-simulations/run')
  @HttpCode(HttpStatus.OK)
  async runDisasterRecoverySimulation() {
    return this.reliabilityService.runDisasterRecoverySimulation();
  }

  @Get('rollout-waves')
  async getRolloutWaves() {
    return this.rolloutService.getRolloutWaves();
  }

  @Get('predictive-analytics')
  async getPredictiveAnalytics() {
    return this.rolloutService.getPredictiveAnalytics();
  }
}
