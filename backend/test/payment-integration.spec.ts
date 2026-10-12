// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 2 - Payment Gateway, Webhooks & Cashfree Tests
// Comprehensive verification of Webhooks, Authoritative Checks, Idempotency & Persistence
// ============================================================================

import * as crypto from 'crypto';
import { RazorpayPaymentAdapter } from '../src/modules/integration/adapters/payment/razorpay-payment.adapter';
import { CashfreePaymentAdapter } from '../src/modules/integration/adapters/payment/cashfree-payment.adapter';
import { PaymentGatewayService } from '../src/modules/integration/services/payment-gateway.service';
import { EdpLifecycleService } from '../src/modules/edp/services/edp-lifecycle.service';
import { EdpStateMachineService } from '../src/modules/edp/services/edp-state-machine.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('PaymentGatewayService Enterprise Test Suite', () => {
  const TEST_SECRET = 'cf_secret_key_mock_test_secure_123';
  let razorpayAdapter: RazorpayPaymentAdapter;
  let cashfreeAdapter: CashfreePaymentAdapter;
  let stateMachineService: EdpStateMachineService;
  let edpLifecycleService: EdpLifecycleService;
  let mockPrisma: any;
  let paymentService: PaymentGatewayService;

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_PROVIDER = 'CASHFREE';
    process.env.CASHFREE_APP_ID = 'cf_test_app_id_999';
    process.env.CASHFREE_SECRET_KEY = TEST_SECRET;
    process.env.CASHFREE_ENVIRONMENT = 'SANDBOX';
    process.env.EDP_TRAINING_FEE_INR = '2068';

    razorpayAdapter = new RazorpayPaymentAdapter();
    cashfreeAdapter = new CashfreePaymentAdapter();
    stateMachineService = new EdpStateMachineService();

    const txnsStore = new Map<string, any>();
    const ordersStore = new Map<string, any>();
    mockPrisma = {
      $transaction: jest.fn().mockImplementation((fn: any) => {
        if (typeof fn === 'function') {
          return fn(mockPrisma);
        }
        return Promise.all(fn);
      }),
      edpCandidate: {
        upsert: jest.fn().mockImplementation((args: any) => {
          return Promise.resolve({
            id: 'cand-uuid-1',
            candidateCode: args.where?.candidateCode || 'CAND-001',
            fullName: args.create?.fullName || 'Test Candidate',
            mobileNumber: args.create?.mobileNumber || '9000000001',
            isPaid: false,
            isPortalActive: false,
            status: 'REGISTERED',
            createdAt: new Date(),
          });
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      integPaymentOrder: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const record = {
            id: 'ord-uuid-' + Date.now(),
            orderCode: args.where.orderCode,
            candidateId: args.create?.candidateId,
            candidateCode: args.create?.candidateCode,
            gatewayName: args.create?.gatewayName ?? 'CASHFREE',
            amount: args.create?.amount ?? 2068,
            currency: args.create?.currency ?? 'INR',
            status: args.create?.status ?? 'ACTIVE',
            paymentSessionId: args.create?.paymentSessionId,
            paymentLink: args.create?.paymentLink,
            createdAt: new Date(),
          };
          ordersStore.set(args.where.orderCode, record);
          return Promise.resolve(record);
        }),
        findUnique: jest.fn().mockImplementation((args: any) => {
          return Promise.resolve(ordersStore.get(args.where?.orderCode) || null);
        }),
        updateMany: jest.fn().mockImplementation((args: any) => {
          const rec = ordersStore.get(args.where?.orderCode);
          if (rec) {
            Object.assign(rec, args.data);
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        }),
      },
      integPaymentTxn: {
        upsert: jest.fn().mockImplementation((args: any) => {
          const existing = txnsStore.get(args.where.txnCode);
          const record = {
            id: existing?.id || 'txn-uuid-' + Date.now(),
            txnCode: args.where.txnCode,
            orderCode: args.create?.orderCode ?? existing?.orderCode,
            candidateId: args.create?.candidateId ?? existing?.candidateId,
            candidateCode: args.create?.candidateCode ?? existing?.candidateCode,
            amount: args.create?.amount ?? existing?.amount ?? 2068,
            status: args.create?.status ?? args.update?.status ?? existing?.status ?? 'SUCCESS',
            currency: args.create?.currency ?? existing?.currency ?? 'INR',
            gatewayName: args.create?.gatewayName ?? existing?.gatewayName ?? 'CASHFREE',
          };
          txnsStore.set(args.where.txnCode, record);
          return Promise.resolve(record);
        }),
        findUnique: jest.fn().mockImplementation((args: any) => {
          return Promise.resolve(txnsStore.get(args.where?.txnCode) || null);
        }),
      },
    };

    edpLifecycleService = new EdpLifecycleService(stateMachineService, mockPrisma);
    paymentService = new PaymentGatewayService(
      razorpayAdapter,
      cashfreeAdapter,
      edpLifecycleService,
      mockPrisma,
    );
  });

  // --------------------------------------------------------------------------
  // 1. Razorpay Legacy Adapter Tests (Backward Compatibility)
  // --------------------------------------------------------------------------
  describe('Razorpay Legacy Flow', () => {
    beforeEach(() => {
      process.env.PAYMENT_GATEWAY_PROVIDER = 'RAZORPAY';
    });

    it('should create Razorpay payment order', async () => {
      const res = await paymentService.createOrder({ amount: 500, receipt: 'rcpt_soil_001' });
      expect(res.success).toBe(true);
      expect(res.data.amount).toBe(500);
      expect(res.data.orderId).toContain('order_rzp_');
    });

    it('should verify Razorpay payment signature successfully', async () => {
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

  // --------------------------------------------------------------------------
  // 2. Cashfree Primary Gateway & EDP Strict Fee Enforcement (₹2,068)
  // --------------------------------------------------------------------------
  describe('Cashfree Primary Gateway & Fee Enforcement', () => {
    beforeEach(() => {
      process.env.PAYMENT_GATEWAY_PROVIDER = 'CASHFREE';
    });

    it('should enforce exact ₹2,068 fee even if client passes a different amount', async () => {
      // Mock createOrder on Cashfree adapter to avoid real network call in unit test
      jest.spyOn(cashfreeAdapter, 'createOrder').mockResolvedValueOnce({
        success: true,
        providerName: 'CASHFREE',
        orderId: 'CF_TEST_1001',
        amount: 2068,
        currency: 'INR',
        receipt: 'MAHA-AGRI-EDP-1001',
        status: 'ACTIVE',
        paymentSessionId: 'session_mock_123',
        paymentLink: 'https://payments-test.cashfree.com/order/#session_mock_123',
        environment: 'SANDBOX',
      });

      const res = await paymentService.createOrder({
        amount: 1000, // Client tries to send 1000
        receipt: 'MAHA-AGRI-EDP-1001',
        candidateId: 'MAHA-AGRI-EDP-1001',
        customerName: 'Ashok Rao',
        customerPhone: '9876543210',
      });

      expect(res.success).toBe(true);
      expect(res.data.amount).toBe(2068);
      expect(cashfreeAdapter.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2068, currency: 'INR' }),
      );
    });

    it('should reject order creation if candidate has already paid (Double-Payment Protection)', async () => {
      // Pre-register and mark candidate as paid
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: 'MAHA-AGRI-EDP-PAID-01',
        fullName: 'Sunita Patil',
        mobileNumber: '9876543211',
      });
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: 'PAY_TXN_EXISTING_99' },
        create: { txnCode: 'PAY_TXN_EXISTING_99', amount: 2068, status: 'SUCCESS' },
      });
      await edpLifecycleService.confirmPaymentAndActivatePortal(
        'MAHA-AGRI-EDP-PAID-01',
        'PAY_TXN_EXISTING_99',
        'ADMIN',
      );

      // Attempt to initiate another order for the already-paid candidate
      await expect(
        paymentService.createOrder({
          receipt: 'MAHA-AGRI-EDP-PAID-01',
          candidateId: 'MAHA-AGRI-EDP-PAID-01',
          customerName: 'Sunita Patil',
          customerPhone: '9876543211',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow payment retry for candidate whose payment is not yet confirmed', async () => {
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: 'MAHA-AGRI-EDP-RETRY-01',
        fullName: 'Kiran Shinde',
        mobileNumber: '9876543212',
      });

      jest.spyOn(cashfreeAdapter, 'createOrder').mockResolvedValueOnce({
        success: true,
        providerName: 'CASHFREE',
        orderId: 'CF_RETRY_001',
        amount: 2068,
        currency: 'INR',
        receipt: 'MAHA-AGRI-EDP-RETRY-01',
        status: 'ACTIVE',
        paymentSessionId: 'sess_retry_1',
        paymentLink: 'https://payments-test.cashfree.com/order/#sess_retry_1',
      });

      const res = await paymentService.createOrder({
        receipt: 'MAHA-AGRI-EDP-RETRY-01',
        candidateId: 'MAHA-AGRI-EDP-RETRY-01',
      });

      expect(res.success).toBe(true);
      expect(res.data.orderId).toBe('CF_RETRY_001');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Cashfree Webhook Security & Signature Verification
  // --------------------------------------------------------------------------
  describe('Cashfree Webhook Security & Verification', () => {
    const candidateId = 'MAHA-AGRI-EDP-WH-01';

    beforeEach(async () => {
      process.env.PAYMENT_GATEWAY_PROVIDER = 'CASHFREE';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId,
        fullName: 'Vikas Jadhav',
        mobileNumber: '9876543213',
      });
    });

    function generateSignature(timestamp: string, rawBody: string, secret: string = TEST_SECRET): string {
      return crypto.createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64');
    }

    it('should REJECT webhook when HMAC signature is forged or invalid (UnauthorizedException)', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_FORGED_1', order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 998877 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': 'forged_fake_signature_abc_123',
            'x-webhook-timestamp': timestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Verify portal was NOT activated
      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).not.toBe('PORTAL_ACTIVE');
    });

    it('should REJECT webhook when signature headers are missing', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_FORGED_2', order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
        },
      };

      await expect(
        paymentService.handleWebhook(payload, {}, JSON.stringify(payload)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT webhook when timestamp is stale (> 300 seconds in past) (Replay Attack)', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_STALE_1', order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 111222 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const staleTimestamp = (Date.now() - 305 * 1000).toString();
      const validSigForStale = generateSignature(staleTimestamp, rawBody);

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': validSigForStale,
            'x-webhook-timestamp': staleTimestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT webhook when timestamp is in future (> 300 seconds ahead)', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_FUTURE_1', order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 333444 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const futureTimestamp = (Date.now() + 305 * 1000).toString();
      const validSigForFuture = generateSignature(futureTimestamp, rawBody);

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': validSigForFuture,
            'x-webhook-timestamp': futureTimestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT webhook when timestamp is malformed', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_MALFORMED_1', order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 555666 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const malformedTimestamp = 'not-a-valid-timestamp-abc';
      const sig = generateSignature(malformedTimestamp, rawBody);

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': sig,
            'x-webhook-timestamp': malformedTimestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should REJECT webhook when order amount does not match mandatory ₹2,068 fee', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_WRONG_AMT', order_amount: 500, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 112233 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSig = generateSignature(timestamp, rawBody);

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': validSig,
            'x-webhook-timestamp': timestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT webhook when currency is not INR', async () => {
      const payload = {
        data: {
          order: { order_id: 'CF_ORD_USD', order_amount: 2068, order_currency: 'USD', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 445566 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSig = generateSignature(timestamp, rawBody);

      await expect(
        paymentService.handleWebhook(
          payload,
          {
            'x-webhook-signature': validSig,
            'x-webhook-timestamp': timestamp,
          },
          rawBody,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ACCEPT validly signed webhook, update order to PAID, and activate candidate portal', async () => {
      const orderId = 'CF_ORD_VALID_001';
      const payload = {
        data: {
          order: { order_id: orderId, order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 990011 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSig = generateSignature(timestamp, rawBody);

      const res = await paymentService.handleWebhook(
        payload,
        {
          'x-webhook-signature': validSig,
          'x-webhook-timestamp': timestamp,
        },
        rawBody,
      );

      expect(res.success).toBe(true);

      // Verify Candidate Portal is now activated
      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(true);
      expect(candidate.isPortalActive).toBe(true);
      expect(candidate.status).toBe('PORTAL_ACTIVE');

      // Verify Prisma database transaction call
      expect(mockPrisma.integPaymentTxn.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { txnCode: '990011' },
          create: expect.objectContaining({
            gatewayName: 'CASHFREE',
            amount: 2068,
            status: 'SUCCESS',
          }),
        }),
      );
    });

    it('should handle DUPLICATE webhooks idempotently without throwing state transition errors', async () => {
      const orderId = 'CF_ORD_IDEMP_001';
      const payload = {
        data: {
          order: { order_id: orderId, order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 887766 },
          customer_details: { customer_id: candidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSig = generateSignature(timestamp, rawBody);
      const headers = {
        'x-webhook-signature': validSig,
        'x-webhook-timestamp': timestamp,
      };

      // Delivery 1: Success
      const firstDelivery = await paymentService.handleWebhook(payload, headers, rawBody);
      expect(firstDelivery.success).toBe(true);

      // Delivery 2: Repeated webhook must be idempotent (no exception)
      const secondDelivery = await paymentService.handleWebhook(payload, headers, rawBody);
      expect(secondDelivery.success).toBe(true);
      expect(secondDelivery.message).toContain('idempotent');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Persistence & Database Verification
  // --------------------------------------------------------------------------
  describe('PostgreSQL Prisma Persistence', () => {
    it('should persist new candidate to PostgreSQL edp_candidates via Prisma', async () => {
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: 'MAHA-AGRI-EDP-DB-01',
        fullName: 'Prashant Kale',
        mobileNumber: '9876543219',
      });

      expect(mockPrisma.edpCandidate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { candidateCode: 'MAHA-AGRI-EDP-DB-01' },
          create: expect.objectContaining({
            candidateCode: 'MAHA-AGRI-EDP-DB-01',
            fullName: 'Prashant Kale',
            mobileNumber: '9876543219',
            isPaid: false,
          }),
        }),
      );
    });

    it('should hydrate candidate from database if not in memory (survives restart)', async () => {
      // Simulate backend restart by instantiating new EdpLifecycleService without memory cache
      const freshLifecycleService = new EdpLifecycleService(stateMachineService, mockPrisma);

      // Mock database returning the persisted candidate
      mockPrisma.edpCandidate.findFirst.mockResolvedValueOnce({
        id: 'uuid-db-99',
        candidateCode: 'MAHA-AGRI-EDP-REBOOT-01',
        fullName: 'Ganesh More',
        mobileNumber: '9876543299',
        districtId: '00000000-0000-0000-0000-000000000001',
        talukaId: '00000000-0000-0000-0000-000000000001',
        status: 'REGISTERED',
        isPaid: false,
        isPortalActive: false,
        createdAt: new Date(),
      });

      const found = await freshLifecycleService.findCandidateAsync('MAHA-AGRI-EDP-REBOOT-01');
      expect(found).not.toBeNull();
      expect(found?.fullName).toBe('Ganesh More');
      expect(mockPrisma.edpCandidate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            candidateCode: 'MAHA-AGRI-EDP-REBOOT-01',
          },
        }),
      );
    });

    it('should query by both candidateCode and id when idOrCode is a valid UUID', async () => {
      const freshLifecycleService = new EdpLifecycleService(stateMachineService, mockPrisma);
      const testUuid = '11111111-2222-3333-4444-555555555555';

      mockPrisma.edpCandidate.findFirst.mockResolvedValueOnce({
        id: testUuid,
        candidateCode: 'MAHA-AGRI-EDP-UUID-01',
        fullName: 'Suresh Patil',
        mobileNumber: '9876543200',
        districtId: '00000000-0000-0000-0000-000000000001',
        talukaId: '00000000-0000-0000-0000-000000000001',
        status: 'REGISTERED',
        isPaid: false,
        isPortalActive: false,
        createdAt: new Date(),
      });

      const found = await freshLifecycleService.findCandidateAsync(testUuid);
      expect(found).not.toBeNull();
      expect(found?.fullName).toBe('Suresh Patil');
      expect(mockPrisma.edpCandidate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { candidateCode: testUuid },
              { id: testUuid },
            ],
          },
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. Portal Activation Security & Proof-of-Payment Enforcement (P0 Security)
  // --------------------------------------------------------------------------
  describe('Portal Activation Security & Proof-of-Payment Enforcement', () => {
    const candidateId = 'MAHA-AGRI-EDP-SEC-01';

    beforeEach(async () => {
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId,
        fullName: 'Ramesh Pawar',
        mobileNumber: '9876543233',
      });
    });

    it('should REJECT portal activation when transactionRef does not exist in integ_payment_txns (Bypass Protection)', async () => {
      // Attacker attempts to pass fake transaction reference
      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          'FAKE_UNVERIFIED_TXN_999',
          'EXTERNAL_ATTACKER',
        ),
      ).rejects.toThrow(BadRequestException);

      // Verify candidate is NOT activated
      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).not.toBe('PORTAL_ACTIVE');
    });

    it('should REJECT portal activation when transactionRef is empty or missing', async () => {
      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(candidateId, '', 'USER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT portal activation even if caller passes spoofed gateway actor without verified payment', async () => {
      // Caller pretends to be CASHFREE_GATEWAY or CASHFREE_WEBHOOK
      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          'SPOOFED_TXN_123',
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
    });

    it('should REJECT portal activation when transaction status in database is NOT SUCCESS', async () => {
      // Payment exists but is in FAILED or PENDING state
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: 'FAILED_TXN_456' },
        create: { txnCode: 'FAILED_TXN_456', amount: 2068, status: 'FAILED' },
      });

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          'FAILED_TXN_456',
          'USER',
        ),
      ).rejects.toThrow(BadRequestException);

      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
    });

    it('should REJECT portal activation when transaction amount in database does not match ₹2,068', async () => {
      // Payment exists but amount was only ₹500
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: 'PARTIAL_TXN_789' },
        create: { txnCode: 'PARTIAL_TXN_789', amount: 500, status: 'SUCCESS' },
      });

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          'PARTIAL_TXN_789',
          'USER',
        ),
      ).rejects.toThrow(BadRequestException);

      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
    });

    it('should ACCEPT portal activation when valid verified payment exists in integ_payment_txns', async () => {
      const validTxn = 'VALID_CF_TXN_1010';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: validTxn },
        create: { txnCode: validTxn, amount: 2068, status: 'SUCCESS' },
      });

      const res = await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        validTxn,
        'CASHFREE_GATEWAY',
      );

      expect(res.success).toBe(true);
      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(true);
      expect(candidate.status).toBe('PORTAL_ACTIVE');
      expect(candidate.isPortalActive).toBe(true);
    });

    it('should REJECT re-using same transactionRef for a different candidate (Candidate-Payment Binding Guard)', async () => {
      const sharedTxn = 'SHARED_CF_TXN_2020';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: sharedTxn },
        create: { txnCode: sharedTxn, amount: 2068, status: 'SUCCESS' },
      });

      // Activate Candidate 1 successfully
      await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        sharedTxn,
        'CASHFREE_GATEWAY',
      );

      // Register Candidate 2
      const candidate2Id = 'MAHA-AGRI-EDP-SEC-02';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: candidate2Id,
        fullName: 'Vijay Shinde',
        mobileNumber: '9876543234',
      });

      // Candidate 2 attempts to redeem Candidate 1's transaction
      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidate2Id,
          sharedTxn,
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      // Candidate 2 remains unpaid
      const candidate2 = edpLifecycleService.findCandidate(candidate2Id);
      expect(candidate2.isPaid).toBe(false);
      expect(candidate2.status).not.toBe('PORTAL_ACTIVE');
    });

    it('should handle repeat activation for already-paid candidate idempotently', async () => {
      const idempTxn = 'IDEMP_CF_TXN_3030';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: idempTxn },
        create: { txnCode: idempTxn, amount: 2068, status: 'SUCCESS' },
      });

      // Call 1
      const res1 = await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        idempTxn,
        'CASHFREE_GATEWAY',
      );
      expect(res1.success).toBe(true);

      // Call 2: Must be idempotent
      const res2 = await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        idempTxn,
        'CASHFREE_GATEWAY',
      );
      expect(res2.success).toBe(true);
      expect(res2.message).toContain('idempotent');
    });

    it('should recover order from PostgreSQL integ_payment_orders after backend restart without in-memory orderStore', async () => {
      // 1. Order persisted in PostgreSQL
      const persistedOrder = await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: 'CF_ORD_RESTART_888' },
        create: {
          orderCode: 'CF_ORD_RESTART_888',
          candidateCode: 'MAHA-AGRI-EDP-RESTART-01',
          gatewayName: 'CASHFREE',
          amount: 2068,
          currency: 'INR',
          status: 'ACTIVE',
        },
      });
      expect(persistedOrder).toBeDefined();

      // 2. Simulate complete restart with clean in-memory paymentService
      const freshPaymentService = new PaymentGatewayService(
        razorpayAdapter,
        cashfreeAdapter,
        edpLifecycleService,
        mockPrisma,
      );

      // 3. Query getOrderStatus - must recover from mockPrisma.integPaymentOrder
      const res = await freshPaymentService.getOrderStatus('CF_ORD_RESTART_888');
      expect(res.success).toBe(true);
      expect(res.data.orderId).toBe('CF_ORD_RESTART_888');
      expect(res.data.candidateCode).toBe('MAHA-AGRI-EDP-RESTART-01');
      expect(res.data.amount).toBe(2068);
    });

    it('should persist non-success webhook attempt as FAILED without defaulting to SUCCESS and without activating portal', async () => {
      const failedCandidateId = 'MAHA-AGRI-EDP-FAIL-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: failedCandidateId,
        fullName: 'Ramesh Failed',
        mobileNumber: '9876543299',
      });

      const failedWebhookEvent = {
        event: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order: {
            order_id: 'CF_ORD_FAIL_999',
            order_amount: 2068,
            order_currency: 'INR',
            order_status: 'ACTIVE',
          },
          payment: {
            cf_payment_id: 771122,
            payment_status: 'FAILED',
          },
          customer_details: {
            customer_id: failedCandidateId,
          },
        },
      };

      const webhookTimestamp = (Date.now() - 1000).toString();
      const rawBody = JSON.stringify(failedWebhookEvent);
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(webhookTimestamp + rawBody)
        .digest('base64');

      const res = await paymentService.handleWebhook(
        failedWebhookEvent,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': webhookTimestamp,
        },
        rawBody,
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('FAILED');

      // Verify transaction in DB is recorded as FAILED, never defaulting to SUCCESS
      const savedTxn = await mockPrisma.integPaymentTxn.findUnique({
        where: { txnCode: '771122' },
      });
      expect(savedTxn).toBeDefined();
      expect(savedTxn.status).toBe('FAILED');
      expect(savedTxn.status).not.toBe('SUCCESS');

      // Candidate must remain unpaid and NOT activated
      const candidate = edpLifecycleService.findCandidate(failedCandidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).toBe('REGISTERED');
    });

    it('should REJECT portal activation when transaction is associated with another candidate code in PostgreSQL', async () => {
      const stolenTxn = 'STOLEN_CF_TXN_555';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: stolenTxn },
        create: {
          txnCode: stolenTxn,
          amount: 2068,
          status: 'SUCCESS',
          candidateCode: 'LEGIT_CANDIDATE_001',
        },
      });

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          stolenTxn,
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
    });

    it('should REJECT portal activation when paymentTxnCode is already recorded in PostgreSQL for another candidate', async () => {
      const claimedTxn = 'ALREADY_CLAIMED_TXN_666';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: claimedTxn },
        create: {
          txnCode: claimedTxn,
          amount: 2068,
          status: 'SUCCESS',
        },
      });

      // Mock findFirst on edpCandidate to indicate another candidate already holds this paymentTxnCode
      mockPrisma.edpCandidate.findFirst.mockResolvedValueOnce({
        id: 'other-uuid-999',
        candidateCode: 'OTHER_CLAIMANT_01',
        paymentTxnCode: claimedTxn,
      });

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          candidateId,
          claimedTxn,
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      const candidate = edpLifecycleService.findCandidate(candidateId);
      expect(candidate.isPaid).toBe(false);
    });

    it('should handle concurrent activation race condition atomically and idempotently without duplicate timelines', async () => {
      const raceTxn = 'RACE_CF_TXN_777';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: raceTxn },
        create: {
          txnCode: raceTxn,
          amount: 2068,
          status: 'SUCCESS',
          candidateCode: candidateId,
        },
      });

      // 1. First execution succeeds
      const res1 = await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        raceTxn,
        'CASHFREE_GATEWAY',
      );
      expect(res1.success).toBe(true);

      // Check timeline count
      const timelines1 = await edpLifecycleService.getCandidateTimeline(candidateId);
      const countAfterFirst = timelines1.data.length;

      // 2. Second execution (simulating concurrent request where updateMany returned count: 0)
      mockPrisma.edpCandidate.updateMany.mockResolvedValueOnce({ count: 0 });
      const res2 = await edpLifecycleService.confirmPaymentAndActivatePortal(
        candidateId,
        raceTxn,
        'CASHFREE_GATEWAY',
      );
      expect(res2.success).toBe(true);
      expect(res2.message).toContain('idempotent');

      // Timeline must not have duplicate entries
      const timelines2 = await edpLifecycleService.getCandidateTimeline(candidateId);
      expect(timelines2.data.length).toBe(countAfterFirst);
    });

    it('should NEVER mutate in-memory candidate status when database update fails', async () => {
      const failCandidateId = 'MAHA-AGRI-EDP-FAIL-DB-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: failCandidateId,
        fullName: 'DB Failure Candidate',
        mobileNumber: '9876543111',
      });

      const failTxn = 'FAIL_DB_TXN_888';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: failTxn },
        create: {
          txnCode: failTxn,
          amount: 2068,
          status: 'SUCCESS',
          candidateCode: failCandidateId,
        },
      });

      // Simulate unexpected database crash/failure during updateMany
      mockPrisma.edpCandidate.updateMany.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          failCandidateId,
          failTxn,
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      // Verify in-memory candidate remains unpaid and NOT activated
      const candidate = edpLifecycleService.findCandidate(failCandidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).toBe('REGISTERED');
      expect(candidate.isPortalActive).toBe(false);
    });

    it('should REJECT portal activation and prevent in-memory mutation on Prisma P2002 unique constraint conflict', async () => {
      const p2002CandidateId = 'MAHA-AGRI-EDP-P2002-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: p2002CandidateId,
        fullName: 'P2002 Candidate',
        mobileNumber: '9876543222',
      });

      const p2002Txn = 'P2002_TXN_999';
      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode: p2002Txn },
        create: {
          txnCode: p2002Txn,
          amount: 2068,
          status: 'SUCCESS',
          candidateCode: p2002CandidateId,
        },
      });

      // Simulate Prisma P2002 duplicate key error thrown by PostgreSQL unique index
      const p2002Error: any = new Error('Unique constraint failed on the constraint: uq_edp_candidates_paymentTxnCode');
      p2002Error.code = 'P2002';
      mockPrisma.edpCandidate.updateMany.mockRejectedValueOnce(p2002Error);

      await expect(
        edpLifecycleService.confirmPaymentAndActivatePortal(
          p2002CandidateId,
          p2002Txn,
          'CASHFREE_GATEWAY',
        ),
      ).rejects.toThrow(BadRequestException);

      // Verify in-memory candidate remains unpaid and NOT activated
      const candidate = edpLifecycleService.findCandidate(p2002CandidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).toBe('REGISTERED');
      expect(candidate.isPortalActive).toBe(false);
    });

    it('should NEVER allow a subsequent FAILED webhook to overwrite an already verified SUCCESS payment transaction in PostgreSQL', async () => {
      const successCandidateId = 'MAHA-AGRI-EDP-DOWNGRADE-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: successCandidateId,
        fullName: 'Success Candidate',
        mobileNumber: '9876543333',
      });

      const orderId = 'CF_ORD_IMMUTABLE_001';
      const txnCode = 'IMMUTABLE_TXN_001';

      // 1. Order and transaction recorded as verified SUCCESS
      await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: orderId },
        create: {
          orderCode: orderId,
          candidateCode: successCandidateId,
          amount: 2068,
          currency: 'INR',
          status: 'PAID',
        },
      });

      await mockPrisma.integPaymentTxn.upsert({
        where: { txnCode },
        create: {
          txnCode,
          orderCode: orderId,
          candidateCode: successCandidateId,
          amount: 2068,
          currency: 'INR',
          status: 'SUCCESS',
        },
      });

      // 2. Late/replayed FAILED webhook arrives for this same transaction
      const failedWebhookEvent = {
        event: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order: {
            order_id: orderId,
            order_amount: 2068,
            order_currency: 'INR',
            order_status: 'ACTIVE',
          },
          payment: {
            cf_payment_id: txnCode,
            payment_status: 'FAILED',
          },
          customer_details: {
            customer_id: successCandidateId,
          },
        },
      };

      const webhookTimestamp = (Date.now() - 1000).toString();
      const rawBody = JSON.stringify(failedWebhookEvent);
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(webhookTimestamp + rawBody)
        .digest('base64');

      const res = await paymentService.handleWebhook(
        failedWebhookEvent,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': webhookTimestamp,
        },
        rawBody,
      );

      expect(res.success).toBe(true);

      // 3. Confirm database record is STILL SUCCESS, not FAILED
      const txnInDb = await mockPrisma.integPaymentTxn.findUnique({
        where: { txnCode },
      });
      expect(txnInDb.status).toBe('SUCCESS');
      expect(txnInDb.status).not.toBe('FAILED');
    });

    it('should REJECT client-supplied candidateId in verifyPayment when it overrides persisted order candidate binding', async () => {
      const orderId = 'CF_ORD_SPOOF_001';
      await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: orderId },
        create: {
          orderCode: orderId,
          candidateCode: 'LEGIT_CANDIDATE_01',
          amount: 2068,
          currency: 'INR',
          status: 'ACTIVE',
        },
      });

      // Attacker passes orderId with a different candidateId
      await expect(
        paymentService.verifyPayment({
          orderId,
          paymentId: 'PAY_SPOOF_001',
          signature: 'valid_mock_sig',
          candidateId: 'ATTACKER_CANDIDATE_99',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recover order from PostgreSQL in verifyPayment after backend restart and activate portal', async () => {
      const restartCandidateId = 'MAHA-AGRI-EDP-VERIFY-REBOOT';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: restartCandidateId,
        fullName: 'Reboot Candidate',
        mobileNumber: '9876543444',
      });

      const orderId = 'CF_ORD_REBOOT_VERIFY';
      await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: orderId },
        create: {
          orderCode: orderId,
          candidateCode: restartCandidateId,
          amount: 2068,
          currency: 'INR',
          status: 'ACTIVE',
        },
      });

      // Fresh PaymentGatewayService simulating server restart with empty memory
      const cleanPaymentService = new PaymentGatewayService(
        razorpayAdapter,
        cashfreeAdapter,
        edpLifecycleService,
        mockPrisma,
      );

      // Verify payment with orderId only (no candidateId in body)
      jest.spyOn(cashfreeAdapter, 'verifyPaymentSignature').mockResolvedValueOnce(true);
      const res = await cleanPaymentService.verifyPayment({
        orderId,
        paymentId: 'PAY_REBOOT_VERIFY_99',
        signature: 'valid_mock_sig',
      });

      expect(res.success).toBe(true);
      expect(res.data.candidateId).toBe(restartCandidateId);

      // Candidate must now be paid and portal active
      const candidate = edpLifecycleService.findCandidate(restartCandidateId);
      expect(candidate.isPaid).toBe(true);
      expect(candidate.status).toBe('PORTAL_ACTIVE');
    });

    it('should PROPAGATE portal activation failures from verifyPayment and prevent in-memory order status update to PAID', async () => {
      const errCandidateId = 'MAHA-AGRI-EDP-PROPAGATE-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: errCandidateId,
        fullName: 'Propagate Candidate',
        mobileNumber: '9876543555',
      });

      const orderId = 'CF_ORD_PROPAGATE_001';
      await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: orderId },
        create: {
          orderCode: orderId,
          candidateCode: errCandidateId,
          amount: 2068,
          currency: 'INR',
          status: 'ACTIVE',
        },
      });

      // Spy on confirmPaymentAndActivatePortal to throw BadRequestException
      jest.spyOn(edpLifecycleService, 'confirmPaymentAndActivatePortal').mockRejectedValueOnce(
        new BadRequestException('Transaction has already been redeemed by another candidate in database.'),
      );
      jest.spyOn(cashfreeAdapter, 'verifyPaymentSignature').mockResolvedValueOnce(true);

      // verifyPayment MUST propagate the error, not swallow it into a false success
      await expect(
        paymentService.verifyPayment({
          orderId,
          paymentId: 'PAY_PROPAGATE_ERR_01',
          signature: 'valid_mock_sig',
        }),
      ).rejects.toThrow(BadRequestException);

      // In-memory order must NOT be marked PAID
      const orderStatus = await paymentService.getOrderStatus(orderId);
      expect(orderStatus.data.status).not.toBe('PAID');
      expect(orderStatus.data.status).toBe('ACTIVE');

      // Candidate must NOT be marked paid or portal active
      const candidate = edpLifecycleService.findCandidate(errCandidateId);
      expect(candidate.isPaid).toBe(false);
      expect(candidate.status).not.toBe('PORTAL_ACTIVE');
    });

    it('should distinguish portal activation failure in handleWebhook without marking in-memory order PAID', async () => {
      const whErrCandidateId = 'MAHA-AGRI-EDP-WH-ERR-01';
      await edpLifecycleService.syncAssessmentCandidate({
        candidateId: whErrCandidateId,
        fullName: 'Webhook Error Candidate',
        mobileNumber: '9876543666',
      });

      const orderId = 'CF_ORD_WH_ERR_001';
      await mockPrisma.integPaymentOrder.upsert({
        where: { orderCode: orderId },
        create: {
          orderCode: orderId,
          candidateCode: whErrCandidateId,
          amount: 2068,
          currency: 'INR',
          status: 'ACTIVE',
        },
      });

      const payload = {
        data: {
          order: { order_id: orderId, order_amount: 2068, order_currency: 'INR', order_status: 'PAID' },
          payment: { payment_status: 'SUCCESS', cf_payment_id: 889900 },
          customer_details: { customer_id: whErrCandidateId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(`${timestamp}${rawBody}`).digest('base64');

      // Force portal activation to fail
      jest.spyOn(edpLifecycleService, 'confirmPaymentAndActivatePortal').mockRejectedValueOnce(
        new BadRequestException('Database candidate activation failed: Connection terminated'),
      );

      const res = await paymentService.handleWebhook(
        payload,
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        rawBody,
      );

      // Webhook acknowledges payment receipt for gateway retry compatibility but reports activation failure
      expect(res.success).toBe(true);
      expect(res.portalActive).toBe(false);
      expect(res.activationError).toBeDefined();

      // In-memory order must NOT be marked PAID
      const orderStatus = await paymentService.getOrderStatus(orderId);
      expect(orderStatus.data.status).not.toBe('PAID');
    });
  });
});
