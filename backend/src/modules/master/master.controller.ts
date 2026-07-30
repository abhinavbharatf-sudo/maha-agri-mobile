// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 02: Master Data Hub Controller (/api/v1/master)
// ============================================================================

import { Controller, Get, Query } from '@nestjs/common';
import { MasterDataService } from './master.service';

@Controller('api/v1/master')
export class MasterDataController {
  constructor(private readonly masterService: MasterDataService) {}

  @Get('divisions')
  async getDivisions() {
    return this.masterService.getDivisions();
  }

  @Get('districts')
  async getDistricts(@Query('divisionId') divisionId?: string) {
    return this.masterService.getDistricts(divisionId);
  }

  @Get('talukas')
  async getTalukas(@Query('districtId') districtId?: string) {
    return this.masterService.getTalukas(districtId);
  }

  @Get('crops')
  async getCrops() {
    return this.masterService.getCrops();
  }
}
