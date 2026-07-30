// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// MAHA-AGRIDOOT Workforce Module: State Machine & Rules Guard (11 States)
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export enum WorkforceStatus {
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  VERIFIED = 'VERIFIED',
  SELECTED = 'SELECTED',
  APPOINTED = 'APPOINTED',
  TRAINED = 'TRAINED',
  ACTIVE = 'ACTIVE',
  TRANSFERRED = 'TRANSFERRED',
  PROMOTED = 'PROMOTED',
  SUSPENDED = 'SUSPENDED',
  EXITED = 'EXITED',
}

@Injectable()
export class WorkforceStateMachineService {
  private readonly logger = new Logger(WorkforceStateMachineService.name);

  private readonly allowedTransitions: Record<WorkforceStatus, WorkforceStatus[]> = {
    [WorkforceStatus.APPLIED]: [WorkforceStatus.SCREENING],
    [WorkforceStatus.SCREENING]: [WorkforceStatus.VERIFIED, WorkforceStatus.EXITED],
    [WorkforceStatus.VERIFIED]: [WorkforceStatus.SELECTED, WorkforceStatus.EXITED],
    [WorkforceStatus.SELECTED]: [WorkforceStatus.APPOINTED],
    [WorkforceStatus.APPOINTED]: [WorkforceStatus.TRAINED],
    [WorkforceStatus.TRAINED]: [WorkforceStatus.ACTIVE],
    [WorkforceStatus.ACTIVE]: [WorkforceStatus.TRANSFERRED, WorkforceStatus.PROMOTED, WorkforceStatus.SUSPENDED, WorkforceStatus.EXITED],
    [WorkforceStatus.TRANSFERRED]: [WorkforceStatus.ACTIVE],
    [WorkforceStatus.PROMOTED]: [WorkforceStatus.ACTIVE],
    [WorkforceStatus.SUSPENDED]: [WorkforceStatus.ACTIVE, WorkforceStatus.EXITED],
    [WorkforceStatus.EXITED]: [],
  };

  validateStateTransition(currentStatus: WorkforceStatus, newStatus: WorkforceStatus): boolean {
    const validNext = this.allowedTransitions[currentStatus] || [];
    if (!validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid Workforce State Transition: Cannot transition MAHA-AGRIDOOT from '${currentStatus}' to '${newStatus}'. Allowed: [${validNext.join(', ')}]`,
      );
    }
    return true;
  }
}
