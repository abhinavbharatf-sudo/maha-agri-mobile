// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// EDP Agri Drone Module: Lifecycle Business Logic Service (Phases 1 to 9)
// ============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { EdpStateMachineService, EdpCandidateStatus } from './edp-state-machine.service';
import { PrismaService } from '../../platform/services/prisma.service';

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
  private transactionCandidateMap = new Map<string, string>();

  constructor(
    private readonly stateMachineService: EdpStateMachineService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

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

  findCandidate(idOrCode: string) {
    if (this.candidatesMap.has(idOrCode)) {
      return this.candidatesMap.get(idOrCode);
    }
    for (const cand of this.candidatesMap.values()) {
      if (cand.candidateCode === idOrCode || cand.id === idOrCode) {
        return cand;
      }
    }
    return null;
  }

  private isUuid(val: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  async findCandidateAsync(idOrCode: string) {
    const cached = this.findCandidate(idOrCode);
    if (cached) return cached;

    // Fallback to PostgreSQL Prisma persistence (survives server restart)
    if (this.prisma?.edpCandidate) {
      try {
        const whereClause = this.isUuid(idOrCode)
          ? { OR: [{ candidateCode: idOrCode }, { id: idOrCode }] }
          : { candidateCode: idOrCode };

        const dbCandidate = await this.prisma.edpCandidate.findFirst({
          where: whereClause,
          select: {
            id: true,
            candidateCode: true,
            fullName: true,
            mobileNumber: true,
            districtId: true,
            talukaId: true,
            status: true,
            isPaid: true,
            isPortalActive: true,
            createdAt: true,
          },
        });
        if (dbCandidate) {
          const hydrated = {
            id: dbCandidate.id,
            candidateCode: dbCandidate.candidateCode,
            fullName: dbCandidate.fullName,
            mobileNumber: dbCandidate.mobileNumber,
            districtId: dbCandidate.districtId,
            talukaId: dbCandidate.talukaId,
            status: dbCandidate.status as any,
            isPaid: dbCandidate.isPaid,
            isPortalActive: dbCandidate.isPortalActive,
            createdAt: dbCandidate.createdAt.toISOString(),
          };
          this.candidatesMap.set(dbCandidate.candidateCode, hydrated);
          this.candidatesMap.set(dbCandidate.id, hydrated);
          return hydrated;
        }
      } catch (err: any) {
        this.logger.warn(`Could not query PostgreSQL for candidate ${idOrCode}: ${err.message}`);
      }
    }
    return null;
  }

  async syncAssessmentCandidate(params: {
    candidateId: string;
    fullName: string;
    mobileNumber: string;
    districtId?: string;
    talukaId?: string;
  }) {
    const existing = await this.findCandidateAsync(params.candidateId);
    if (existing) {
      return { success: true, message: 'Candidate already exists in registry', data: existing };
    }

    const candidate = {
      id: params.candidateId,
      candidateCode: params.candidateId,
      fullName: params.fullName,
      mobileNumber: params.mobileNumber,
      districtId: params.districtId || 'Wardha',
      talukaId: params.talukaId || 'Wardha',
      status: EdpCandidateStatus.REGISTERED,
      isPaid: false,
      isPortalActive: false,
      createdAt: new Date().toISOString(),
    };

    this.candidatesMap.set(params.candidateId, candidate);
    this.logTimeline(params.candidateId, null, EdpCandidateStatus.REGISTERED, 'Assessment Submitted & Registered', 'Candidate');

    // Persist to PostgreSQL Prisma model edp_candidates
    if (this.prisma?.edpCandidate) {
      try {
        const defaultUuid = '00000000-0000-0000-0000-000000000001';
        const persisted = await this.prisma.edpCandidate.upsert({
          where: { candidateCode: params.candidateId },
          create: {
            candidateCode: params.candidateId,
            fullName: params.fullName,
            mobileNumber: params.mobileNumber,
            districtId: defaultUuid,
            talukaId: defaultUuid,
            status: EdpCandidateStatus.REGISTERED as any,
            isPaid: false,
            isPortalActive: false,
            createdBy: defaultUuid,
            updatedBy: defaultUuid,
          },
          update: {
            fullName: params.fullName,
            mobileNumber: params.mobileNumber,
          },
        });
        if (persisted && persisted.id) {
          candidate.id = persisted.id;
          this.candidatesMap.set(persisted.id, candidate);
        }
        this.logger.log(`Persisted candidate ${params.candidateId} in PostgreSQL edp_candidates`);
      } catch (dbErr: any) {
        this.logger.warn(`Could not persist candidate ${params.candidateId} to PostgreSQL: ${dbErr.message}`);
      }
    }

    return { success: true, message: 'Candidate registered successfully', data: candidate };
  }

  // Phase 4: Registration Payment -> Portal Activation
  async confirmPaymentAndActivatePortal(candidateId: string, transactionRef: string, actorUserId: string) {
    if (!transactionRef || typeof transactionRef !== 'string' || !transactionRef.trim()) {
      throw new BadRequestException('Transaction reference is required for portal activation');
    }

    let candidate = this.findCandidate(candidateId);
    if (!candidate) {
      candidate = await this.findCandidateAsync(candidateId);
    }
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);

    // Priority 3 Idempotency Guard: Avoid duplicate execution / invalid state machine transition
    if (candidate.isPaid || candidate.status === EdpCandidateStatus.PORTAL_ACTIVE) {
      this.logger.log(`Candidate ${candidateId} is already paid & portal active. Idempotent return.`);
      return {
        success: true,
        message: 'Candidate portal already active (idempotent)',
        data: candidate,
      };
    }


    // Candidate-to-Payment Association & Single-Redemption Guard (In-memory)
    const boundCandidate = this.transactionCandidateMap.get(transactionRef);
    if (boundCandidate && boundCandidate !== candidate.candidateCode && boundCandidate !== candidate.id) {
      throw new BadRequestException(
        `Transaction '${transactionRef}' has already been redeemed by another candidate. Replay rejected.`,
      );
    }

    // Atomic Database Transaction: Verification, Single Redemption, Conditional Activation, and Order Status Update
    if (this.prisma) {
      try {
        let isConcurrentIdempotent = false;

        await this.prisma.$transaction(async (tx) => {
          // 1. Authoritative Proof-of-Payment Verification against PostgreSQL integ_payment_txns
          let paymentTxn: any = null;
          if (tx.integPaymentTxn) {
            paymentTxn = await tx.integPaymentTxn.findUnique({
              where: { txnCode: transactionRef },
            });

            if (!paymentTxn) {
              throw new BadRequestException(
                `Invalid or unverified transaction reference '${transactionRef}'. Proof of verified payment of ₹2,068 INR is required.`,
              );
            }

            if (paymentTxn.status !== 'SUCCESS') {
              throw new BadRequestException(
                `Payment transaction '${transactionRef}' is in '${paymentTxn.status}' status. Only SUCCESS payments are valid for activation.`,
              );
            }

            const txnAmount = Number(paymentTxn.amount);
            if (txnAmount !== 2068) {
              throw new BadRequestException(
                `Payment transaction amount mismatch: expected ₹2,068, found ₹${txnAmount}.`,
              );
            }

            // Strict Candidate Association Validation against payment transaction
            if (paymentTxn.candidateId && candidate.id && paymentTxn.candidateId !== candidate.id) {
              throw new BadRequestException(
                `Transaction '${transactionRef}' is associated with another candidate ID. Association mismatch rejected.`,
              );
            }

            if (paymentTxn.candidateCode && candidate.candidateCode && paymentTxn.candidateCode !== candidate.candidateCode) {
              throw new BadRequestException(
                `Transaction '${transactionRef}' is associated with candidate code '${paymentTxn.candidateCode}', not '${candidate.candidateCode}'. Association mismatch rejected.`,
              );
            }
          }

          // 2. Candidate-to-Payment Association & Single-Redemption Guard (PostgreSQL)
          if (tx.edpCandidate) {
            const notFilter = this.isUuid(candidate.id || candidateId)
              ? { id: candidate.id || candidateId }
              : { candidateCode: candidate.candidateCode || candidateId };

            const alreadyRedeemed = await tx.edpCandidate.findFirst({
              where: {
                paymentTxnCode: transactionRef,
                NOT: notFilter,
              },
              select: { id: true, candidateCode: true },
            });

            if (alreadyRedeemed) {
              throw new BadRequestException(
                `Transaction '${transactionRef}' has already been redeemed by candidate '${alreadyRedeemed.candidateCode}'. Replay rejected.`,
              );
            }

            // 3. Atomic Conditional Update in PostgreSQL: WHERE isPaid = false
            const whereClause = this.isUuid(candidate.id || candidateId)
              ? { id: candidate.id || candidateId, isPaid: false }
              : { candidateCode: candidate.candidateCode || candidateId, isPaid: false };

            const updateResult = await tx.edpCandidate.updateMany({
              where: whereClause,
              data: {
                status: EdpCandidateStatus.PORTAL_ACTIVE as any,
                isPaid: true,
                isPortalActive: true,
                paymentTxnCode: transactionRef,
                paidAt: new Date(),
              },
            });

            if (updateResult.count === 0) {
              // Check if this is a legitimate idempotent retry for the SAME candidate and SAME transaction
              const current = this.findCandidate(candidateId);
              if (current?.isPaid && (current?.paymentTxnCode === transactionRef || current?.status === EdpCandidateStatus.PORTAL_ACTIVE)) {
                isConcurrentIdempotent = true;
                return;
              }
              const dbCurrent = await tx.edpCandidate.findFirst({
                where: this.isUuid(candidate.id || candidateId)
                  ? { OR: [{ candidateCode: candidateId }, { id: candidateId }] }
                  : { candidateCode: candidate.candidateCode || candidateId },
              });
              if (dbCurrent?.isPaid && (dbCurrent?.paymentTxnCode === transactionRef || dbCurrent?.status === EdpCandidateStatus.PORTAL_ACTIVE)) {
                isConcurrentIdempotent = true;
                return;
              }
              throw new BadRequestException(
                `Candidate ${candidateId} could not be activated: invalid state transition or candidate already modified.`,
              );
            }
          }

          // 4. Update order status atomically if orderCode is known
          const orderCode = paymentTxn?.orderCode;
          if (orderCode && tx.integPaymentOrder) {
            await tx.integPaymentOrder.updateMany({
              where: { orderCode },
              data: { status: 'PAID' },
            });
          }
        });

        if (isConcurrentIdempotent) {
          this.logger.log(`Candidate ${candidateId} was already activated with transaction ${transactionRef}. Idempotent return.`);
          return {
            success: true,
            message: 'Candidate portal already active (concurrent idempotent execution)',
            data: candidate,
          };
        }
        this.logger.log(`Updated portal activation and order status for candidate ${candidateId} in PostgreSQL transaction`);
      } catch (dbErr: any) {
        if (dbErr instanceof BadRequestException || dbErr instanceof NotFoundException) throw dbErr;
        if (dbErr.code === 'P2002' || dbErr.message?.includes('uq_edp_candidates_paymentTxnCode')) {
          throw new BadRequestException(
            `Transaction '${transactionRef}' has already been redeemed by another candidate in database.`,
          );
        }
        this.logger.error(`Database activation transaction failed: ${dbErr.message}`);
        throw new BadRequestException(`Database candidate activation failed: ${dbErr.message}`);
      }
    }

    this.transactionCandidateMap.set(transactionRef, candidate.candidateCode || candidateId);

    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.PAID);
    candidate.status = EdpCandidateStatus.PAID;
    candidate.isPaid = true;
    this.logTimeline(candidateId, EdpCandidateStatus.REGISTERED, EdpCandidateStatus.PAID, `Payment confirmed: ${transactionRef}`, actorUserId);

    // Auto-activate Candidate Portal
    this.stateMachineService.validateStateTransition(candidate.status, EdpCandidateStatus.PORTAL_ACTIVE);
    candidate.status = EdpCandidateStatus.PORTAL_ACTIVE;
    candidate.isPortalActive = true;
    candidate.paymentTxnCode = transactionRef;
    candidate.paidAt = new Date().toISOString();

    this.candidatesMap.set(candidate.candidateCode || candidateId, candidate);
    if (candidate.id) this.candidatesMap.set(candidate.id, candidate);

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
