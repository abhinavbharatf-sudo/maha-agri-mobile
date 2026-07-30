// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 1 - OTP & Authentication Tests
// ============================================================================

import { OtpVerificationService } from '../src/modules/integration/services/otp-verification.service';
import { WhatsAppOtpAdapter } from '../src/modules/integration/adapters/otp/whatsapp-otp.adapter';
import { SmsOtpAdapter } from '../src/modules/integration/adapters/otp/sms-otp.adapter';

describe('OtpVerificationService (Unit & Integration Test)', () => {
  let otpService: OtpVerificationService;
  let whatsappAdapter: WhatsAppOtpAdapter;
  let smsAdapter: SmsOtpAdapter;

  beforeEach(() => {
    whatsappAdapter = new WhatsAppOtpAdapter();
    smsAdapter = new SmsOtpAdapter();
    otpService = new OtpVerificationService(whatsappAdapter, smsAdapter);
  });

  it('should generate and send 6-digit OTP via WhatsApp provider', async () => {
    const res = await otpService.requestOtp('9876543210');
    expect(res.success).toBe(true);
    expect(res.data.provider).toBe('WHATSAPP_BUSINESS_API');
    expect(res.data.recipientMobile).toBe('9876543210');
    expect(res.data.demoOtp).toHaveLength(6);
  });

  it('should successfully verify valid OTP', async () => {
    const requestRes = await otpService.requestOtp('9876543210');
    const validOtp = requestRes.data.demoOtp!;

    const verifyRes = await otpService.verifyOtp('9876543210', validOtp);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.message).toBe('OTP verified successfully');
  });

  it('should reject invalid OTP with error message', async () => {
    await otpService.requestOtp('9876543210');
    await expect(otpService.verifyOtp('9876543210', '000000')).rejects.toThrow('Invalid OTP');
  });
});
