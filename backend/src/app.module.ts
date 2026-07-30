// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// NestJS Master Application Module Assembly (15 Enterprise Modules)
// ConfigModule is globally configured for loading backend environment variables
// ============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './modules/identity/identity.module';
import { MasterDataModule } from './modules/master/master.module';
import { FarmerModule } from './modules/farmer/farmer.module';
import { SoilModule } from './modules/soil/soil.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { EntrepreneurModule } from './modules/entrepreneur/entrepreneur.module';
import { DroneModule } from './modules/drone/drone.module';
import { EdpModule } from './modules/edp/edp.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DocumentModule } from './modules/document/document.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GisModule } from './modules/gis/gis.module';
import { OtpIntegrationModule } from './modules/integration/otp-integration.module';
import { PaymentIntegrationModule } from './modules/integration/payment-integration.module';
import { NotificationIntegrationModule } from './modules/integration/notification-integration.module';
import { DocumentIntegrationModule } from './modules/integration/document-integration.module';
import { EventBusIntegrationModule } from './modules/integration/eventbus-integration.module';
import { SchedulerIntegrationModule } from './modules/integration/scheduler-integration.module';
import { GisIntegrationModule } from './modules/integration/gis-integration.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformCoreModule } from './modules/platform/platform-core.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { OpsExcellenceModule } from './modules/ops/ops.module';
import { ScaleModule } from './modules/scale/scale.module';
import { SecurityAssuranceModule } from './modules/security/security.module';
import { EnterpriseIntegrationModule } from './modules/integration/enterprise-integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    IdentityModule,
    MasterDataModule,
    FarmerModule,
    SoilModule,
    LaboratoryModule,
    EntrepreneurModule,
    DroneModule,
    EdpModule,
    FinanceModule,
    WorkflowModule,
    NotificationModule,
    DocumentModule,
    AuditModule,
    AnalyticsModule,
    GisModule,
    OtpIntegrationModule,
    PaymentIntegrationModule,
    NotificationIntegrationModule,
    DocumentIntegrationModule,
    EventBusIntegrationModule,
    SchedulerIntegrationModule,
    GisIntegrationModule,
    HealthModule,
    PlatformCoreModule,
    WorkforceModule,
    OpsExcellenceModule,
    ScaleModule,
    SecurityAssuranceModule,
    EnterpriseIntegrationModule,
  ],
})
export class AppModule {}
