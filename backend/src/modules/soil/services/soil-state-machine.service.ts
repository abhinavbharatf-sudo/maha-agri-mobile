// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Soil Testing Operations Module: State Machine & Rules Guard (16 States)
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export enum SoilSampleStatus {
  FARMER_REGISTERED = 'FARMER_REGISTERED',
  LAND_PARCEL_MAPPED = 'LAND_PARCEL_MAPPED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  QR_BARCODE_ASSIGNED = 'QR_BARCODE_ASSIGNED',
  IN_TRANSIT_TO_LAB = 'IN_TRANSIT_TO_LAB',
  LAB_RECEIVED = 'LAB_RECEIVED',
  TESTING_IN_PROGRESS = 'TESTING_IN_PROGRESS',
  RESULT_ENTERED = 'RESULT_ENTERED',
  CHEMIST_VERIFIED = 'CHEMIST_VERIFIED',
  QC_APPROVED = 'QC_APPROVED',
  HEALTH_CARD_GENERATED = 'HEALTH_CARD_GENERATED',
  DELIVERED_TO_FARMER = 'DELIVERED_TO_FARMER',
  ADVISORY_DISPATCHED = 'ADVISORY_DISPATCHED',
  SAMPLE_REJECTED = 'SAMPLE_REJECTED',
  RETEST_REQUESTED = 'RETEST_REQUESTED',
  RETEST_IN_PROGRESS = 'RETEST_IN_PROGRESS',
}

@Injectable()
export class SoilStateMachineService {
  private readonly logger = new Logger(SoilStateMachineService.name);

  private readonly allowedTransitions: Record<SoilSampleStatus, SoilSampleStatus[]> = {
    [SoilSampleStatus.FARMER_REGISTERED]: [SoilSampleStatus.LAND_PARCEL_MAPPED],
    [SoilSampleStatus.LAND_PARCEL_MAPPED]: [SoilSampleStatus.SAMPLE_COLLECTED],
    [SoilSampleStatus.SAMPLE_COLLECTED]: [SoilSampleStatus.QR_BARCODE_ASSIGNED],
    [SoilSampleStatus.QR_BARCODE_ASSIGNED]: [SoilSampleStatus.IN_TRANSIT_TO_LAB],
    [SoilSampleStatus.IN_TRANSIT_TO_LAB]: [SoilSampleStatus.LAB_RECEIVED, SoilSampleStatus.SAMPLE_REJECTED],
    [SoilSampleStatus.LAB_RECEIVED]: [SoilSampleStatus.TESTING_IN_PROGRESS, SoilSampleStatus.SAMPLE_REJECTED],
    [SoilSampleStatus.TESTING_IN_PROGRESS]: [SoilSampleStatus.RESULT_ENTERED, SoilSampleStatus.RETEST_REQUESTED],
    [SoilSampleStatus.RESULT_ENTERED]: [SoilSampleStatus.CHEMIST_VERIFIED, SoilSampleStatus.RETEST_REQUESTED],
    [SoilSampleStatus.CHEMIST_VERIFIED]: [SoilSampleStatus.QC_APPROVED, SoilSampleStatus.RETEST_REQUESTED],
    [SoilSampleStatus.QC_APPROVED]: [SoilSampleStatus.HEALTH_CARD_GENERATED],
    [SoilSampleStatus.HEALTH_CARD_GENERATED]: [SoilSampleStatus.DELIVERED_TO_FARMER],
    [SoilSampleStatus.DELIVERED_TO_FARMER]: [SoilSampleStatus.ADVISORY_DISPATCHED],
    [SoilSampleStatus.ADVISORY_DISPATCHED]: [],
    [SoilSampleStatus.SAMPLE_REJECTED]: [SoilSampleStatus.SAMPLE_COLLECTED],
    [SoilSampleStatus.RETEST_REQUESTED]: [SoilSampleStatus.RETEST_IN_PROGRESS],
    [SoilSampleStatus.RETEST_IN_PROGRESS]: [SoilSampleStatus.RESULT_ENTERED],
  };

  validateStateTransition(currentStatus: SoilSampleStatus, newStatus: SoilSampleStatus): boolean {
    const validNext = this.allowedTransitions[currentStatus] || [];
    if (!validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid Soil Sample State Transition: Cannot transition sample from '${currentStatus}' to '${newStatus}'. Allowed: [${validNext.join(', ')}]`,
      );
    }
    return true;
  }
}
