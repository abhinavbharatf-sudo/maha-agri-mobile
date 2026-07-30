// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Shared Farmer Master Module: State Machine & Rules Guard (5 States)
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export enum SharedFarmerStatus {
  REGISTERED = 'REGISTERED',
  KYC_VERIFIED = 'KYC_VERIFIED',
  ACTIVE = 'ACTIVE',
  MERGED = 'MERGED',
  ARCHIVED = 'ARCHIVED',
}

@Injectable()
export class SharedFarmerStateMachineService {
  private readonly logger = new Logger(SharedFarmerStateMachineService.name);

  private readonly allowedTransitions: Record<SharedFarmerStatus, SharedFarmerStatus[]> = {
    [SharedFarmerStatus.REGISTERED]: [SharedFarmerStatus.KYC_VERIFIED, SharedFarmerStatus.ARCHIVED],
    [SharedFarmerStatus.KYC_VERIFIED]: [SharedFarmerStatus.ACTIVE, SharedFarmerStatus.MERGED, SharedFarmerStatus.ARCHIVED],
    [SharedFarmerStatus.ACTIVE]: [SharedFarmerStatus.MERGED, SharedFarmerStatus.ARCHIVED],
    [SharedFarmerStatus.MERGED]: [],
    [SharedFarmerStatus.ARCHIVED]: [],
  };

  validateStateTransition(currentStatus: SharedFarmerStatus, newStatus: SharedFarmerStatus): boolean {
    const validNext = this.allowedTransitions[currentStatus] || [];
    if (!validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid Farmer Master State Transition: Cannot transition farmer from '${currentStatus}' to '${newStatus}'. Allowed: [${validNext.join(', ')}]`,
      );
    }
    return true;
  }
}
