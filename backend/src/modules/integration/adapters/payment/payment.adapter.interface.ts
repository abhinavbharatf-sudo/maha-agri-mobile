// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 2: Payment Provider Adapter Interface (Adapter Pattern)
// ============================================================================

export interface PaymentCustomerDetails {
  customerId?: string;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
}

export interface PaymentOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  idempotencyKey?: string;
  customerDetails?: PaymentCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentOrderResult {
  success: boolean;
  providerName: string;
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  paymentSessionId?: string;
  paymentLink?: string;
  environment?: string;
}

export interface SignatureVerifyParams {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  applicationId?: string;
  rawBody?: any;
  headers?: Record<string, string>;
}

export interface RefundParams {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface IPaymentProviderAdapter {
  readonly providerName: string;

  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPaymentSignature(params: SignatureVerifyParams): Promise<boolean>;
  initiateRefund(params: RefundParams): Promise<RefundResult>;
  fetchSettlementDetails(settlementId: string): Promise<any>;
}
