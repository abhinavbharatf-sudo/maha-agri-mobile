// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 1: OTP Controller (/api/v1/integration/otp)
// ============================================================================

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpVerificationService } from '../services/otp-verification.service';

export class SendOtpDto {
  mobileNumber!: string;
}

export class VerifyOtpDto {
  mobileNumber!: string;
  userOtp!: string;
}

@Controller('api/v1/integration/otp')
export class OtpIntegrationController {
  constructor(private readonly otpService: OtpVerificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    return this.otpService.requestOtp(body.mobileNumber);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.otpService.verifyOtp(body.mobileNumber, body.userOtp);
  }
}
