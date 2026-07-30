// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: Payment Integration Module Assembly
// ============================================================================

import { Module } from '@nestjs/common';
import { RazorpayPaymentAdapter } from './adapters/payment/razorpay-payment.adapter';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { PaymentIntegrationController } from './controllers/payment-integration.controller';

@Module({
  controllers: [PaymentIntegrationController],
  providers: [RazorpayPaymentAdapter, PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentIntegrationModule {}
