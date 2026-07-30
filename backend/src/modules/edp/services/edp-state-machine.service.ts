// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// EDP Agri Drone Module: State Machine & Business Rules Engine
// Lifecycle States: NEW -> REGISTERED -> PAID -> PORTAL_ACTIVE -> DOCUMENT_VERIFIED
// -> WORKSHOP_COMPLETED -> CERTIFIED -> CAREER_SELECTED -> BUSINESS_READY
// -> DRONE_BOOKED -> LOAN_APPROVED -> GROUND_TRAINED -> PARTNER_ACTIVATED
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export enum EdpCandidateStatus {
  NEW = 'NEW',
  INTERESTED = 'INTERESTED',
  REGISTERED = 'REGISTERED',
  PAID = 'PAID',
  PORTAL_ACTIVE = 'PORTAL_ACTIVE',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  WORKSHOP_ASSIGNED = 'WORKSHOP_ASSIGNED',
  WORKSHOP_COMPLETED = 'WORKSHOP_COMPLETED',
  CERTIFIED = 'CERTIFIED',
  CAREER_SELECTED = 'CAREER_SELECTED',
  BUSINESS_READY = 'BUSINESS_READY',
  DRONE_BOOKED = 'DRONE_BOOKED',
  LOAN_APPLIED = 'LOAN_APPLIED',
  LOAN_APPROVED = 'LOAN_APPROVED',
  DRONE_DELIVERED = 'DRONE_DELIVERED',
  GROUND_TRAINED = 'GROUND_TRAINED',
  PARTNER_ACTIVATED = 'PARTNER_ACTIVATED',
}

@Injectable()
export class EdpStateMachineService {
  private readonly logger = new Logger(EdpStateMachineService.name);

  // Allowed Transition Map (Strict State Machine Guard)
  private readonly allowedTransitions: Record<EdpCandidateStatus, EdpCandidateStatus[]> = {
    [EdpCandidateStatus.NEW]: [EdpCandidateStatus.INTERESTED, EdpCandidateStatus.REGISTERED],
    [EdpCandidateStatus.INTERESTED]: [EdpCandidateStatus.REGISTERED],
    [EdpCandidateStatus.REGISTERED]: [EdpCandidateStatus.PAID],
    [EdpCandidateStatus.PAID]: [EdpCandidateStatus.PORTAL_ACTIVE],
    [EdpCandidateStatus.PORTAL_ACTIVE]: [EdpCandidateStatus.DOCUMENT_VERIFIED],
    [EdpCandidateStatus.DOCUMENT_VERIFIED]: [EdpCandidateStatus.WORKSHOP_ASSIGNED],
    [EdpCandidateStatus.WORKSHOP_ASSIGNED]: [EdpCandidateStatus.WORKSHOP_COMPLETED],
    [EdpCandidateStatus.WORKSHOP_COMPLETED]: [EdpCandidateStatus.CERTIFIED],
    [EdpCandidateStatus.CERTIFIED]: [EdpCandidateStatus.CAREER_SELECTED],
    [EdpCandidateStatus.CAREER_SELECTED]: [EdpCandidateStatus.BUSINESS_READY],
    [EdpCandidateStatus.BUSINESS_READY]: [EdpCandidateStatus.DRONE_BOOKED],
    [EdpCandidateStatus.DRONE_BOOKED]: [EdpCandidateStatus.LOAN_APPLIED],
    [EdpCandidateStatus.LOAN_APPLIED]: [EdpCandidateStatus.LOAN_APPROVED],
    [EdpCandidateStatus.LOAN_APPROVED]: [EdpCandidateStatus.DRONE_DELIVERED],
    [EdpCandidateStatus.DRONE_DELIVERED]: [EdpCandidateStatus.GROUND_TRAINED],
    [EdpCandidateStatus.GROUND_TRAINED]: [EdpCandidateStatus.PARTNER_ACTIVATED],
    [EdpCandidateStatus.PARTNER_ACTIVATED]: [],
  };

  validateStateTransition(currentStatus: EdpCandidateStatus, newStatus: EdpCandidateStatus): boolean {
    const validNextStates = this.allowedTransitions[currentStatus] || [];
    if (!validNextStates.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid Candidate State Transition: Cannot transition candidate from state '${currentStatus}' to '${newStatus}'. Allowed next states: [${validNextStates.join(', ')}]`,
      );
    }
    return true;
  }
}
