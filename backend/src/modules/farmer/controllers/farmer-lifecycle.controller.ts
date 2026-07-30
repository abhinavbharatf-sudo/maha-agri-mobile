// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Shared Farmer Master Controller (/api/v1/farmers)
// System of Record REST Endpoints
// ============================================================================

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SharedFarmerLifecycleService } from '../services/farmer-lifecycle.service';

export class RegisterMasterFarmerDto {
  fullName!: string;
  mobileNumber!: string;
  aadhaarHash!: string;
  districtId!: string;
  talukaId!: string;
  villageId!: string;
  createdBy!: string;
}

export class AddLandHoldingDto {
  surveyNumber!: string;
  gatNumber?: string;
  totalAreaAcres!: number;
  districtId!: string;
  talukaId!: string;
  villageId!: string;
}

export class LinkModuleServiceDto {
  moduleName!: string;
  serviceRefCode!: string;
}

@Controller('api/v1/farmers')
export class SharedFarmerLifecycleController {
  constructor(private readonly farmerService: SharedFarmerLifecycleService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerMasterFarmer(@Body() body: RegisterMasterFarmerDto) {
    return this.farmerService.registerMasterFarmer(body);
  }

  @Post(':id/land-holdings')
  @HttpCode(HttpStatus.CREATED)
  async addLandHolding(@Param('id') farmerId: string, @Body() body: AddLandHoldingDto) {
    return this.farmerService.addLandHolding({ farmerId, ...body });
  }

  @Post(':id/service-links')
  @HttpCode(HttpStatus.CREATED)
  async linkModuleService(@Param('id') farmerId: string, @Body() body: LinkModuleServiceDto) {
    return this.farmerService.linkModuleService({ farmerId, ...body });
  }

  @Get(':id/360')
  async getFarmer360(@Param('id') farmerId: string) {
    return this.farmerService.getFarmer360(farmerId);
  }
}
