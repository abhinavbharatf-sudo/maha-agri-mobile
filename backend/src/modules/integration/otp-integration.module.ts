// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 1: OTP Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { WhatsAppOtpAdapter } from './adapters/otp/whatsapp-otp.adapter';
import { SmsOtpAdapter } from './adapters/otp/sms-otp.adapter';
import { OtpVerificationService } from './services/otp-verification.service';
import { OtpIntegrationController } from './controllers/otp-integration.controller';

@Module({
  controllers: [OtpIntegrationController],
  providers: [WhatsAppOtpAdapter, SmsOtpAdapter, OtpVerificationService],
  exports: [OtpVerificationService],
})
export class OtpIntegrationModule {}
