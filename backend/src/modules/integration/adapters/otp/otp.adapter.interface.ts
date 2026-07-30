// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 1: OTP Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export interface OtpSendResult {
  success: boolean;
  providerName: string;
  transactionId: string;
  recipientMobile: string;
  expiresInSeconds: number;
  message?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  isValid: boolean;
  message: string;
}

export interface IOtpProviderAdapter {
  readonly providerName: string;

  sendOtp(mobileNumber: string, otp: string): Promise<OtpSendResult>;
  verifyOtp(mobileNumber: string, userProvidedOtp: string): Promise<OtpVerifyResult>;
}
