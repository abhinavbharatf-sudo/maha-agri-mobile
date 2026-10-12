// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: Payment Integration Controller (/api/v1/integration/payment)
// ============================================================================

import { Controller, Post, Get, Body, Param, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { PaymentGatewayService } from '../services/payment-gateway.service';

export class CreatePaymentOrderDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsNotEmpty()
  receipt!: string;

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

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  notifyUrl?: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsString()
  @IsOptional()
  candidateId?: string;
}

export class RefundRequestDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

@Controller('api/v1/integration/payment')
export class PaymentIntegrationController {
  constructor(private readonly paymentService: PaymentGatewayService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() body: CreatePaymentOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentService.createOrder({ ...body, idempotencyKey });
  }

  @Get('orders/:id/status')
  async getOrderStatus(@Param('id') id: string) {
    return this.paymentService.getOrderStatus(id);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(body);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : (typeof body === 'string' ? body : JSON.stringify(body));
    return this.paymentService.handleWebhook(body, headers, rawBody);
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  async processRefund(@Body() body: RefundRequestDto) {
    return this.paymentService.processRefund(body);
  }

  @Get('settlements/:id')
  async getSettlement(@Param('id') id: string) {
    return this.paymentService.getSettlement(id);
  }
}
