// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: RMS Careers Razorpay Payment Controller (/api/v1/integration/rms/payment)
// Dedicated recruitment application fee endpoints separate from EDP lifecycle
// ============================================================================

import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { RmsPaymentService } from '../services/rms-payment.service';

export class CreateRmsOrderDto {
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @IsString()
  @IsOptional()
  candidateId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;
}

export class VerifyRmsPaymentDto {
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @IsString()
  @IsOptional()
  candidateId?: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}

@Controller('api/v1/integration/rms/payment')
export class RmsPaymentController {
  constructor(private readonly rmsPaymentService: RmsPaymentService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() body: CreateRmsOrderDto) {
    return this.rmsPaymentService.createOrder(body);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: VerifyRmsPaymentDto) {
    return this.rmsPaymentService.verifyPayment(body);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : (typeof body === 'string' ? body : JSON.stringify(body));
    return this.rmsPaymentService.handleWebhook(body, headers, rawBody);
  }
}
