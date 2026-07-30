// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 03: Farmer Management Service Implementation
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { RegisterFarmerDto, AddLandParcelDto } from './dto/farmer.dto';

@Injectable()
export class FarmerService {
  private farmers = new Map<string, any>([
    [
      'f-001',
      {
        id: 'f-001',
        farmerCode: 'MH-FAR-2026-00001',
        firstNameEn: 'Ramesh',
        lastNameEn: 'Patil',
        fullNameEn: 'Ramesh Patil',
        fullNameMr: 'रमेश पाटील',
        mobileNumber: '9822012345',
        gender: 'MALE',
        category: 'GENERAL',
        farmerType: 'SMALL',
        districtId: 'dist-0001',
        districtName: 'Wardha',
        talukaId: 'tal-0001',
        talukaName: 'Wardha',
        villageName: 'Seloo',
        status: 'ACTIVE',
        landParcelsCount: 2,
        totalLandAcres: 4.5,
        recordVersion: 1,
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  async getFarmers() {
    return {
      success: true,
      data: Array.from(this.farmers.values()),
      timestamp: new Date().toISOString(),
    };
  }

  async getFarmerById(id: string) {
    const farmer = this.farmers.get(id);
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }
    return { success: true, data: farmer, timestamp: new Date().toISOString() };
  }

  async getFarmer360(id: string) {
    const farmer = this.farmers.get(id);
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    return {
      success: true,
      data: {
        profile: farmer,
        landParcels: [
          { id: 'lp-01', surveyGatNumber: '142/1', areaAcres: 2.5, soilType: 'Black Cotton' },
          { id: 'lp-02', surveyGatNumber: '142/2', areaAcres: 2.0, soilType: 'Red Loam' },
        ],
        soilTestingHistory: [
          { sampleCode: 'MH-SOIL-2026-000155', testDate: '2026-07-20', overallStatus: 'APPROVED', healthScore: 82.5 },
        ],
        serviceSubscriptions: [
          { serviceName: 'Soil Health Testing', status: 'ACTIVE' },
          { serviceName: 'Drone Spray Advisory', status: 'ACTIVE' },
        ],
      },
      timestamp: new Date().toISOString(),
    };
  }

  async registerFarmer(dto: RegisterFarmerDto) {
    const id = `f-${Date.now()}`;
    const newFarmer = {
      id,
      farmerCode: `MH-FAR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      firstNameEn: dto.firstNameEn,
      lastNameEn: dto.lastNameEn,
      fullNameEn: `${dto.firstNameEn} ${dto.lastNameEn}`,
      fullNameMr: dto.firstNameMr ? `${dto.firstNameMr} ${dto.lastNameMr || ''}` : null,
      mobileNumber: dto.mobileNumber,
      gender: dto.gender,
      category: dto.category || 'GENERAL',
      farmerType: 'SMALL',
      districtId: dto.districtId,
      talukaId: dto.talukaId,
      status: 'ACTIVE',
      landParcelsCount: 0,
      totalLandAcres: 0,
      recordVersion: 1,
      createdAt: new Date().toISOString(),
    };

    this.farmers.set(id, newFarmer);
    return { success: true, message: 'Farmer registered successfully', data: newFarmer, timestamp: new Date().toISOString() };
  }
}
