// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 08: EDP Management Service Implementation
// ============================================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class EdpService {
  private courses = [
    {
      id: 'crs-01',
      courseCode: 'EDP-CRS-01',
      titleEn: 'Agri-Drone Pilot Certification Programme',
      titleMr: 'कृषी ड्रोन पायलट प्रमाणपत्र कार्यक्रम',
      durationDays: 15,
      status: 'ACTIVE',
    },
    {
      id: 'crs-02',
      courseCode: 'EDP-CRS-02',
      titleEn: 'Soil Testing & Advisory Entrepreneurship',
      titleMr: 'माती परीक्षण व सल्लागार उद्योजकता',
      durationDays: 30,
      status: 'ACTIVE',
    },
  ];

  private batches = [
    {
      id: 'btch-01',
      batchCode: 'EDP-BATCH-WRD-2026-01',
      courseCode: 'EDP-CRS-01',
      districtName: 'Wardha',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      maxCapacity: 30,
      currentEnrolled: 24,
      status: 'UPCOMING',
    },
  ];

  async getCourses() {
    return { success: true, data: this.courses, timestamp: new Date().toISOString() };
  }

  async getBatches() {
    return { success: true, data: this.batches, timestamp: new Date().toISOString() };
  }
}
