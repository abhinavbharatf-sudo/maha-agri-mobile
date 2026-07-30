// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 07: Drone Services Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { DroneController } from './drone.controller';
import { DroneService } from './drone.service';

@Module({
  controllers: [DroneController],
  providers: [DroneService],
  exports: [DroneService],
})
export class DroneModule {}
