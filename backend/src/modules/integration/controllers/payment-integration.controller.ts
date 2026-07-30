// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: Payment Integration Controller (/api/v1/integration/payment)
// ============================================================================

import { Controller, Post, Get, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentGatewayService } from '../services/payment-gateway.service';

export class CreatePaymentOrderDto {
  amount!: number;
  receipt!: string;
}

export class VerifyPaymentDto {
  orderId!: string;
  paymentId!: string;
  signature!: string;
}

export class RefundRequestDto {
  paymentId!: string;
  amount!: number;
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

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(body);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.paymentService.handleWebhook(body);
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
