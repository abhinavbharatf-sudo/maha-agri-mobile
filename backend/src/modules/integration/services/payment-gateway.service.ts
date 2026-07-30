// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Integration 2: Payment Gateway Orchestration & Webhook Service
// ============================================================================

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RazorpayPaymentAdapter } from '../adapters/payment/razorpay-payment.adapter';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private idempotencyCache = new Map<string, any>();
  private orderStore = new Map<string, any>();
  private auditLog: any[] = [];

  constructor(private readonly razorpayAdapter: RazorpayPaymentAdapter) {}

  async createOrder(params: { amount: number; receipt: string; idempotencyKey?: string }) {
    if (params.idempotencyKey && this.idempotencyCache.has(params.idempotencyKey)) {
      this.logger.log(`Idempotent order request detected for key ${params.idempotencyKey}`);
      return this.idempotencyCache.get(params.idempotencyKey);
    }

    const order = await this.razorpayAdapter.createOrder({
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
    });

    const record = {
      orderId: order.orderId,
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    };

    this.orderStore.set(order.orderId, record);
    this.logAudit('ORDER_CREATED', record);

    if (params.idempotencyKey) {
      this.idempotencyCache.set(params.idempotencyKey, {
        success: true,
        message: 'Order created',
        data: record,
      });
    }

    return {
      success: true,
      message: 'Payment order created successfully',
      data: record,
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(params: { orderId: string; paymentId: string; signature: string }) {
    const isValid = await this.razorpayAdapter.verifyPaymentSignature(params);

    if (!isValid) {
      this.logAudit('PAYMENT_VERIFICATION_FAILED', params);
      throw new BadRequestException('Invalid payment signature verification failed');
    }

    const order = this.orderStore.get(params.orderId);
    if (order) {
      order.status = 'PAID';
      order.paymentId = params.paymentId;
      order.paidAt = new Date().toISOString();
    }

    this.logAudit('PAYMENT_VERIFIED_SUCCESS', { ...params, amount: order?.amount });

    return {
      success: true,
      message: 'Payment verified and captured successfully',
      data: {
        orderId: params.orderId,
        paymentId: params.paymentId,
        status: 'PAID',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async handleWebhook(event: { event: string; payload: any }) {
    this.logger.log(`Received Webhook Event: ${event.event}`);
    this.logAudit('WEBHOOK_RECEIVED', event);

    switch (event.event) {
      case 'payment.captured':
        this.logger.log(`Webhook Payment Captured: ${event.payload?.payment?.entity?.id}`);
        break;
      case 'refund.processed':
        this.logger.log(`Webhook Refund Processed: ${event.payload?.refund?.entity?.id}`);
        break;
      case 'settlement.processed':
        this.logger.log(`Webhook Settlement Settled: ${event.payload?.settlement?.entity?.id}`);
        break;
      default:
        this.logger.log(`Unhandled Webhook Event ${event.event}`);
    }

    return { success: true, message: 'Webhook processed' };
  }

  async processRefund(params: { paymentId: string; amount: number; reason?: string }) {
    const result = await this.razorpayAdapter.initiateRefund(params);
    this.logAudit('REFUND_PROCESSED', result);
    return { success: true, data: result, timestamp: new Date().toISOString() };
  }

  async getSettlement(settlementId: string) {
    const details = await this.razorpayAdapter.fetchSettlementDetails(settlementId);
    return { success: true, data: details, timestamp: new Date().toISOString() };
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
