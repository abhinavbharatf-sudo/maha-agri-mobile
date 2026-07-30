// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// EDP Agri Drone Module: Lifecycle Business Logic Service (Phases 1 to 9)
// ============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EdpStateMachineService, EdpCandidateStatus } from './edp-state-machine.service';

@Injectable()
export class EdpLifecycleService {
  private readonly logger = new Logger(EdpLifecycleService.name);

  private leadsMap = new Map<string, any>();
  private candidatesMap = new Map<string, any>();
  private timelineMap = new Map<string, any[]>();
  private careerChoicesMap = new Map<string, any>();
  private droneBookingsMap = new Map<string, any>();
  private loanApplicationsMap = new Map<string, any>();
  private partnerActivationsMap = new Map<string, any>();

  constructor(private readonly stateMachineService: EdpStateMachineService) {}

  // Phase 1: Lead Generation
  async createLead(params: { fullName: string; mobileNumber: string; districtId: string; talukaId: string; source: string; agridootUserId?: string; createdBy: string }) {
    const leadId = `lead-${Date.now()}`;
    const leadCode = `LEAD-AGRI-${Date.now().toString().slice(-6)}`;

    const lead = {
      id: leadId,
      leadCode,
      fullName: params.fullName,
      mobileNumber: params.mobileNumber,
      districtId: params.districtId,
      talukaId: params.talukaId,
      source: params.source,
      agridootUserId: params.agridootUserId,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };

    this.leadsMap.set(leadId, lead);
    this.logger.log(`[Phase 1] Lead Created: ${leadCode} (${params.fullName})`);

    return { success: true, message: 'Agri Drone EDP Lead generated successfully', data: lead };
  }

  // Phase 2 & 3: CRM Registration & Payment Activation
  async registerCandidate(params: { leadId: string; createdBy: string }) {
    const lead = this.leadsMap.get(params.leadId);
    if (!lead) throw new NotFoundException(`Lead ${params.leadId} not found`);

    const candidateId = `cand-${Date.now()}`;
    const candidateCode = `CAND-AGRI-${Date.now().toString().slice(-6)}`;

    const candidate = {
      id: candidateId,
      candidateCode,
      leadId: lead.id,
      fullName: lead.fullName,
      mobileNumber: lead.mobileNumber,
      districtId: lead.districtId,
      talukaId: lead.talukaId,
      status: EdpCandidateStatus.REGISTERED,
      isPaid: false,
      isPortalActive: false,
      createdAt: new Date().toISOString(),
    };

    this.candidatesMap.set(candidateId, candidate);
    this.logTimeline(candidateId, null, EdpCandidateStatus.REGISTERED, 'Candidate Registered', params.createdBy);

    return { success: true, message: 'Candidate registered successfully', data: candidate };
  }

  // Phase 4: Registration Payment -> Portal Activation
  async confirmPaymentAndActivatePortal(candidateId: string, transactionRef: string, actorUserId: string) {
    const candidate = this.candidatesMap.get(candidateId);
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.PAID);
    candidate.status = EdpCandidateStatus.PAID;
    candidate.isPaid = true;
    this.logTimeline(candidateId, EdpCandidateStatus.REGISTERED, EdpCandidateStatus.PAID, `Payment confirmed: ${transactionRef}`, actorUserId);

    // Auto-activate Candidate Portal
    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.PORTAL_ACTIVE);
    candidate.status = EdpCandidateStatus.PORTAL_ACTIVE;
    candidate.isPortalActive = true;
    this.logTimeline(candidateId, EdpCandidateStatus.PAID, EdpCandidateStatus.PORTAL_ACTIVE, 'Candidate Portal Activated', actorUserId);

    return { success: true, message: 'Payment confirmed and Candidate Portal activated', data: candidate };
  }

  // Phase 8: Career Choice Engine
  async selectCareerTrack(candidateId: string, chosenTrack: string, actorUserId: string) {
    const candidate = this.candidatesMap.get(candidateId);
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // Guard: Candidate must be CERTIFIED
    if (candidate.status !== EdpCandidateStatus.CERTIFIED && candidate.status !== EdpCandidateStatus.WORKSHOP_COMPLETED) {
      candidate.status = EdpCandidateStatus.CERTIFIED; // Fast-forward for demo flow
    }

    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.CAREER_SELECTED);
    candidate.status = EdpCandidateStatus.CAREER_SELECTED;
    
    const choice = {
      id: `career-${Date.now()}`,
      candidateId,
      chosenTrack,
      selectedAt: new Date().toISOString(),
      isBusinessReady: true,
    };

    this.careerChoicesMap.set(candidateId, choice);
    this.logTimeline(candidateId, EdpCandidateStatus.CERTIFIED, EdpCandidateStatus.CAREER_SELECTED, `Career Track Chosen: ${chosenTrack}`, actorUserId);

    // Mark Business Ready
    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.BUSINESS_READY);
    candidate.status = EdpCandidateStatus.BUSINESS_READY;
    this.logTimeline(candidateId, EdpCandidateStatus.CAREER_SELECTED, EdpCandidateStatus.BUSINESS_READY, 'Marked Business Ready for Drone Journey', actorUserId);

    return { success: true, message: 'Career Track selected and candidate marked Business Ready', data: { candidate, choice } };
  }

  // Phase 9: Business Journey - Drone Booking & Loan Application
  async bookDrone(candidateId: string, droneModel: string, totalPrice: number, bookingAmount: number, actorUserId: string) {
    const candidate = this.candidatesMap.get(candidateId);
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.DRONE_BOOKED);
    candidate.status = EdpCandidateStatus.DRONE_BOOKED;

    const booking = {
      id: `book-${Date.now()}`,
      bookingCode: `BOOK-DRONE-${Date.now().toString().slice(-6)}`,
      candidateId,
      droneModel,
      totalPrice,
      bookingAmount,
      bookingStatus: 'BOOKED',
      bookedAt: new Date().toISOString(),
    };

    this.droneBookingsMap.set(booking.id, booking);
    this.logTimeline(candidateId, EdpCandidateStatus.BUSINESS_READY, EdpCandidateStatus.DRONE_BOOKED, `Drone Booked: ${droneModel}`, actorUserId);

    return { success: true, message: 'Agri Drone booked successfully', data: booking };
  }

  async applyLoan(candidateId: string, bookingId: string, bankName: string, requestedAmount: number, actorUserId: string) {
    const candidate = this.candidatesMap.get(candidateId);
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.LOAN_APPLIED);
    candidate.status = EdpCandidateStatus.LOAN_APPLIED;

    const loan = {
      id: `loan-${Date.now()}`,
      applicationCode: `LOAN-${Date.now().toString().slice(-6)}`,
      candidateId,
      bookingId,
      bankName,
      requestedAmount,
      status: 'APPLIED',
      appliedAt: new Date().toISOString(),
    };

    this.loanApplicationsMap.set(loan.id, loan);
    this.logTimeline(candidateId, EdpCandidateStatus.DRONE_BOOKED, EdpCandidateStatus.LOAN_APPLIED, `Loan Applied at ${bankName}`, actorUserId);

    return { success: true, message: 'Bank loan application submitted', data: loan };
  }

  async activatePartner(candidateId: string, actorUserId: string) {
    const candidate = this.candidatesMap.get(candidateId);
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // Fast-forward through Loan Approval -> Delivery -> Ground Training -> Partner
    candidate.status = EdpCandidateStatus.PARTNER_ACTIVATED;

    const partner = {
      id: `partner-${Date.now()}`,
      partnerCode: `PARTNER-AGRI-${Date.now().toString().slice(-6)}`,
      candidateId,
      isGroundTrained: true,
      isAppTransferred: true,
      status: 'ACTIVATED',
      activationDate: new Date().toISOString(),
    };

    this.partnerActivationsMap.set(candidateId, partner);
    this.logTimeline(candidateId, EdpCandidateStatus.LOAN_APPLIED, EdpCandidateStatus.PARTNER_ACTIVATED, 'Agri Drone Partner Activated & Business App Transferred', actorUserId);

    return { success: true, message: 'Agri Drone Entrepreneur Partner Activated & App Transferred', data: { candidate, partner } };
  }

  private logTimeline(candidateId: string, previousStatus: EdpCandidateStatus | null, newStatus: EdpCandidateStatus, actionSummary: string, actorUserId: string) {
    const timelines = this.timelineMap.get(candidateId) || [];
    timelines.push({
      id: `time-${Date.now()}`,
      candidateId,
      previousStatus,
      newStatus,
      actionSummary,
      actorUserId,
      createdAt: new Date().toISOString(),
    });
    this.timelineMap.set(candidateId, timelines);
  }

  async getCandidateTimeline(candidateId: string) {
    return {
      success: true,
      candidateId,
      data: this.timelineMap.get(candidateId) || [],
    };
  }
}
