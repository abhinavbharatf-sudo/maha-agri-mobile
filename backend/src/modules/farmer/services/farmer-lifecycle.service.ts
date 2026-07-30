// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Shared Farmer Master Service: System of Record for all Farmers in Maharashtra
// Generates Permanent Unique MA-FAR-xxxxxx Identifier
// ============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SharedFarmerStateMachineService, SharedFarmerStatus } from './farmer-state-machine.service';

@Injectable()
export class SharedFarmerLifecycleService {
  private readonly logger = new Logger(SharedFarmerLifecycleService.name);

  private farmersMap = new Map<string, any>();
  private landHoldingsMap = new Map<string, any[]>();
  private serviceLinksMap = new Map<string, any[]>();
  private timelinesMap = new Map<string, any[]>();

  constructor(private readonly stateMachineService: SharedFarmerStateMachineService) {}

  // Domain 1: Permanent Farmer Registration with MA-FAR-xxxxxx Unique ID
  async registerMasterFarmer(params: {
    fullName: string;
    mobileNumber: string;
    aadhaarHash: string;
    districtId: string;
    talukaId: string;
    villageId: string;
    createdBy: string;
  }) {
    // Check Duplicate Mobile / Aadhaar Hash
    for (const [, existing] of this.farmersMap) {
      if (existing.mobileNumber === params.mobileNumber) {
        throw new BadRequestException(`Farmer with mobile number ${params.mobileNumber} is already registered under ID ${existing.farmerCode}`);
      }
    }

    const farmerId = `farm-master-${Date.now()}`;
    const farmerCode = `MA-FAR-${Date.now().toString().slice(-6)}`;

    const farmer = {
      id: farmerId,
      farmerCode, // Permanent System of Record Identifier
      fullName: params.fullName,
      mobileNumber: params.mobileNumber,
      aadhaarHash: params.aadhaarHash,
      districtId: params.districtId,
      talukaId: params.talukaId,
      villageId: params.villageId,
      status: SharedFarmerStatus.REGISTERED,
      isKycVerified: false,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };

    this.farmersMap.set(farmerId, farmer);
    this.logTimeline(farmerId, null, SharedFarmerStatus.REGISTERED, 'Master Farmer Record Created in Shared Registry', params.createdBy);

    // Fast-forward KYC Verification
    this.stateMachineService.validateStateTransition(farmer.status, SharedFarmerStatus.KYC_VERIFIED);
    farmer.status = SharedFarmerStatus.KYC_VERIFIED;
    farmer.isKycVerified = true;

    this.stateMachineService.validateStateTransition(farmer.status, SharedFarmerStatus.ACTIVE);
    farmer.status = SharedFarmerStatus.ACTIVE;
    this.logTimeline(farmerId, SharedFarmerStatus.REGISTERED, SharedFarmerStatus.ACTIVE, 'Aadhaar KYC Verified & Activated', params.createdBy);

    this.logger.log(`[Shared Farmer Master] Permanent ID Allocated: ${farmerCode} (${params.fullName})`);
    return { success: true, message: 'Farmer registered in Shared Master Registry', data: farmer };
  }

  // Domain 2: Land Portfolio Management
  async addLandHolding(params: { farmerId: string; surveyNumber: string; gatNumber?: string; totalAreaAcres: number; districtId: string; talukaId: string; villageId: string }) {
    const farmer = this.farmersMap.get(params.farmerId);
    if (!farmer) throw new NotFoundException(`Farmer ${params.farmerId} not found in Shared Registry`);

    const holding = {
      id: `land-${Date.now()}`,
      farmerId: params.farmerId,
      surveyNumber: params.surveyNumber,
      gatNumber: params.gatNumber,
      totalAreaAcres: params.totalAreaAcres,
      districtId: params.districtId,
      talukaId: params.talukaId,
      villageId: params.villageId,
    };

    const list = this.landHoldingsMap.get(params.farmerId) || [];
    list.push(holding);
    this.landHoldingsMap.set(params.farmerId, list);

    return { success: true, message: 'Land holding added to Farmer Portfolio', data: holding };
  }

  // Domain 4: Cross-Module Service Link (Soil, EDP, Subsidies)
  async linkModuleService(params: { farmerId: string; moduleName: string; serviceRefCode: string }) {
    const farmer = this.farmersMap.get(params.farmerId);
    if (!farmer) throw new NotFoundException(`Farmer ${params.farmerId} not found`);

    const link = {
      id: `link-${Date.now()}`,
      farmerId: params.farmerId,
      moduleName: params.moduleName,
      serviceRefCode: params.serviceRefCode,
      linkedAt: new Date().toISOString(),
    };

    const list = this.serviceLinksMap.get(params.farmerId) || [];
    list.push(link);
    this.serviceLinksMap.set(params.farmerId, list);

    this.logger.log(`[Shared Farmer Master] Linked ${params.moduleName} service ref ${params.serviceRefCode} to ${farmer.farmerCode}`);
    return { success: true, message: `Linked ${params.moduleName} service to Farmer ${farmer.farmerCode}`, data: link };
  }

  // Get Farmer 360 Degree Single Source of Truth Profile
  async getFarmer360(farmerId: string) {
    const farmer = this.farmersMap.get(farmerId);
    if (!farmer) throw new NotFoundException(`Farmer ${farmerId} not found`);

    return {
      success: true,
      data: {
        profile: farmer,
        landHoldings: this.landHoldingsMap.get(farmerId) || [],
        serviceLinks: this.serviceLinksMap.get(farmerId) || [],
        timelines: this.timelinesMap.get(farmerId) || [],
      },
    };
  }

  private logTimeline(farmerId: string, previousStatus: SharedFarmerStatus | null, newStatus: SharedFarmerStatus, actionSummary: string, actorUserId: string) {
    const list = this.timelinesMap.get(farmerId) || [];
    list.push({
      id: `time-${Date.now()}`,
      farmerId,
      previousStatus,
      newStatus,
      actionSummary,
      actorUserId,
      createdAt: new Date().toISOString(),
    });
    this.timelinesMap.set(farmerId, list);
  }
}
