// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 05: Laboratory Management Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';

@Module({
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}
