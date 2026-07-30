// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 07: Drone Services Controller (/api/v1/drones)
// ============================================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { DroneService } from './drone.service';

@Controller('api/v1/drones')
export class DroneController {
  constructor(private readonly droneService: DroneService) {}

  @Get('fleet')
  async getFleet() {
    return this.droneService.getFleet();
  }

  @Get('missions')
  async getMissions() {
    return this.droneService.getMissions();
  }

  @Post('missions')
  async bookMission(@Body() body: any) {
    return this.droneService.bookMission(body);
  }
}
