// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 04: Soil Testing System Controller (/api/v1/soil)
// ============================================================================

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SoilTestingService } from './soil.service';
import { RegisterSoilSampleDto, EnterTestResultsDto } from './dto/soil.dto';

@Controller('api/v1/soil')
export class SoilTestingController {
  constructor(private readonly soilService: SoilTestingService) {}

  @Get('samples')
  async getSamples() {
    return this.soilService.getSamples();
  }

  @Post('samples')
  async registerSample(@Body() dto: RegisterSoilSampleDto) {
    return this.soilService.registerSample(dto);
  }

  @Get('samples/:code')
  async getSampleByCode(@Param('code') code: string) {
    return this.soilService.getSampleByCode(code);
  }

  @Post('samples/:code/results')
  async enterTestResults(@Body() dto: EnterTestResultsDto) {
    return this.soilService.enterTestResults(dto);
  }
}
