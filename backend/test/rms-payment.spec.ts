// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// RMS Careers Online Payment Integration Test Suite
// Order creation, authoritative pricing, signature verification, webhooks & idempotency
// ============================================================================

import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { RazorpayPaymentAdapter } from '../src/modules/integration/adapters/payment/razorpay-payment.adapter';
import { RmsPaymentService } from '../src/modules/integration/services/rms-payment.service';
import { PlatformNotificationService } from '../src/modules/platform/services/platform-notification.service';

describe('RmsPaymentService — Careers Online Payment Workflow', () => {
  const TEST_SECRET = 'sandbox_secret_key_mock_123';
  let razorpayAdapter: RazorpayPaymentAdapter;
  let notificationService: PlatformNotificationService;
  let mockPrisma: any;
  let rmsPaymentService: RmsPaymentService;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key';
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    razorpayAdapter = new RazorpayPaymentAdapter();
    notificationService = new PlatformNotificationService();

    mockPrisma = {
      isDbConnected: true,
      $queryRawUnsafe: jest.fn().mockImplementation((query: string, appId: string) => {
        // Return authoritative mock row from PostgreSQL
        if (appId === 'app-paid-1') {
          return Promise.resolve([
            {
              id: 'app-paid-1',
              application_number: 'ABF-APP-000101',
              status: 'payment_pending',
              candidate_id: 'cand-uuid-1',
              job_title: 'Taluka Agricultural Assistant',
              application_fee_amount: 500, // Authoritative fee
              full_name: 'Aniket Deshmukh',
              mobile: '9822012345',
              email: 'aniket@example.com',
            },
          ]);
        }
        if (appId === 'app-already-paid') {
          return Promise.resolve([
            {
              id: 'app-already-paid',
              application_number: 'ABF-APP-000102',
              status: 'payment_successful',
              candidate_id: 'cand-uuid-2',
              job_title: 'District Coordinator',
              application_fee_amount: 1000,
              full_name: 'Suresh Patil',
              mobile: '9822054321',
            },
          ]);
        }
        if (appId === 'app-free-job') {
          return Promise.resolve([
            {
              id: 'app-free-job',
              application_number: 'ABF-APP-000103',
              status: 'payment_pending',
              candidate_id: 'cand-uuid-3',
              job_title: 'Field Volunteer',
              application_fee_amount: 0, // Free position
              full_name: 'Ramesh Kadam',
              mobile: '9822099999',
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    rmsPaymentService = new RmsPaymentService(
      razorpayAdapter,
      notificationService,
      mockPrisma,
    );
  });

  afterEach(() => {
    rmsPaymentService.resetTestingStore();
  });

  // ── 1. Order Creation & Amount Integrity ──────────────────────────────────
  describe('Order Creation & Authoritative Fee Resolution', () => {
    it('creates an online order using the authoritative fee from the database', async () => {
      const order = await rmsPaymentService.createOrder({
        applicationId: 'app-paid-1',
        customerName: 'Aniket Deshmukh',
        customerPhone: '9822012345',
      });

      expect(order.success).toBe(true);
      expect(order.amount).toBe(500); // Must be exactly 500 from DB
      expect(order.currency).toBe('INR');
      expect(order.orderId).toMatch(/^order_rzp_/);
      expect(order.applicationNumber).toBe('ABF-APP-000101');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('rejects order creation if candidateId does not match the application owner', async () => {
      await expect(
        rmsPaymentService.createOrder({
          applicationId: 'app-paid-1',
          candidateId: 'attacker-candidate-uuid-999',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects order creation if the application is already paid', async () => {
      await expect(
        rmsPaymentService.createOrder({
          applicationId: 'app-already-paid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects order creation if the position has fee = 0 (free job)', async () => {
      await expect(
        rmsPaymentService.createOrder({
          applicationId: 'app-free-job',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 2. Signature Verification ─────────────────────────────────────────────
  describe('Signature Verification', () => {
    it('successfully verifies a valid Razorpay HMAC-SHA256 signature and transitions state', async () => {
      const order = await rmsPaymentService.createOrder({
        applicationId: 'app-paid-1',
      });

      const paymentId = 'pay_test_succ_001';
      const validSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${order.orderId}|${paymentId}`)
        .digest('hex');

      const result = await rmsPaymentService.verifyPayment({
        applicationId: 'app-paid-1',
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('payment_successful');
      expect(result.paymentId).toBe(paymentId);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('public.rms_applications'),
        'app-paid-1',
      );
    });

    it('rejects payment verification with an invalid signature', async () => {
      const order = await rmsPaymentService.createOrder({
        applicationId: 'app-paid-1',
      });

      await expect(
        rmsPaymentService.verifyPayment({
          applicationId: 'app-paid-1',
          orderId: order.orderId,
          paymentId: 'pay_test_tampered',
          signature: 'invalid_forged_signature_hex_value',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 3. Webhook Authentication & Idempotent Processing ─────────────────────
  describe('Razorpay Webhook Handler & Idempotency', () => {
    it('processes payment.captured webhook with valid HMAC signature', async () => {
      const order = await rmsPaymentService.createOrder({
        applicationId: 'app-paid-1',
      });

      const paymentId = 'pay_captured_webhook_001';
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: order.orderId,
              amount: 50000,
              currency: 'INR',
              status: 'captured',
              notes: {
                application_id: 'app-paid-1',
              },
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(rawBody)
        .digest('hex');

      const webhookResponse: any = await rmsPaymentService.handleWebhook(
        webhookPayload,
        { 'x-razorpay-signature': signature },
        rawBody,
      );

      expect(webhookResponse.success).toBe(true);
      expect(webhookResponse.status).toBe('payment_successful');
      expect(webhookResponse.paymentId).toBe(paymentId);
    });

    it('rejects webhooks with invalid or missing signatures', async () => {
      const payload = { event: 'payment.captured' };
      const rawBody = JSON.stringify(payload);

      await expect(
        rmsPaymentService.handleWebhook(
          payload,
          { 'x-razorpay-signature': 'bad_sig' },
          rawBody,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles duplicate / replayed callbacks idempotently without re-executing transitions', async () => {
      const order = await rmsPaymentService.createOrder({
        applicationId: 'app-paid-1',
      });

      const paymentId = 'pay_replay_test_001';
      const validSignature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${order.orderId}|${paymentId}`)
        .digest('hex');

      // First verification
      const res1 = await rmsPaymentService.verifyPayment({
        applicationId: 'app-paid-1',
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
      });
      expect(res1.status).toBe('payment_successful');

      const executeCountAfterFirst = mockPrisma.$executeRawUnsafe.mock.calls.length;

      // Replayed verification with identical paymentId
      const res2 = await rmsPaymentService.verifyPayment({
        applicationId: 'app-paid-1',
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
      });

      expect(res2.success).toBe(true);
      expect(res2.message).toContain('idempotent');
      // Must not re-trigger database state mutations on duplicate
      expect(mockPrisma.$executeRawUnsafe.mock.calls.length).toBe(executeCountAfterFirst);
    });
  });
});
