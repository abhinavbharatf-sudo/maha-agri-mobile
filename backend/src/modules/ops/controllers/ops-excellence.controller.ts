// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase B Operational Excellence Controller (/api/v1/ops)
// Rest Endpoints for Pilot Operations Center, Incident Mgmt, CCB & Feedback
// ============================================================================

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OpsIncidentService, IncidentSeverity } from '../services/ops-incident.service';
import { OpsChangeControlService } from '../services/ops-change-control.service';
import { OpsFeedbackService } from '../services/ops-feedback.service';

export class RegisterIncidentDto {
  title!: string;
  description!: string;
  severity!: IncidentSeverity;
  moduleName!: string;
  districtId?: string;
  reportedByUserId!: string;
}

export class ResolveIncidentDto {
  rootCauseAnalysis!: string;
  resolutionNotes!: string;
  resolverUserId!: string;
}

export class SubmitFeatureRequestDto {
  title!: string;
  description!: string;
  targetRelease?: string;
  requestedByUserId!: string;
}

export class SubmitFeedbackDto {
  userRole!: string;
  rating!: number;
  comments!: string;
  moduleName!: string;
  districtId?: string;
}

@Controller('api/v1/ops')
export class OpsExcellenceController {
  constructor(
    private readonly incidentService: OpsIncidentService,
    private readonly ccbService: OpsChangeControlService,
    private readonly feedbackService: OpsFeedbackService,
  ) {}

  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  async registerIncident(@Body() body: RegisterIncidentDto) {
    return this.incidentService.registerIncident(body);
  }

  @Post('incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveIncident(@Param('id') incidentId: string, @Body() body: ResolveIncidentDto) {
    return this.incidentService.resolveIncident(incidentId, body.rootCauseAnalysis, body.resolutionNotes, body.resolverUserId);
  }

  @Get('incidents')
  async getAllIncidents() {
    return this.incidentService.getAllIncidents();
  }

  @Post('ccb/requests')
  @HttpCode(HttpStatus.CREATED)
  async submitFeatureRequest(@Body() body: SubmitFeatureRequestDto) {
    return this.ccbService.submitFeatureRequest(body);
  }

  @Get('ccb/requests')
  async getCcbBacklog() {
    return this.ccbService.getCcbBacklog();
  }

  @Post('feedbacks')
  @HttpCode(HttpStatus.CREATED)
  async submitUserFeedback(@Body() body: SubmitFeedbackDto) {
    return this.feedbackService.submitUserFeedback(body);
  }

  @Get('feedbacks')
  async getAllFeedbacks() {
    return this.feedbackService.getAllFeedbacks();
  }
}
