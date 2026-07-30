// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Production Sprint 3: MAHA-AGRIDOOT Workforce Operations Lifecycle Controller
// Endpoints for Recruitment, Digital ID Card, GPS Attendance, Tasks & Transfers
// ============================================================================

import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkforceLifecycleService } from '../services/workforce-lifecycle.service';

export class ApplyWorkforceDto {
  fullName!: string;
  mobileNumber!: string;
  aadhaarHash!: string;
  districtId!: string;
  talukaId!: string;
  assignedVillage!: string;
  createdBy!: string;
}

export class AppointAndIssueCardDto {
  actorUserId!: string;
}

export class LogAttendanceDto {
  profileId!: string;
  gpsLatitude!: number;
  gpsLongitude!: number;
}

export class TransferPostingDto {
  profileId!: string;
  toDistrictId!: string;
  toTalukaId!: string;
  reason!: string;
  approvedByUserId!: string;
}

@Controller('api/v1/workforce')
export class WorkforceLifecycleController {
  constructor(private readonly workforceLifecycleService: WorkforceLifecycleService) {}

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  async applyRecruitment(@Body() body: ApplyWorkforceDto) {
    return this.workforceLifecycleService.applyRecruitment(body);
  }

  @Post('profiles/:id/appoint-and-issue-card')
  @HttpCode(HttpStatus.OK)
  async appointAndIssueIdentityCard(@Param('id') profileId: string, @Body() body: AppointAndIssueCardDto) {
    return this.workforceLifecycleService.appointAndIssueIdentityCard(profileId, body.actorUserId);
  }

  @Post('attendance')
  @HttpCode(HttpStatus.CREATED)
  async logFieldAttendance(@Body() body: LogAttendanceDto) {
    return this.workforceLifecycleService.logFieldAttendance(body);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transferPosting(@Body() body: TransferPostingDto) {
    return this.workforceLifecycleService.transferPosting(body);
  }

  @Get('profiles/:id/timeline')
  async getWorkforceTimeline(@Param('id') profileId: string) {
    return this.workforceLifecycleService.getWorkforceTimeline(profileId);
  }
}
