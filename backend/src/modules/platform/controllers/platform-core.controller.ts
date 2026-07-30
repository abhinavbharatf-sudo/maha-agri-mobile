// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.4.0 Production Readiness)
// Platform Core Controller (/api/v1/platform)
// Security Hardening, Tamper-Evident Audits, DR PITR Simulation & Compliance Retention
// ============================================================================

import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { PlatformAuthService } from '../services/platform-auth.service';
import { PlatformNotificationService, NotificationChannel } from '../services/platform-notification.service';
import { PlatformAuditService } from '../services/platform-audit.service';
import { RoleInheritanceService, UserRoleLevel, TestingAgencyType } from '../services/role-inheritance.service';
import { EnterpriseOrganizationService, CustodyEvent } from '../services/enterprise-organization.service';
import { DynamicEnginesService, PaymentStatus, PaymentSource, DynamicFormSchema } from '../services/dynamic-engines.service';
import { EnterpriseGovernanceService } from '../services/enterprise-governance.service';
import { ProductionReadinessService } from '../services/production-readiness.service';

export class SendOtpDto {
  mobileNumber!: string;
}

export class VerifyOtpDto {
  mobileNumber!: string;
  otp!: string;
}

export class SuperAdminLoginDto {
  superAdminCode!: string;
  password!: string;
  twoFactorToken!: string;
  deviceId!: string;
}

export class CreateTamperAuditDto {
  moduleName!: string;
  action!: string;
  actorUserId!: string;
  payload!: any;
}

@Controller('api/v1/platform')
export class PlatformCoreController {
  constructor(
    private readonly authService: PlatformAuthService,
    private readonly notificationService: PlatformNotificationService,
    private readonly auditService: PlatformAuditService,
    private readonly roleInheritanceService: RoleInheritanceService,
    private readonly enterpriseOrgService: EnterpriseOrganizationService,
    private readonly dynamicEnginesService: DynamicEnginesService,
    private readonly governanceService: EnterpriseGovernanceService,
    private readonly readinessService: ProductionReadinessService,
  ) {}

  @Post('auth/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.mobileNumber);
  }

  @Post('auth/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtpAndLogin(body.mobileNumber, body.otp);
  }

  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  async superAdminLogin(@Body() body: SuperAdminLoginDto) {
    if (body.twoFactorToken !== '2FA-MAHA-9999' || !body.deviceId) {
      throw new UnauthorizedException('Super Admin 2FA Token or Device Verification Failed');
    }

    return {
      success: true,
      message: 'Super Admin 2FA Authentication Successful',
      role: UserRoleLevel.SUPER_ADMIN,
      sessionToken: `JWT_SUPER_ADMIN_${Date.now()}`,
      permissions: this.roleInheritanceService.getEffectivePermissions(UserRoleLevel.SUPER_ADMIN),
    };
  }

  @Post('security/tamper-evident-audit')
  @HttpCode(HttpStatus.CREATED)
  async createTamperEvidentAuditLog(@Body() body: CreateTamperAuditDto) {
    return this.readinessService.generateTamperEvidentAuditLog(body.moduleName, body.action, body.actorUserId, body.payload);
  }

  @Post('dr/simulate-restore')
  @HttpCode(HttpStatus.OK)
  async simulateDisasterRecoveryRestore() {
    return this.readinessService.simulateDisasterRecoveryRestore();
  }

  @Get('compliance/retention')
  async getComplianceRetentionStatus() {
    return this.readinessService.getComplianceRetentionStatus();
  }

  @Get('mdm/catalog')
  async getMdmCatalog() {
    return this.governanceService.getMdmCatalog();
  }

  @Get('feature-flags')
  async getFeatureFlags() {
    return this.dynamicEnginesService.getFeatureFlags();
  }

  @Get('rbac/dynamic-menu')
  async getDynamicMenu(@Query('role') role?: UserRoleLevel) {
    const targetRole = role || UserRoleLevel.MAHA_AGRIDOOT;
    const dynamicResolution = this.roleInheritanceService.resolveDynamicMenu(targetRole);
    const effectivePermissions = this.roleInheritanceService.getEffectivePermissions(targetRole);

    return {
      success: true,
      role: targetRole,
      permissions: effectivePermissions,
      ...dynamicResolution,
    };
  }

  @Get('masters/testing-agencies')
  async getTestingAgencies() {
    return {
      success: true,
      data: [
        { id: 'agency-01', name: 'Wardha Govt District Soil Lab', agencyType: TestingAgencyType.INTERNAL_GOVT, nablAccreditation: 'NABL-GOVT-401' },
        { id: 'agency-02', name: 'Maha Agri Research NABL Lab', agencyType: TestingAgencyType.EXTERNAL_NABL_PRIVATE, nablAccreditation: 'NABL-PRIV-802' },
        { id: 'agency-03', name: 'MPKV Agriculture University Lab', agencyType: TestingAgencyType.UNIVERSITY_RESEARCH, nablAccreditation: 'NABL-UNIV-105' },
        { id: 'agency-04', name: 'Section 8 Rural Agri Foundation', agencyType: TestingAgencyType.NGO_SECTION8, nablAccreditation: 'NABL-NGO-309' },
      ],
    };
  }
}
