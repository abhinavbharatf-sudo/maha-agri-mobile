// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 05: Laboratory Management Controller (/api/v1/labs)
// ============================================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';

@Controller('api/v1/labs')
export class LaboratoryController {
  constructor(private readonly labService: LaboratoryService) {}

  @Get()
  async getLaboratories() {
    return this.labService.getLaboratories();
  }

  @Get('batches')
  async getTestBatches() {
    return this.labService.getTestBatches();
  }

  @Post('approvals')
  async approveReport(@Body() body: { sampleCode: string; approverId: string; remarks?: string }) {
    return this.labService.approveReport(body);
  }
}
