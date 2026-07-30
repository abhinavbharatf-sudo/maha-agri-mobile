// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 04: Soil Testing System Service Implementation
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { RegisterSoilSampleDto, EnterTestResultsDto } from './dto/soil.dto';

@Injectable()
export class SoilTestingService {
  private samples = new Map<string, any>([
    [
      'MA-REQ-000155',
      {
        id: 's-001',
        sampleCode: 'MA-REQ-000155',
        qrCode: 'QR-SOIL-MH-2026-000155',
        farmerId: 'f-001',
        farmerName: 'Ramesh Patil',
        landParcelId: 'lp-01',
        surveyGatNumber: '142/1',
        villageName: 'Seloo',
        status: 'REPORT_GENERATED',
        healthScore: 82.5,
        healthCategory: 'GOOD',
        parameters: [
          { code: 'pH', name: 'Soil Reaction (pH)', value: 7.2, unit: 'pH', rating: 'OPTIMAL' },
          { code: 'EC', name: 'Electrical Conductivity', value: 0.45, unit: 'dS/m', rating: 'OPTIMAL' },
          { code: 'OC', name: 'Organic Carbon', value: 0.68, unit: '%', rating: 'MEDIUM' },
          { code: 'N', name: 'Available Nitrogen', value: 295.0, unit: 'kg/ha', rating: 'MEDIUM' },
          { code: 'P', name: 'Available Phosphorus', value: 18.5, unit: 'kg/ha', rating: 'OPTIMAL' },
          { code: 'K', name: 'Available Potassium', value: 340.0, unit: 'kg/ha', rating: 'HIGH' },
        ],
        recommendations: [
          { crop: 'Cotton', fertilizer: 'Urea', dosage: '45 kg/acre', applicationStage: 'Basal' },
          { crop: 'Cotton', fertilizer: 'SSP', dosage: '50 kg/acre', applicationStage: 'First Split' },
        ],
        recordVersion: 1,
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  async getSamples() {
    return { success: true, data: Array.from(this.samples.values()), timestamp: new Date().toISOString() };
  }

  async getSampleByCode(sampleCode: string) {
    const sample = this.samples.get(sampleCode);
    if (!sample) {
      throw new NotFoundException(`Soil sample ${sampleCode} not found`);
    }
    return { success: true, data: sample, timestamp: new Date().toISOString() };
  }

  async registerSample(dto: RegisterSoilSampleDto) {
    const sampleCode = `MH-SOIL-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newSample = {
      id: `s-${Date.now()}`,
      sampleCode,
      qrCode: `QR-${sampleCode}`,
      farmerId: dto.farmerId,
      landParcelId: dto.landParcelId,
      gpsLatitude: dto.gpsLatitude,
      gpsLongitude: dto.gpsLongitude,
      status: 'COLLECTED',
      healthScore: null,
      healthCategory: 'PENDING',
      parameters: [],
      recommendations: [],
      recordVersion: 1,
      createdAt: new Date().toISOString(),
    };

    this.samples.set(sampleCode, newSample);
    return { success: true, message: 'Soil sample registered successfully', data: newSample, timestamp: new Date().toISOString() };
  }

  async enterTestResults(dto: EnterTestResultsDto) {
    const sample = this.samples.get(dto.sampleCode);
    if (!sample) {
      throw new NotFoundException(`Soil sample ${dto.sampleCode} not found`);
    }

    sample.status = 'REPORT_GENERATED';
    sample.healthScore = 80.0;
    sample.healthCategory = 'GOOD';
    sample.parameters = dto.parameters.map(p => ({
      code: p.parameterCode,
      name: p.parameterCode,
      value: p.measuredValue,
      unit: 'unit',
      rating: 'OPTIMAL',
    }));
    sample.recordVersion += 1;
    sample.updatedAt = new Date().toISOString();

    return { success: true, message: 'Soil test results recorded successfully', data: sample, timestamp: new Date().toISOString() };
  }
}
