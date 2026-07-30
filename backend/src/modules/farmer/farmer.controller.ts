// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 03: Farmer Management Controller (/api/v1/farmers)
// ============================================================================

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { RegisterFarmerDto } from './dto/farmer.dto';

@Controller('api/v1/farmers')
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Get()
  async getFarmers() {
    return this.farmerService.getFarmers();
  }

  @Post()
  async registerFarmer(@Body() dto: RegisterFarmerDto) {
    return this.farmerService.registerFarmer(dto);
  }

  @Get(':id')
  async getFarmerById(@Param('id') id: string) {
    return this.farmerService.getFarmerById(id);
  }

  @Get(':id/360')
  async getFarmer360(@Param('id') id: string) {
    return this.farmerService.getFarmer360(id);
  }
}
