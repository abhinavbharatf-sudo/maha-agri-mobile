// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: Payment Gateway Orchestration & Webhook Service
// Multi-provider (Cashfree primary, Razorpay legacy) with strict EDP fee enforcement
// ============================================================================

import { Injectable, BadRequestException, UnauthorizedException, Logger, Optional } from '@nestjs/common';
import { RazorpayPaymentAdapter } from '../adapters/payment/razorpay-payment.adapter';
import { CashfreePaymentAdapter } from '../adapters/payment/cashfree-payment.adapter';
import { EdpLifecycleService } from '../../edp/services/edp-lifecycle.service';
import { IPaymentProviderAdapter } from '../adapters/payment/payment.adapter.interface';
import { PrismaService } from '../../platform/services/prisma.service';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private idempotencyCache = new Map<string, any>();
  private orderStore = new Map<string, any>();
  private auditLog: any[] = [];

  constructor(
    private readonly razorpayAdapter: RazorpayPaymentAdapter,
    private readonly cashfreeAdapter: CashfreePaymentAdapter,
    private readonly edpLifecycleService: EdpLifecycleService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get activeAdapter(): IPaymentProviderAdapter {
    const provider = (process.env.PAYMENT_GATEWAY_PROVIDER || 'CASHFREE').toUpperCase();
    if (provider === 'RAZORPAY') {
      return this.razorpayAdapter;
    }
    return this.cashfreeAdapter;
  }

  async createOrder(params: {
    amount?: number;
    receipt: string;
    candidateId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    returnUrl?: string;
    notifyUrl?: string;
    idempotencyKey?: string;
  }) {
    if (params.idempotencyKey && this.idempotencyCache.has(params.idempotencyKey)) {
      this.logger.log(`Idempotent order request detected for key ${params.idempotencyKey}`);
      return this.idempotencyCache.get(params.idempotencyKey);
    }

    const candidateId = params.candidateId || params.receipt;

    // Verify candidate existence or sync if details provided
    let candidate = this.edpLifecycleService.findCandidate(candidateId);
    if (!candidate && typeof (this.edpLifecycleService as any).findCandidateAsync === 'function') {
      candidate = await (this.edpLifecycleService as any).findCandidateAsync(candidateId);
    }

    if (!candidate && params.customerName && params.customerPhone) {
      await this.edpLifecycleService.syncAssessmentCandidate({
        candidateId,
        fullName: params.customerName,
        mobileNumber: params.customerPhone,
      });
      candidate = this.edpLifecycleService.findCandidate(candidateId);
    }

    // Priority 3: Double-Payment Protection Guard
    if (candidate && (candidate.isPaid || candidate.status === 'PAID' || candidate.status === 'PORTAL_ACTIVE')) {
      throw new BadRequestException(
        `Candidate ${candidateId} has already paid the EDP training fee and portal access is active. Duplicate payment order rejected.`,
      );
    }

    // Authoritative fee: strictly ₹2,068 INR for Cashfree EDP enrolment
    const requiredFee = CashfreePaymentAdapter.FIXED_EDP_FEE_INR;
    const finalAmount = this.activeAdapter.providerName === 'CASHFREE' ? requiredFee : (params.amount || requiredFee);

    const order = await this.activeAdapter.createOrder({
      amount: finalAmount,
      currency: 'INR',
      receipt: candidateId,
      customerDetails: {
        customerId: candidateId,
        customerName: params.customerName || candidate?.fullName || 'EDP Candidate',
        customerPhone: params.customerPhone || candidate?.mobileNumber || '9999999999',
        customerEmail: params.customerEmail,
      },
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
      idempotencyKey: params.idempotencyKey,
    });

    const record = {
      orderId: order.orderId,
      provider: order.providerName,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      candidateId,
      paymentSessionId: order.paymentSessionId,
      paymentLink: order.paymentLink,
      environment: order.environment,
      status: order.status,
      createdAt: new Date().toISOString(),
    };

    this.orderStore.set(order.orderId, record);
    this.logAudit('ORDER_CREATED', record);

    // Persist order to PostgreSQL integ_payment_orders model for restart durability
    if (this.prisma?.integPaymentOrder && candidate) {
      try {
        const candidateUuid = this.isUuid(candidate.id) ? candidate.id : (this.isUuid(candidateId) ? candidateId : null);
        await this.prisma.integPaymentOrder.upsert({
          where: { orderCode: order.orderId },
          create: {
            orderCode: order.orderId,
            candidateId: candidateUuid,
            candidateCode: candidate.candidateCode || candidateId,
            gatewayName: order.providerName,
            amount: order.amount,
            currency: order.currency || 'INR',
            status: order.status || 'ACTIVE',
            paymentSessionId: order.paymentSessionId,
            paymentLink: order.paymentLink,
          },
          update: {
            status: order.status || 'ACTIVE',
            paymentSessionId: order.paymentSessionId,
            paymentLink: order.paymentLink,
          },
        });
        this.logger.log(`Persisted payment order ${order.orderId} for candidate ${candidate.candidateCode} in PostgreSQL`);
      } catch (dbErr: any) {
        this.logger.warn(`Could not persist payment order in PostgreSQL: ${dbErr.message}`);
      }
    }

    const responsePayload = {
      success: true,
      message: 'Payment order created successfully',
      data: record,
      timestamp: new Date().toISOString(),
    };

    if (params.idempotencyKey) {
      this.idempotencyCache.set(params.idempotencyKey, responsePayload);
    }

    return responsePayload;
  }

  async verifyPayment(params: {
    orderId: string;
    paymentId?: string;
    signature?: string;
    candidateId?: string;
  }) {
    let order = this.orderStore.get(params.orderId);

    // Durability: Recover order from PostgreSQL if missing in memory (e.g. after restart)
    if (!order && this.prisma?.integPaymentOrder) {
      try {
        const dbOrder = await this.prisma.integPaymentOrder.findUnique({
          where: { orderCode: params.orderId },
        });
        if (dbOrder) {
          order = {
            orderId: dbOrder.orderCode,
            provider: dbOrder.gatewayName,
            amount: Number(dbOrder.amount),
            currency: dbOrder.currency,
            receipt: dbOrder.candidateCode,
            candidateId: dbOrder.candidateId,
            candidateCode: dbOrder.candidateCode,
            paymentSessionId: dbOrder.paymentSessionId,
            paymentLink: dbOrder.paymentLink,
            status: dbOrder.status,
            createdAt: dbOrder.createdAt.toISOString(),
          };
          this.orderStore.set(params.orderId, order);
          this.logger.log(`Recovered order ${params.orderId} for candidate ${dbOrder.candidateCode} from PostgreSQL in verifyPayment`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not recover order from PostgreSQL in verifyPayment: ${err.message}`);
      }
    }

    // Authoritative candidate binding: Use persisted order binding and reject client override attempts
    const persistedCandidateCode = order?.candidateCode || order?.receipt;
    const persistedCandidateId = order?.candidateId;

    if (params.candidateId && persistedCandidateCode && params.candidateId !== persistedCandidateCode && params.candidateId !== persistedCandidateId) {
      throw new BadRequestException(
        `Client candidateId '${params.candidateId}' does not match persisted order candidate binding '${persistedCandidateCode}'. Override rejected.`,
      );
    }

    const candidateId = persistedCandidateCode || persistedCandidateId || params.candidateId;

    // Validate amount and currency from persisted order if present
    if (this.activeAdapter.providerName === 'CASHFREE' && order && Number(order.amount) !== CashfreePaymentAdapter.FIXED_EDP_FEE_INR) {
      throw new BadRequestException(
        `Order amount ₹${order.amount} does not match mandatory EDP fee ₹${CashfreePaymentAdapter.FIXED_EDP_FEE_INR}`,
      );
    }
    if (order && order.currency !== 'INR') {
      throw new BadRequestException('Order currency is not INR');
    }

    // Idempotent check
    if (order?.status === 'PAID') {
      return {
        success: true,
        message: 'Payment already verified (idempotent)',
        data: {
          orderId: params.orderId,
          paymentId: order.paymentId || params.paymentId || `PAY_${params.orderId}`,
          candidateId,
          status: 'PAID',
        },
        timestamp: new Date().toISOString(),
      };
    }

    const isValid = await this.activeAdapter.verifyPaymentSignature({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
      applicationId: candidateId,
    });

    if (!isValid) {
      this.logAudit('PAYMENT_VERIFICATION_FAILED', params);
      throw new BadRequestException('Authoritative payment verification failed.');
    }

    const transactionRef = params.paymentId || `PAY_${params.orderId}`;

    // GUARD: Resolve candidate BEFORE any database write — fail early with a retryable error.
    // This prevents orphaned integ_payment_txns rows and ensures activation is never attempted
    // for a candidate that does not exist in the system.
    const cand = candidateId
      ? await this.edpLifecycleService.findCandidateAsync(candidateId)
      : null;
    if (!cand) {
      this.logAudit('PAYMENT_VERIFY_CANDIDATE_MISSING', { candidateId, orderId: params.orderId });
      throw new BadRequestException(
        `Candidate '${candidateId}' is not registered in the system. ` +
        `Payment verified by provider but cannot be captured without a valid candidate record. ` +
        `Register the candidate and retry verification.`,
      );
    }

    // Persist payment to PostgreSQL integ_payment_txns — safe: candidate confirmed above
    if (this.prisma?.integPaymentTxn) {
      try {
        const candidateUuid = this.isUuid(cand.id) ? cand.id : (this.isUuid(order?.candidateId) ? order.candidateId : null);
        const candidateCodeVal = cand.candidateCode || order?.candidateCode || candidateId;

        await this.prisma.integPaymentTxn.upsert({
          where: { txnCode: transactionRef },
          create: {
            txnCode: transactionRef,
            orderCode: params.orderId,
            candidateId: candidateUuid,
            candidateCode: candidateCodeVal,
            gatewayName: this.activeAdapter.providerName,
            amount: CashfreePaymentAdapter.FIXED_EDP_FEE_INR,
            currency: 'INR',
            status: 'SUCCESS',
            settledAt: new Date(),
          },
          update: { status: 'SUCCESS', settledAt: new Date() },
        });
        this.logger.log(`Persisted verified payment transaction ${transactionRef} in PostgreSQL`);
      } catch (dbErr: any) {
        this.logger.warn(`Could not persist payment transaction to PostgreSQL: ${dbErr.message}`);
      }
    }

    // Activate candidate portal — cand is guaranteed non-null (guard above).
    // NOTE: confirmPaymentAndActivatePortal atomically updates integ_payment_orders to PAID
    // inside its own Prisma $transaction (lifecycle service step 4). Do not issue a separate
    // integPaymentOrder.updateMany here to avoid a double-write.
    await this.edpLifecycleService.confirmPaymentAndActivatePortal(
      candidateId,
      transactionRef,
      this.activeAdapter.providerName === 'CASHFREE' ? 'CASHFREE_GATEWAY' : 'RAZORPAY_GATEWAY',
    );

    // Update in-memory orderStore to reflect PAID status for subsequent calls within this process.
    // PostgreSQL integ_payment_orders was already updated atomically by confirmPaymentAndActivatePortal.
    if (order) {
      order.status = 'PAID';
      order.paymentId = transactionRef;
      order.paidAt = new Date().toISOString();
    }

    this.logAudit('PAYMENT_VERIFIED_SUCCESS', { ...params, amount: order?.amount, transactionRef });

    return {
      success: true,
      message: 'Payment verified and captured successfully',
      data: {
        orderId: params.orderId,
        paymentId: transactionRef,
        candidateId,
        status: 'PAID',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getOrderStatus(orderId: string) {
    let order = this.orderStore.get(orderId);

    // Durability: Recover order from PostgreSQL if missing in memory (e.g. after restart)
    if (!order && this.prisma?.integPaymentOrder) {
      try {
        const dbOrder = await this.prisma.integPaymentOrder.findUnique({
          where: { orderCode: orderId },
        });
        if (dbOrder) {
          order = {
            orderId: dbOrder.orderCode,
            provider: dbOrder.gatewayName,
            amount: Number(dbOrder.amount),
            currency: dbOrder.currency,
            receipt: dbOrder.candidateCode,
            candidateId: dbOrder.candidateId,
            candidateCode: dbOrder.candidateCode,
            paymentSessionId: dbOrder.paymentSessionId,
            paymentLink: dbOrder.paymentLink,
            status: dbOrder.status,
            createdAt: dbOrder.createdAt.toISOString(),
          };
          this.orderStore.set(orderId, order);
          this.logger.log(`Recovered order ${orderId} for candidate ${dbOrder.candidateCode} from PostgreSQL after restart`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not recover order from PostgreSQL: ${err.message}`);
      }
    }

    if (!order) {
      return { success: false, message: `Order ${orderId} not found in gateway store` };
    }

    // If already marked PAID, return directly
    if (order.status === 'PAID') {
      return { success: true, data: order };
    }

    // Try authoritative check via adapter
    try {
      const isPaid = await this.activeAdapter.verifyPaymentSignature({
        orderId,
        applicationId: order.candidateId,
      });
      if (isPaid) {
        order.status = 'PAID';
        order.paidAt = new Date().toISOString();
        const transactionRef = order.paymentId || `PAY_${orderId}`;

        // Persist payment to PostgreSQL integ_payment_txns model
        if (this.prisma?.integPaymentTxn) {
          try {
            const candidateUuid = this.isUuid(order.candidateId) ? order.candidateId : null;
            await this.prisma.integPaymentTxn.upsert({
              where: { txnCode: transactionRef },
              create: {
                txnCode: transactionRef,
                orderCode: order.orderId,
                candidateId: candidateUuid,
                candidateCode: order.candidateCode || order.receipt,
                gatewayName: this.activeAdapter.providerName,
                amount: CashfreePaymentAdapter.FIXED_EDP_FEE_INR,
                currency: 'INR',
                status: 'SUCCESS',
                settledAt: new Date(),
              },
              update: {
                status: 'SUCCESS',
                settledAt: new Date(),
              },
            });
            this.logger.log(`Persisted verified status payment transaction ${transactionRef} in PostgreSQL`);
          } catch (dbErr: any) {
            this.logger.warn(`Could not persist payment transaction to PostgreSQL: ${dbErr.message}`);
          }
        }

        if (this.prisma?.integPaymentOrder) {
          try {
            await this.prisma.integPaymentOrder.updateMany({
              where: { orderCode: order.orderId },
              data: { status: 'PAID' },
            });
          } catch (e: any) {}
        }

        if (order.candidateId) {
          await this.edpLifecycleService.confirmPaymentAndActivatePortal(
            order.candidateId,
            transactionRef,
            'CASHFREE_GATEWAY',
          );
        }
      }
    } catch (e: any) {
      this.logger.warn(`Error updating status for order ${orderId}: ${e.message}`);
    }

    return { success: true, data: order };
  }

  async handleWebhook(
    event: { event?: string; type?: string; payload?: any; data?: any },
    headers?: Record<string, string>,
    rawBody?: any,
  ) {
    this.logger.log(`Received Webhook Event: ${event.event || event.type || 'PAYMENT_EVENT'}`);
    this.logAudit('WEBHOOK_RECEIVED', { event, headers });

    // Priority 1: Mandatory Webhook HMAC Signature Verification
    if (this.activeAdapter.providerName === 'CASHFREE') {
      const isSignatureValid = await this.activeAdapter.verifyPaymentSignature({
        rawBody,
        headers,
      });

      if (!isSignatureValid) {
        this.logger.error('Cashfree Webhook signature validation FAILED. Rejecting unverified webhook.');
        this.logAudit('WEBHOOK_SIGNATURE_REJECTED', { headers });
        throw new UnauthorizedException('Invalid or missing Cashfree webhook signature.');
      }
      this.logger.log('Cashfree Webhook signature successfully VERIFIED.');
    }

    // Handle Cashfree Webhook Data
    if (event.data?.order?.order_id) {
      const orderId = event.data.order.order_id;
      const orderAmount = Number(event.data.order.order_amount);
      const orderCurrency = event.data.order.order_currency;
      const orderStatus = event.data.order.order_status;
      const payment = event.data.payment;
      const paymentStatus = payment?.payment_status;

      // Recover order from PostgreSQL if missing in memory (survives restart)
      let order = this.orderStore.get(orderId);
      if (!order && this.prisma?.integPaymentOrder) {
        try {
          const dbOrder = await this.prisma.integPaymentOrder.findUnique({
            where: { orderCode: orderId },
          });
          if (dbOrder) {
            order = {
              orderId: dbOrder.orderCode,
              provider: dbOrder.gatewayName,
              amount: Number(dbOrder.amount),
              currency: dbOrder.currency,
              receipt: dbOrder.candidateCode,
              candidateId: dbOrder.candidateId,
              candidateCode: dbOrder.candidateCode,
              paymentSessionId: dbOrder.paymentSessionId,
              paymentLink: dbOrder.paymentLink,
              status: dbOrder.status,
              createdAt: dbOrder.createdAt.toISOString(),
            };
            this.orderStore.set(orderId, order);
          }
        } catch (e: any) {}
      }

      const transactionRef = payment?.cf_payment_id?.toString() || `PAY_${orderId}`;
      const candidateCode = order?.candidateCode || order?.receipt || event.data.customer_details?.customer_id;
      let candidate = candidateCode ? this.edpLifecycleService.findCandidate(candidateCode) : null;
      if (!candidate && candidateCode) {
        candidate = await this.edpLifecycleService.findCandidateAsync(candidateCode);
      }

      const candUuid = this.isUuid(candidate?.id) ? candidate.id : (this.isUuid(order?.candidateId) ? order.candidateId : null);
      const candCode = candidate?.candidateCode || order?.candidateCode || candidateCode;

      // Authoritative Check: Query existing transaction from PostgreSQL
      let existingTxn: any = null;
      if (this.prisma?.integPaymentTxn) {
        try {
          existingTxn = await this.prisma.integPaymentTxn.findUnique({
            where: { txnCode: transactionRef },
          });
        } catch (e: any) {}
      }

      // Immutability Guard: Never downgrade or overwrite an authoritatively captured SUCCESS transaction!
      if (existingTxn?.status === 'SUCCESS') {
        this.logger.log(`Transaction ${transactionRef} is already authoritatively SUCCESS in PostgreSQL. Rejecting status downgrade/overwrite.`);
        return { success: true, message: 'Transaction already verified SUCCESS (immutable idempotent)' };
      }

      // Priority 3: Idempotent Webhook Handling on already PAID order or candidate
      if (order?.status === 'PAID' || candidate?.isPaid) {
        this.logger.log(`Order ${orderId} or candidate ${candidateCode} already marked PAID. Idempotent webhook acknowledgement.`);
        return { success: true, message: 'Webhook already processed (idempotent)' };
      }

      // Mandatory Guard: Do not default payment attempt to SUCCESS!
      // Persist actual attempted status if not SUCCESS/PAID
      if (orderStatus !== 'PAID' && paymentStatus !== 'SUCCESS') {
        const attemptedStatus = paymentStatus || orderStatus || 'FAILED';
        if (this.prisma?.integPaymentTxn) {
          try {
            await this.prisma.integPaymentTxn.upsert({
              where: { txnCode: transactionRef },
              create: {
                txnCode: transactionRef,
                orderCode: orderId,
                candidateId: candUuid,
                candidateCode: candCode,
                gatewayName: 'CASHFREE',
                amount: orderAmount,
                currency: orderCurrency || 'INR',
                status: attemptedStatus, // Persist actual status, NEVER default to SUCCESS
                settledAt: null,
              },
              update: {
                status: attemptedStatus,
              },
            });
            this.logger.log(`Persisted non-success payment attempt ${transactionRef} as status ${attemptedStatus}`);
          } catch (dbErr: any) {
            this.logger.warn(`Could not persist payment attempt to PostgreSQL: ${dbErr.message}`);
          }
        }
        return { success: true, message: `Recorded status ${attemptedStatus}` };
      }

      // Priority 1 & 4: Deep validation of Amount and Currency
      if (orderAmount !== CashfreePaymentAdapter.FIXED_EDP_FEE_INR) {
        this.logger.error(`Webhook amount mismatch: expected ₹${CashfreePaymentAdapter.FIXED_EDP_FEE_INR}, got ₹${orderAmount}`);
        throw new BadRequestException(
          `Payment order amount ₹${orderAmount} does not match mandatory EDP fee ₹${CashfreePaymentAdapter.FIXED_EDP_FEE_INR}`,
        );
      }

      if (orderCurrency !== 'INR') {
        this.logger.error(`Webhook currency mismatch: expected INR, got ${orderCurrency}`);
        throw new BadRequestException('Payment order currency is not INR.');
      }

      // Persist verified SUCCESS payment to PostgreSQL integ_payment_txns
      if (this.prisma?.integPaymentTxn) {
        try {
          await this.prisma.integPaymentTxn.upsert({
            where: { txnCode: transactionRef },
            create: {
              txnCode: transactionRef,
              orderCode: orderId,
              candidateId: candUuid,
              candidateCode: candCode,
              gatewayName: 'CASHFREE',
              amount: orderAmount,
              currency: orderCurrency || 'INR',
              status: 'SUCCESS',
              settledAt: new Date(),
            },
            update: {
              status: 'SUCCESS',
              settledAt: new Date(),
            },
          });
          this.logger.log(`Persisted webhook payment ${transactionRef} in PostgreSQL integ_payment_txns`);
        } catch (dbErr: any) {
          this.logger.warn(`Could not persist webhook payment to PostgreSQL: ${dbErr.message}`);
        }
      }

      let activationError: string | null = null;
      if (candidateCode) {
        try {
          await this.edpLifecycleService.confirmPaymentAndActivatePortal(
            candidateCode,
            transactionRef,
            'CASHFREE_WEBHOOK',
          );
        } catch (err: any) {
          this.logger.error(`Webhook: Could not activate portal for ${candidateCode}: ${err.message}`);
          activationError = err.message;
        }
      }

      // Distinguish payment receipt from portal activation outcome for gateway retry compatibility
      if (activationError) {
        return {
          success: true,
          message: `Payment persisted SUCCESS, but portal activation failed: ${activationError}`,
          paymentStatus: 'SUCCESS',
          portalActive: false,
          activationError,
        };
      }

      if (order) {
        order.status = 'PAID';
        order.paymentId = transactionRef;
        order.paidAt = new Date().toISOString();
      } else {
        this.orderStore.set(orderId, {
          orderId,
          status: 'PAID',
          paymentId: transactionRef,
          candidateId: candidate?.id,
          candidateCode,
          amount: orderAmount,
          currency: orderCurrency,
          paidAt: new Date().toISOString(),
        });
      }

      if (this.prisma?.integPaymentOrder) {
        try {
          await this.prisma.integPaymentOrder.updateMany({
            where: { orderCode: orderId },
            data: { status: 'PAID' },
          });
        } catch (e: any) {}
      }

      return {
        success: true,
        message: 'Webhook processed successfully: payment captured and portal activated',
        paymentStatus: 'SUCCESS',
        portalActive: true,
      };
    }

    return { success: true, message: 'Webhook processed successfully' };
  }

  async processRefund(params: { paymentId: string; amount: number; reason?: string }) {
    const result = await this.activeAdapter.initiateRefund(params);
    this.logAudit('REFUND_PROCESSED', result);
    return { success: true, data: result, timestamp: new Date().toISOString() };
  }

  async getSettlement(settlementId: string) {
    const details = await this.activeAdapter.fetchSettlementDetails(settlementId);
    return { success: true, data: details, timestamp: new Date().toISOString() };
  }

  private isUuid(val?: string): boolean {
    return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  private logAudit(action: string, payload: any) {
    this.auditLog.push({
      id: `pay-log-${Date.now()}`,
      action,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
