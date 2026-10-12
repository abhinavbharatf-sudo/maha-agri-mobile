// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.4.0 Production Readiness)
// Platform Core Module Assembly
// Security Hardening, Tamper Audit Checksums, DR PITR Simulation & Compliance Retention
// ============================================================================

import { Module } from '@nestjs/common';
import { PlatformAuthService } from './services/platform-auth.service';
import { PlatformNotificationService } from './services/platform-notification.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { RoleInheritanceService } from './services/role-inheritance.service';
import { EnterpriseOrganizationService } from './services/enterprise-organization.service';
import { DynamicEnginesService } from './services/dynamic-engines.service';
import { EnterpriseGovernanceService } from './services/enterprise-governance.service';
import { ProductionReadinessService } from './services/production-readiness.service';
import { PrismaService } from './services/prisma.service';
import { PlatformCoreController } from './controllers/platform-core.controller';

@Module({
  controllers: [PlatformCoreController],
  providers: [
    PrismaService,
    PlatformAuthService,
    PlatformNotificationService,
    PlatformAuditService,
    RoleInheritanceService,
    EnterpriseOrganizationService,
    DynamicEnginesService,
    EnterpriseGovernanceService,
    ProductionReadinessService,
  ],
  exports: [
    PrismaService,
    PlatformAuthService,
    PlatformNotificationService,
    PlatformAuditService,
    RoleInheritanceService,
    EnterpriseOrganizationService,
    DynamicEnginesService,
    EnterpriseGovernanceService,
    ProductionReadinessService,
  ],
})
export class PlatformCoreModule {}
