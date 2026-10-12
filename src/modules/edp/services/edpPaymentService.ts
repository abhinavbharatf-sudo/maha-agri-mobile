/**
 * MAHA-AGRI Government Digital Operations Platform
 * EDP Training Fee Payment Gateway Service
 * Handles Cashfree Hosted Checkout, Candidate Linking, Authoritative Verification & Portal Activation.
 * Mandatory Approved Fixed Fee: ₹2,068 INR per candidate.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SUBMITTED_ASSESSMENTS_KEY = 'maha_agri_submitted_entrepreneur_assessments_v1';
export const PENDING_PAYMENT_ORDER_KEY = 'maha_agri_edp_pending_order_v1';

// Mandatory Approved Fixed EDP Training Fee: ₹2,068 INR
export const EDP_STANDARD_TRAINING_FEE_INR = 2068;

export interface PaymentOrderResponse {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    provider?: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    paymentSessionId?: string;
    paymentLink?: string;
    environment?: string;
    createdAt?: string;
  };
  error?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    paymentId: string;
    candidateId?: string;
    status: string;
  };
  error?: string;
}

export interface InitiatePaymentOptions {
  candidateId: string;
  candidateName: string;
  mobileNumber: string;
  email?: string;
  district?: string;
  taluka?: string;
  amount?: number;
  onSuccess: (paymentId: string, orderId: string) => void;
  onError: (errorMessage: string) => void;
  onDismiss?: () => void;
}

class EdpPaymentService {
  /**
   * 1. Authoritatively synchronizes candidate assessment with backend registry before checkout
   */
  public async syncAssessmentCandidate(params: {
    candidateId: string;
    fullName: string;
    mobileNumber: string;
    districtId?: string;
    talukaId?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/edp/candidates/sync-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.warn(`[EdpPaymentService] Candidate sync returned HTTP ${response.status}`);
      }
      return response.ok;
    } catch (err) {
      console.warn('[EdpPaymentService] Could not reach candidate sync endpoint:', err);
      return false;
    }
  }

  /**
   * 2. Create secure Cashfree payment order on government backend with strict ₹2,068 fee
   */
  public async createPaymentOrder(params: {
    candidateId: string;
    candidateName?: string;
    mobileNumber?: string;
    email?: string;
    returnUrl?: string;
  }): Promise<PaymentOrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/integration/payment/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: EDP_STANDARD_TRAINING_FEE_INR,
          receipt: params.candidateId,
          candidateId: params.candidateId,
          customerName: params.candidateName || 'EDP Candidate',
          customerPhone: params.mobileNumber || '9999999999',
          customerEmail: params.email,
          returnUrl: params.returnUrl,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.message || json.error || `Payment gateway returned HTTP ${response.status}`);
      }

      return json;
    } catch (err: any) {
      console.error('[EdpPaymentService] Error creating payment order:', err);
      return {
        success: false,
        error: err.message || 'Payment order creation failed',
      };
    }
  }

  /**
   * 3. Authoritative query for order and payment status
   */
  public async verifyOrderStatus(
    orderId: string,
    candidateId?: string,
  ): Promise<{
    isPaid: boolean;
    paymentId?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/integration/payment/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );

      const json = await response.json().catch(() => ({}));

      if (response.ok && json.data?.status === 'PAID') {
        const paymentId = json.data.paymentId || `PAY_${orderId}`;
        if (candidateId) {
          this.recordPaymentLocally(candidateId, paymentId, EDP_STANDARD_TRAINING_FEE_INR);
        }
        return { isPaid: true, paymentId, message: 'Payment successfully verified' };
      }

      return {
        isPaid: false,
        message: json.message || json.data?.status || 'Payment pending or not completed',
      };
    } catch (err: any) {
      console.error('[EdpPaymentService] Error verifying order status:', err);
      return {
        isPaid: false,
        message: err.message || 'Unable to contact verification service',
      };
    }
  }

  /**
   * 4. Verify payment with backend via POST /verify
   */
  public async verifyPaymentSignature(params: {
    orderId: string;
    paymentId?: string;
    signature?: string;
    candidateId?: string;
  }): Promise<PaymentVerificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/integration/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.message || json.error || `Payment verification failed (HTTP ${response.status})`);
      }

      return json;
    } catch (err: any) {
      console.error('[EdpPaymentService] Error verifying payment:', err);
      return {
        success: false,
        error: err.message || 'Server-side payment verification failed',
      };
    }
  }

  /**
   * 5. Confirm candidate portal activation upon verified payment
   */
  public async activateCandidatePortal(candidateId: string, transactionRef: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/edp/candidates/${encodeURIComponent(candidateId)}/activate-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            transactionRef,
            actorUserId: candidateId,
          }),
        },
      );

      return response.ok;
    } catch (err) {
      console.warn('[EdpPaymentService] Could not reach candidate portal activation endpoint:', err);
      return false;
    }
  }

  /**
   * 6. Record payment status locally in submitted assessments store
   */
  public recordPaymentLocally(
    candidateId: string,
    paymentId: string,
    amount: number = EDP_STANDARD_TRAINING_FEE_INR,
  ): void {
    try {
      const raw = localStorage.getItem(SUBMITTED_ASSESSMENTS_KEY);
      if (!raw) return;
      const records = JSON.parse(raw);
      if (Array.isArray(records)) {
        const updated = records.map((rec: any) => {
          if (rec.candidateId === candidateId || rec.id === candidateId) {
            return {
              ...rec,
              paymentStatus: 'PAID',
              paymentId,
              paidAmount: amount,
              paidAt: new Date().toISOString(),
              lifecycleStatus: 'FEE_PAID_ENROLLED',
            };
          }
          return rec;
        });
        localStorage.setItem(SUBMITTED_ASSESSMENTS_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[EdpPaymentService] Failed to record payment locally:', e);
    }
  }

  /**
   * 7. Complete end-to-end Cashfree Hosted Checkout initiation workflow
   * Performs candidate registry sync, order generation at ₹2,068 INR, and full-page redirect to Cashfree.
   */
  public async initiatePaymentWorkflow(opts: InitiatePaymentOptions): Promise<void> {
    // 1. Ensure candidate is registered on backend before payment order
    await this.syncAssessmentCandidate({
      candidateId: opts.candidateId,
      fullName: opts.candidateName,
      mobileNumber: opts.mobileNumber,
      districtId: opts.district,
      talukaId: opts.taluka,
    });

    // 2. Prepare return URL for Cashfree hosted checkout redirect
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    // Cashfree replaces {order_id} with the actual order ID in return_url
    const returnUrl = `${origin}${pathname}?step=9&candidate_id=${encodeURIComponent(opts.candidateId)}&order_id={order_id}`;

    // 3. Create Cashfree payment order on backend (Strict ₹2,068 INR)
    const orderRes = await this.createPaymentOrder({
      candidateId: opts.candidateId,
      candidateName: opts.candidateName,
      mobileNumber: opts.mobileNumber,
      email: opts.email,
      returnUrl,
    });

    if (!orderRes.success || !orderRes.data?.paymentLink) {
      opts.onError(
        orderRes.error ||
          orderRes.message ||
          'Unable to establish secure payment order with Cashfree Payments gateway. Please try again.',
      );
      return;
    }

    const { orderId, paymentLink } = orderRes.data;

    // 4. Save pending payment record in sessionStorage so Step 9 can recover state on return
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          PENDING_PAYMENT_ORDER_KEY,
          JSON.stringify({
            orderId,
            candidateId: opts.candidateId,
            amount: EDP_STANDARD_TRAINING_FEE_INR,
            timestamp: Date.now(),
          }),
        );
      }
    } catch (e) {
      console.warn('[EdpPaymentService] Failed to store pending order in sessionStorage:', e);
    }

    // 5. Full-page redirect to Cashfree-hosted checkout experience
    window.location.href = paymentLink;
  }
}

export const edpPaymentService = new EdpPaymentService();
