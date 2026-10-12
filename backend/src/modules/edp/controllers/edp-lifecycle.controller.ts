// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Production Sprint 2: EDP Agri Drone Module Lifecycle Controller
// Endpoints for Candidate Reg, Workshop Allocation, Certificates, Drone Bookings & Loans
// ============================================================================

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { EdpLifecycleService } from '../services/edp-lifecycle.service';

export class SyncAssessmentCandidateDto {
  @IsString()
  @IsNotEmpty()
  candidateId!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber!: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsString()
  @IsOptional()
  talukaId?: string;
}

export class CreateEdpLeadDto {
  fullName!: string;
  mobileNumber!: string;
  districtId!: string;
  talukaId!: string;
  source!: string;
  agridootUserId?: string;
  createdBy!: string;
}

export class RegisterEdpCandidateDto {
  leadId!: string;
  createdBy!: string;
}

export class ActivatePortalDto {
  transactionRef!: string;
  actorUserId!: string;
}

export class SelectCareerTrackDto {
  chosenTrack!: string;
  actorUserId!: string;
}

export class BookDroneDto {
  candidateId!: string;
  droneModel!: string;
  totalPrice!: number;
  bookingAmount!: number;
  actorUserId!: string;
}

export class ApplyLoanDto {
  candidateId!: string;
  bookingId!: string;
  bankName!: string;
  requestedAmount!: number;
  actorUserId!: string;
}

export class ActivatePartnerDto {
  actorUserId!: string;
}

@Controller('api/v1/edp')
export class EdpLifecycleController {
  constructor(private readonly edpLifecycleService: EdpLifecycleService) {}

  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  async createLead(@Body() body: CreateEdpLeadDto) {
    return this.edpLifecycleService.createLead(body);
  }

  @Post('candidates/sync-assessment')
  @HttpCode(HttpStatus.OK)
  async syncAssessmentCandidate(@Body() body: SyncAssessmentCandidateDto) {
    return this.edpLifecycleService.syncAssessmentCandidate(body);
  }

  @Post('candidates/register')
  @HttpCode(HttpStatus.CREATED)
  async registerCandidate(@Body() body: RegisterEdpCandidateDto) {
    return this.edpLifecycleService.registerCandidate(body);
  }

  @Post('candidates/:id/activate-portal')
  @HttpCode(HttpStatus.OK)
  async activatePortal(@Param('id') candidateId: string, @Body() body: ActivatePortalDto) {
    const actor = (body.actorUserId === 'CASHFREE_GATEWAY' || body.actorUserId === 'CASHFREE_WEBHOOK')
      ? 'EXTERNAL_API_CLIENT'
      : (body.actorUserId || 'EXTERNAL_API_CLIENT');
    return this.edpLifecycleService.confirmPaymentAndActivatePortal(candidateId, body.transactionRef, actor);
  }

  @Post('candidates/:id/select-career')
  @HttpCode(HttpStatus.OK)
  async selectCareerTrack(@Param('id') candidateId: string, @Body() body: SelectCareerTrackDto) {
    return this.edpLifecycleService.selectCareerTrack(candidateId, body.chosenTrack, body.actorUserId);
  }

  @Post('drone-bookings')
  @HttpCode(HttpStatus.CREATED)
  async bookDrone(@Body() body: BookDroneDto) {
    return this.edpLifecycleService.bookDrone(body.candidateId, body.droneModel, body.totalPrice, body.bookingAmount, body.actorUserId);
  }

  @Post('loans')
  @HttpCode(HttpStatus.CREATED)
  async applyLoan(@Body() body: ApplyLoanDto) {
    return this.edpLifecycleService.applyLoan(body.candidateId, body.bookingId, body.bankName, body.requestedAmount, body.actorUserId);
  }

  @Post('candidates/:id/activate-partner')
  @HttpCode(HttpStatus.OK)
  async activatePartner(@Param('id') candidateId: string, @Body() body: ActivatePartnerDto) {
    return this.edpLifecycleService.activatePartner(candidateId, body.actorUserId);
  }

  @Get('candidates/:id/timeline')
  async getCandidateTimeline(@Param('id') candidateId: string) {
    return this.edpLifecycleService.getCandidateTimeline(candidateId);
  }
}
