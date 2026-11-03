import { Module } from '@nestjs/common';
import { RazorpayPaymentAdapter } from './adapters/payment/razorpay-payment.adapter';
import { CashfreePaymentAdapter } from './adapters/payment/cashfree-payment.adapter';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { PaymentIntegrationController } from './controllers/payment-integration.controller';
import { RmsPaymentService } from './services/rms-payment.service';
import { RmsPaymentController } from './controllers/rms-payment.controller';
import { EdpModule } from '../edp/edp.module';
import { PlatformCoreModule } from '../platform/platform-core.module';

@Module({
  imports: [EdpModule, PlatformCoreModule],
  controllers: [PaymentIntegrationController, RmsPaymentController],
  providers: [RazorpayPaymentAdapter, CashfreePaymentAdapter, PaymentGatewayService, RmsPaymentService],
  exports: [PaymentGatewayService, CashfreePaymentAdapter, RmsPaymentService],
})
export class PaymentIntegrationModule {}
