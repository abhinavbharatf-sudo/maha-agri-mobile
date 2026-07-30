// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Production Sprint 1: Soil Testing Operations Module Lifecycle Controller
// Endpoints for Farmer Reg, Parcel Mapping, Collection, 12-Param Testing, QC, PDF Card
// ============================================================================

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { SoilLifecycleService } from '../services/soil-lifecycle.service';
import { SoilSampleStatus } from '../services/soil-state-machine.service';

export class RegisterSoilFarmerDto {
  fullName!: string;
  mobileNumber!: string;
  aadhaarHash!: string;
  districtId!: string;
  talukaId!: string;
  villageId!: string;
  agridootUserId?: string;
}

export class CreateLandParcelDto {
  farmerId!: string;
  surveyNumber!: string;
  gatNumber?: string;
  totalAreaAcres!: number;
  districtId!: string;
  talukaId!: string;
  villageId!: string;
  gpsCenterLat?: number;
  gpsCenterLng?: number;
}

export class CollectSoilSampleDto {
  farmerId!: string;
  parcelId!: string;
  agridootUserId!: string;
  collectionDepthCm!: number;
  collectionLat!: number;
  collectionLng!: number;
  priority?: 'NORMAL' | 'URGENT' | 'GOVT_CAMPAIGN' | 'RESEARCH';
}

export class RecordVisitDto {
  sampleId!: string;
  agridootUserId!: string;
  gpsLatitude!: number;
  gpsLongitude!: number;
  collectionStatus!: string;
  remarks?: string;
  photoEvidenceUrl?: string;
}

export class EnterLabTestDto {
  sampleId!: string;
  testedByUserId!: string;
  phValue!: number;
  ecValue!: number;
  ocValue!: number;
  nitrogenValue!: number;
  phosphorusValue!: number;
  potassiumValue!: number;
  sulphurValue!: number;
  zincValue!: number;
  ironValue!: number;
  manganeseValue!: number;
  copperValue!: number;
  boronValue!: number;
}

export class ApproveQcReviewDto {
  sampleId!: string;
  reviewerUserId!: string;
  remarks?: string;
}

export class GenerateHealthCardDto {
  sampleId!: string;
  createdByUserId!: string;
  targetCropName!: string;
}

@Controller('api/v1/soil')
export class SoilLifecycleController {
  constructor(private readonly workflowService: SoilLifecycleService) {}

  @Post('farmers/register')
  @HttpCode(HttpStatus.CREATED)
  async registerFarmer(@Body() body: RegisterSoilFarmerDto) {
    return this.workflowService.registerFarmer(body);
  }

  @Post('parcels')
  @HttpCode(HttpStatus.CREATED)
  async createParcel(@Body() body: CreateLandParcelDto) {
    return this.workflowService.createLandParcel(body);
  }

  @Post('samples/collect')
  @HttpCode(HttpStatus.CREATED)
  async collectSample(@Body() body: CollectSoilSampleDto) {
    return this.workflowService.collectSoilSample(body);
  }

  @Post('collection-visits')
  @HttpCode(HttpStatus.CREATED)
  async recordVisit(@Body() body: RecordVisitDto) {
    return this.workflowService.recordCollectionVisit(body);
  }

  @Post('lab-tests/enter')
  @HttpCode(HttpStatus.OK)
  async enterLabTestResults(@Body() body: EnterLabTestDto) {
    return this.workflowService.enterLabTestResults(body);
  }

  @Post('qc-reviews/approve')
  @HttpCode(HttpStatus.OK)
  async approveQcReview(@Body() body: ApproveQcReviewDto) {
    return this.workflowService.approveQcReview(body.sampleId, body.reviewerUserId, body.remarks);
  }

  @Post('health-cards/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateSoilHealthCard(@Body() body: GenerateHealthCardDto) {
    return this.workflowService.generateSoilHealthCard(body.sampleId, body.createdByUserId, body.targetCropName);
  }

  @Get('samples/:id')
  async getSampleById(@Param('id') id: string) {
    const sample = await this.workflowService.getSampleById(id);
    if (!sample) throw new NotFoundException(`Soil sample ${id} not found`);
    return { success: true, data: sample };
  }
}
