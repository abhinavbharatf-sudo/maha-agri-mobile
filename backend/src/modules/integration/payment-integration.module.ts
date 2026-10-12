import { Module } from '@nestjs/common';
import { RazorpayPaymentAdapter } from './adapters/payment/razorpay-payment.adapter';
import { CashfreePaymentAdapter } from './adapters/payment/cashfree-payment.adapter';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { PaymentIntegrationController } from './controllers/payment-integration.controller';
import { EdpModule } from '../edp/edp.module';
import { PlatformCoreModule } from '../platform/platform-core.module';

@Module({
  imports: [EdpModule, PlatformCoreModule],
  controllers: [PaymentIntegrationController],
  providers: [RazorpayPaymentAdapter, CashfreePaymentAdapter, PaymentGatewayService],
  exports: [PaymentGatewayService, CashfreePaymentAdapter],
})
export class PaymentIntegrationModule {}
