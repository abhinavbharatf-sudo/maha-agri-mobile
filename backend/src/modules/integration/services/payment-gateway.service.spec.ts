// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// PaymentGatewayService — Regression Test Suite
// Tests: 9 scenarios covering verifyPayment guard, idempotency, webhook immutability
// All tests use Jest mocks only — no real DB, no real Cashfree API calls
// ============================================================================

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { CashfreePaymentAdapter } from '../adapters/payment/cashfree-payment.adapter';

// ─── Mock factories ──────────────────────────────────────────────────────────

function makeMockCashfreeAdapter() {
  return {
    providerName: 'CASHFREE',
    createOrder: jest.fn(),
    verifyPaymentSignature: jest.fn(),
    fetchOrderPayments: jest.fn(),
    initiateRefund: jest.fn(),
    fetchSettlementDetails: jest.fn(),
  } as unknown as jest.Mocked<CashfreePaymentAdapter>;
}

function makeMockRazorpayAdapter() {
  return {
    providerName: 'RAZORPAY',
    createOrder: jest.fn(),
    verifyPaymentSignature: jest.fn(),
    fetchOrderPayments: jest.fn(),
    initiateRefund: jest.fn(),
    fetchSettlementDetails: jest.fn(),
  } as any;
}

function makeMockEdpService() {
  return {
    findCandidate: jest.fn(),
    findCandidateAsync: jest.fn(),
    syncAssessmentCandidate: jest.fn(),
    confirmPaymentAndActivatePortal: jest.fn(),
  } as any;
}

function makeMockPrisma() {
  return {
    integPaymentTxn: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    integPaymentOrder: {
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;
}

function seedOrder(service: PaymentGatewayService, overrides: Record<string, any> = {}) {
  const order = {
    orderId: 'CF_CAND001_1111',
    provider: 'CASHFREE',
    amount: 2068,
    currency: 'INR',
    receipt: 'CAND-001',
    candidateId: null as string | null,
    candidateCode: 'CAND-001',
    paymentSessionId: 'sess_abc',
    paymentLink: 'https://payments-test.cashfree.com/order/abc',
    environment: 'SANDBOX',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
  (service as any).orderStore.set(order.orderId, order);
  return order;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('PaymentGatewayService.verifyPayment()', () => {
  let service: PaymentGatewayService;
  let mockCashfree: ReturnType<typeof makeMockCashfreeAdapter>;
  let mockRazorpay: ReturnType<typeof makeMockRazorpayAdapter>;
  let mockEdp: ReturnType<typeof makeMockEdpService>;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_PROVIDER = 'CASHFREE';
    mockCashfree = makeMockCashfreeAdapter();
    mockRazorpay = makeMockRazorpayAdapter();
    mockEdp = makeMockEdpService();
    mockPrisma = makeMockPrisma();
    service = new PaymentGatewayService(mockRazorpay, mockCashfree, mockEdp, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── T1 ───────────────────────────────────────────────────────────────────
  it('T1: should throw BadRequestException and write NOTHING when candidate not in DB', async () => {
    seedOrder(service);
    mockCashfree.verifyPaymentSignature.mockResolvedValue(true);
    mockEdp.findCandidateAsync.mockResolvedValue(null);

    await expect(
      service.verifyPayment({ orderId: 'CF_CAND001_1111', paymentId: 'PAY_001', candidateId: 'CAND-001' }),
    ).rejects.toThrow(BadRequestException);

    // Critical: no DB writes on missing candidate
    expect(mockPrisma.integPaymentTxn.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.integPaymentOrder.updateMany).not.toHaveBeenCalled();
    expect(mockEdp.confirmPaymentAndActivatePortal).not.toHaveBeenCalled();
  });

  // ─── T2 ───────────────────────────────────────────────────────────────────
  it('T2: BadRequestException message should instruct caller to register candidate first', async () => {
    // Seed an order whose candidateCode matches the client candidateId so the
    // override-rejection guard (line 195) does NOT fire — allowing flow to reach
    // the new candidate-existence guard where the expected message is produced.
    seedOrder(service, { candidateCode: 'CAND-MISSING', receipt: 'CAND-MISSING' });
    mockCashfree.verifyPaymentSignature.mockResolvedValue(true);
    mockEdp.findCandidateAsync.mockResolvedValue(null);

    const call = service.verifyPayment({
      orderId: 'CF_CAND001_1111',
      paymentId: 'PAY_001',
      candidateId: 'CAND-MISSING',
    });

    await expect(call).rejects.toThrow(/Register the candidate and retry/);
    await expect(call).rejects.toThrow(BadRequestException);
  });

  // ─── T3 ───────────────────────────────────────────────────────────────────
  it('T3: should write txn BEFORE calling activate, then return PAID for valid candidate', async () => {
    seedOrder(service);
    mockCashfree.verifyPaymentSignature.mockResolvedValue(true);
    mockEdp.findCandidateAsync.mockResolvedValue({
      id: 'uuid-cand-001',
      candidateCode: 'CAND-001',
      isPaid: false,
      status: 'REGISTERED',
    });
    mockEdp.confirmPaymentAndActivatePortal.mockResolvedValue({ success: true });

    // Track call order across mocks
    const callOrder: string[] = [];
    mockPrisma.integPaymentTxn.upsert.mockImplementation(async () => {
      callOrder.push('txn_upsert');
      return {};
    });
    mockEdp.confirmPaymentAndActivatePortal.mockImplementation(async () => {
      callOrder.push('activate');
      return { success: true };
    });

    const result = await service.verifyPayment({
      orderId: 'CF_CAND001_1111',
      paymentId: 'PAY_001',
      candidateId: 'CAND-001',
    });

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('PAID');

    // txn must be written BEFORE activation
    expect(callOrder).toEqual(['txn_upsert', 'activate']);

    // Activation called with correct args
    expect(mockEdp.confirmPaymentAndActivatePortal).toHaveBeenCalledWith(
      'CAND-001', 'PAY_001', 'CASHFREE_GATEWAY',
    );

    // integ_payment_txns upsert called with SUCCESS status
    expect(mockPrisma.integPaymentTxn.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'SUCCESS', amount: 2068, currency: 'INR' }),
      }),
    );

    // integPaymentOrder.updateMany must NOT be called from verifyPayment —
    // it is handled atomically by confirmPaymentAndActivatePortal's $transaction
    expect(mockPrisma.integPaymentOrder.updateMany).not.toHaveBeenCalled();
  });

  // ─── T4 ───────────────────────────────────────────────────────────────────
  it('T4: should propagate BadRequestException from activation; txn written, orderStore NOT marked PAID', async () => {
    seedOrder(service);
    mockCashfree.verifyPaymentSignature.mockResolvedValue(true);
    mockEdp.findCandidateAsync.mockResolvedValue({
      id: 'uuid-cand-001',
      candidateCode: 'CAND-001',
      isPaid: false,
    });
    mockEdp.confirmPaymentAndActivatePortal.mockRejectedValue(
      new BadRequestException('State machine: invalid transition'),
    );

    await expect(
      service.verifyPayment({ orderId: 'CF_CAND001_1111', paymentId: 'PAY_001', candidateId: 'CAND-001' }),
    ).rejects.toThrow(BadRequestException);

    // txn WAS written — it is durable proof of payment needed for retry
    expect(mockPrisma.integPaymentTxn.upsert).toHaveBeenCalled();

    // In-memory orderStore must NOT be updated to PAID when activation threw
    // (the activation's own $transaction rolled back the DB update too)
    expect((service as any).orderStore.get('CF_CAND001_1111').status).toBe('ACTIVE');
  });

  // ─── T5 ───────────────────────────────────────────────────────────────────
  it('T5: should return idempotent response without re-verifying when order already PAID in orderStore', async () => {
    seedOrder(service, { status: 'PAID', paymentId: 'PAY_001' });

    const result = await service.verifyPayment({ orderId: 'CF_CAND001_1111' });

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/idempotent/i);

    // Nothing should be called — early return at line 214
    expect(mockCashfree.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(mockEdp.findCandidateAsync).not.toHaveBeenCalled();
    expect(mockPrisma.integPaymentTxn.upsert).not.toHaveBeenCalled();
    expect(mockEdp.confirmPaymentAndActivatePortal).not.toHaveBeenCalled();
  });

  // ─── T6 ───────────────────────────────────────────────────────────────────
  it('T6: should throw BadRequestException and write nothing when signature is invalid', async () => {
    seedOrder(service);
    mockCashfree.verifyPaymentSignature.mockResolvedValue(false);

    await expect(
      service.verifyPayment({ orderId: 'CF_CAND001_1111', signature: 'bad-sig', candidateId: 'CAND-001' }),
    ).rejects.toThrow(BadRequestException);

    // Guard fires before candidate lookup — nothing written
    expect(mockEdp.findCandidateAsync).not.toHaveBeenCalled();
    expect(mockPrisma.integPaymentTxn.upsert).not.toHaveBeenCalled();
    expect(mockEdp.confirmPaymentAndActivatePortal).not.toHaveBeenCalled();
  });

  // ─── T7 ───────────────────────────────────────────────────────────────────
  it('T7: should reject candidateId override that differs from persisted order binding', async () => {
    // Order has REAL-CAND bound; attacker tries ATTACKER-CAND
    seedOrder(service, { candidateCode: 'REAL-CAND', receipt: 'REAL-CAND' });

    await expect(
      service.verifyPayment({ orderId: 'CF_CAND001_1111', candidateId: 'ATTACKER-CAND' }),
    ).rejects.toThrow(/Override rejected/);

    // Rejection must happen before signature check
    expect(mockCashfree.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(mockEdp.findCandidateAsync).not.toHaveBeenCalled();
  });
});

describe('PaymentGatewayService.handleWebhook()', () => {
  let service: PaymentGatewayService;
  let mockCashfree: ReturnType<typeof makeMockCashfreeAdapter>;
  let mockRazorpay: ReturnType<typeof makeMockRazorpayAdapter>;
  let mockEdp: ReturnType<typeof makeMockEdpService>;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  const validWebhookPayload = {
    data: {
      order: {
        order_id: 'CF_CAND001_1111',
        order_amount: 2068,
        order_currency: 'INR',
        order_status: 'PAID',
      },
      payment: {
        cf_payment_id: 'CFPAY_001',
        payment_status: 'SUCCESS',
      },
    },
  };

  const mockHeaders = { 'x-webhook-signature': 'valid-sig', 'x-webhook-timestamp': '9999999999' };
  const mockRawBody = Buffer.from(JSON.stringify(validWebhookPayload));

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_PROVIDER = 'CASHFREE';
    mockCashfree = makeMockCashfreeAdapter();
    mockRazorpay = makeMockRazorpayAdapter();
    mockEdp = makeMockEdpService();
    mockPrisma = makeMockPrisma();
    service = new PaymentGatewayService(mockRazorpay, mockCashfree, mockEdp, mockPrisma);

    // Webhook HMAC validation: returns true for all webhook tests
    mockCashfree.verifyPaymentSignature.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── T8 ───────────────────────────────────────────────────────────────────
  it('T8: should return idempotent response without re-activating on duplicate SUCCESS webhook', async () => {
    // Simulate: txn already SUCCESS in DB (immutability guard at line 495)
    mockPrisma.integPaymentTxn.findUnique.mockResolvedValue({
      txnCode: 'CFPAY_001',
      status: 'SUCCESS',
      amount: 2068,
    });

    const result = await service.handleWebhook(validWebhookPayload, mockHeaders, mockRawBody);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/already verified SUCCESS/i);

    // Must NOT re-activate or re-write
    expect(mockEdp.confirmPaymentAndActivatePortal).not.toHaveBeenCalled();
    expect(mockPrisma.integPaymentTxn.upsert).not.toHaveBeenCalled();
  });

  // ─── T9 ───────────────────────────────────────────────────────────────────
  it('T9: should not downgrade SUCCESS transaction when late FAILED webhook arrives', async () => {
    // Simulate: txn already SUCCESS; incoming webhook says FAILED
    mockPrisma.integPaymentTxn.findUnique.mockResolvedValue({
      txnCode: 'CFPAY_001',
      status: 'SUCCESS',
      amount: 2068,
    });

    const lateFailedPayload = {
      data: {
        order: {
          order_id: 'CF_CAND001_1111',
          order_amount: 2068,
          order_currency: 'INR',
          order_status: 'FAILED',
        },
        payment: {
          cf_payment_id: 'CFPAY_001',
          payment_status: 'FAILED',
        },
      },
    };

    const result = await service.handleWebhook(lateFailedPayload, mockHeaders, mockRawBody);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/already verified SUCCESS/i);

    // Immutability: no overwrite of SUCCESS txn
    expect(mockPrisma.integPaymentTxn.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.integPaymentOrder.updateMany).not.toHaveBeenCalled();
    expect(mockEdp.confirmPaymentAndActivatePortal).not.toHaveBeenCalled();
  });
});
