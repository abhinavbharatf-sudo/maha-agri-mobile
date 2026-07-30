// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 02: Master Data Hub Service Implementation
// ============================================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class MasterDataService {
  private divisions = [
    { id: 'div-0001', code: 'NAGPUR', nameEn: 'Nagpur Division', nameMr: 'नागपूर विभाग' },
    { id: 'div-0002', code: 'AMRAVATI', nameEn: 'Amravati Division', nameMr: 'अमरावती विभाग' },
    { id: 'div-0003', code: 'PUNE', nameEn: 'Pune Division', nameMr: 'पुणे विभाग' },
  ];

  private districts = [
    { id: 'dist-0001', divisionId: 'div-0001', code: 'WARDHA', nameEn: 'Wardha', nameMr: 'वर्धा', censusCode: '504' },
    { id: 'dist-0002', divisionId: 'div-0001', code: 'NAGPUR', nameEn: 'Nagpur', nameMr: 'नागपूर', censusCode: '505' },
  ];

  private talukas = [
    { id: 'tal-0001', districtId: 'dist-0001', code: 'WARDHA_T', nameEn: 'Wardha', nameMr: 'वर्धा' },
    { id: 'tal-0002', districtId: 'dist-0001', code: 'ARVI', nameEn: 'Arvi', nameMr: 'आर्वी' },
    { id: 'tal-0003', districtId: 'dist-0001', code: 'ASHTI', nameEn: 'Ashti', nameMr: 'आष्टी' },
    { id: 'tal-0004', districtId: 'dist-0001', code: 'DEOLI', nameEn: 'Deoli', nameMr: 'देवळी' },
    { id: 'tal-0005', districtId: 'dist-0001', code: 'HINGANGHAT', nameEn: 'Hinganghat', nameMr: 'हिंगणघाट' },
    { id: 'tal-0006', districtId: 'dist-0001', code: 'KARANJA', nameEn: 'Karanja', nameMr: 'कारंजा' },
    { id: 'tal-0007', districtId: 'dist-0001', code: 'SAMUDRAPUR', nameEn: 'Samudrapur', nameMr: 'समुद्रपूर' },
    { id: 'tal-0008', districtId: 'dist-0001', code: 'SELOO', nameEn: 'Seloo', nameMr: 'सेलू' },
  ];

  private crops = [
    { id: 'crop-0001', code: 'COTTON', nameEn: 'Cotton', nameMr: 'कापूस', category: 'Kharif' },
    { id: 'crop-0002', code: 'SOYBEAN', nameEn: 'Soybean', nameMr: 'सोयाबीन', category: 'Kharif' },
    { id: 'crop-0003', code: 'TUR', nameEn: 'Pigeon Pea (Tur)', nameMr: 'तूर', category: 'Kharif' },
    { id: 'crop-0004', code: 'WHEAT', nameEn: 'Wheat', nameMr: 'गहू', category: 'Rabi' },
    { id: 'crop-0005', code: 'GRAM', nameEn: 'Bengal Gram (Harbara)', nameMr: 'हरभरा', category: 'Rabi' },
  ];

  async getDivisions() {
    return { success: true, data: this.divisions, timestamp: new Date().toISOString() };
  }

  async getDistricts(divisionId?: string) {
    const list = divisionId ? this.districts.filter(d => d.divisionId === divisionId) : this.districts;
    return { success: true, data: list, timestamp: new Date().toISOString() };
  }

  async getTalukas(districtId?: string) {
    const list = districtId ? this.talukas.filter(t => t.districtId === districtId) : this.talukas;
    return { success: true, data: list, timestamp: new Date().toISOString() };
  }

  async getCrops() {
    return { success: true, data: this.crops, timestamp: new Date().toISOString() };
  }
}
