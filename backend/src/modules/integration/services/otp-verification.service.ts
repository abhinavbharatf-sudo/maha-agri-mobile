// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 1: OTP Verification & Fallback Orchestration Service
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { WhatsAppOtpAdapter } from '../adapters/otp/whatsapp-otp.adapter';
import { SmsOtpAdapter } from '../adapters/otp/sms-otp.adapter';

interface ActiveOtpStore {
  otp: string;
  expiresAt: number;
  attempts: number;
  providerUsed: string;
}

@Injectable()
export class OtpVerificationService {
  private readonly logger = new Logger(OtpVerificationService.name);
  private otpStore = new Map<string, ActiveOtpStore>();

  constructor(
    private readonly whatsAppAdapter: WhatsAppOtpAdapter,
    private readonly smsAdapter: SmsOtpAdapter,
  ) {}

  async requestOtp(mobileNumber: string) {
    // Generate 6-Digit Secure OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 Minutes Validity

    let sendResult;
    try {
      // Primary Attempt: WhatsApp Business API
      sendResult = await this.whatsAppAdapter.sendOtp(mobileNumber, otp);
    } catch (error) {
      this.logger.warn(`WhatsApp OTP failed. Fallback to CDAC SMS Gateway for ${mobileNumber}`);
      // Fallback Attempt: CDAC SMS Gateway
      sendResult = await this.smsAdapter.sendOtp(mobileNumber, otp);
    }

    this.otpStore.set(mobileNumber, {
      otp,
      expiresAt,
      attempts: 0,
      providerUsed: sendResult.providerName,
    });

    return {
      success: true,
      message: `OTP sent successfully via ${sendResult.providerName}`,
      data: {
        recipientMobile: mobileNumber,
        transactionId: sendResult.transactionId,
        provider: sendResult.providerName,
        expiresInSeconds: 300,
        // Demo helper output in non-prod
        demoOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async verifyOtp(mobileNumber: string, userOtp: string) {
    const record = this.otpStore.get(mobileNumber);

    if (!record) {
      throw new BadRequestException('No active OTP request found for this mobile number');
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(mobileNumber);
      throw new BadRequestException('OTP has expired. Please request a new OTP');
    }

    if (record.attempts >= 3) {
      this.otpStore.delete(mobileNumber);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP');
    }

    record.attempts += 1;

    if (record.otp !== userOtp) {
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    // Success - Clear OTP Record
    this.otpStore.delete(mobileNumber);

    return {
      success: true,
      message: 'OTP verified successfully',
      data: {
        mobileNumber,
        verifiedAt: new Date().toISOString(),
        provider: record.providerUsed,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
