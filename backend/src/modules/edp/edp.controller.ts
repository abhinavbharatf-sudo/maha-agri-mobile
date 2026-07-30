// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 08: EDP Management Controller (/api/v1/edp)
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import { EdpService } from './edp.service';

@Controller('api/v1/edp')
export class EdpController {
  constructor(private readonly edpService: EdpService) {}

  @Get('courses')
  async getCourses() {
    return this.edpService.getCourses();
  }

  @Get('batches')
  async getBatches() {
    return this.edpService.getBatches();
  }
}
