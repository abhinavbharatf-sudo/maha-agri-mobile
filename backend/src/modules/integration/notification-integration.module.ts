// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 3: Notification Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { WhatsAppBusinessAdapter } from './adapters/notification/whatsapp-business.adapter';
import { EmailSmtpAdapter } from './adapters/notification/email-smtp.adapter';
import { NotificationEngineService } from './services/notification-engine.service';
import { NotificationIntegrationController } from './controllers/notification-integration.controller';

@Module({
  controllers: [NotificationIntegrationController],
  providers: [WhatsAppBusinessAdapter, EmailSmtpAdapter, NotificationEngineService],
  exports: [NotificationEngineService],
})
export class NotificationIntegrationModule {}
