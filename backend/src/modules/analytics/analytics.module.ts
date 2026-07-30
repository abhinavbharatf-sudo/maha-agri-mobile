// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 14: Analytics & Executive MIS Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { OperationalAnalyticsService } from './analytics.service';
import { ExecutiveMisController } from './controllers/executive-mis.controller';
import { ExecutiveMisService } from './services/executive-mis.service';

@Module({
  controllers: [AnalyticsController, ExecutiveMisController],
  providers: [OperationalAnalyticsService, ExecutiveMisService],
  exports: [OperationalAnalyticsService, ExecutiveMisService],
})
export class AnalyticsModule {}
