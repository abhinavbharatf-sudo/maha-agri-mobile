// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 2 - Payment Gateway & Razorpay Tests
// ============================================================================

import { RazorpayPaymentAdapter } from '../src/modules/integration/adapters/payment/razorpay-payment.adapter';
import { PaymentGatewayService } from '../src/modules/integration/services/payment-gateway.service';

describe('PaymentGatewayService (Razorpay Adapter Test)', () => {
  let adapter: RazorpayPaymentAdapter;
  let paymentService: PaymentGatewayService;

  beforeEach(() => {
    adapter = new RazorpayPaymentAdapter();
    paymentService = new PaymentGatewayService(adapter);
  });

  it('should create Razorpay payment order', async () => {
    const res = await paymentService.createOrder({ amount: 500, receipt: 'rcpt_soil_001' });
    expect(res.success).toBe(true);
    expect(res.data.amount).toBe(500);
    expect(res.data.orderId).toContain('order_rzp_');
  });

  it('should verify payment signature successfully', async () => {
    const orderRes = await paymentService.createOrder({ amount: 500, receipt: 'rcpt_soil_001' });
    const orderId = orderRes.data.orderId;

    const verifyRes = await paymentService.verifyPayment({
      orderId,
      paymentId: 'pay_rzp_999',
      signature: 'sig_test_valid',
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.data.status).toBe('PAID');
  });

  it('should prevent duplicate order creation using Idempotency Key', async () => {
    const key = 'idempotent_key_123';
    const firstCall = await paymentService.createOrder({ amount: 500, receipt: 'rcpt_soil_001', idempotencyKey: key });
    const secondCall = await paymentService.createOrder({ amount: 500, receipt: 'rcpt_soil_001', idempotencyKey: key });

    expect(firstCall.data.orderId).toBe(secondCall.data.orderId);
  });
});
