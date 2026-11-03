import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertCircle, Clock, ExternalLink, IndianRupee, FileCheck, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications, getMyPayments, initiateApplicationPayment } from '../lib/api';
import type { RmsPayment, RmsPaymentReceipt, RmsApplicationWithDetails } from '../lib/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pending Verification', icon: Clock,         color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  initiated: { label: 'Initiated',            icon: Clock,         color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  success:   { label: 'Paid & Reconciled',    icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  failed:    { label: 'Failed',               icon: AlertCircle,   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  refunded:  { label: 'Refunded',             icon: CheckCircle2,  color: 'text-neutral-600',bg: 'bg-neutral-50',border: 'border-neutral-200' },
  waived:    { label: 'Waived by HR',         icon: CheckCircle2,  color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200' },
};

type PaymentWithRelations = RmsPayment & {
  receipt?: RmsPaymentReceipt;
  application?: RmsApplicationWithDetails;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CandidatePayments() {
  const { profile } = useCandidateAuth();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [pendingApps, setPendingApps] = useState<RmsApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadData = async (candidateId: string) => {
    try {
      const [payRes, appRes] = await Promise.all([
        getMyPayments(candidateId),
        getMyApplications(candidateId),
      ]);
      setPayments((payRes.data ?? []) as PaymentWithRelations[]);
      const apps = (appRes.data ?? []) as RmsApplicationWithDetails[];
      setPendingApps(apps.filter(a => a.status === 'payment_pending' || a.status === 'onboarding_pending'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    loadData(profile.id);
  }, [profile]);

  // Online Razorpay Checkout
  const handlePayOnline = async (app: RmsApplicationWithDetails) => {
    if (!profile) return;
    setProcessingAppId(app.id);
    setActionMessage(null);

    try {
      // 1. Create order on authoritative NestJS backend
      const res = await fetch(`${API_BASE_URL}/api/v1/integration/rms/payment/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          candidateId: profile.id,
          customerName: profile.full_name || '',
          customerPhone: profile.mobile || '',
          customerEmail: profile.email || '',
        }),
      });

      const orderData = await res.json().catch(() => ({}));

      if (!res.ok || !orderData.orderId) {
        throw new Error(orderData.message || 'Failed to create Razorpay payment order. Backend service may be unreachable.');
      }

      // 2. Load Razorpay Checkout SDK
      const sdkReady = await loadRazorpayScript();
      if (!sdkReady) {
        throw new Error('Could not load Razorpay payment gateway script. Please check your internet connection or ad-blocker.');
      }

      // 3. Launch Checkout Modal
      const rzpOptions = {
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency || 'INR',
        name: 'MAHA-AGRI Recruitment Platform',
        description: `Application Fee - ${app.job_posting?.title || 'Recruitment'}`,
        order_id: orderData.orderId,
        prefill: {
          name: profile.full_name || '',
          contact: profile.mobile || '',
          email: profile.email || '',
        },
        theme: { color: '#047857' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setProcessingAppId(app.id);
          try {
            // 4. Authoritative server-side signature verification
            const verifyRes = await fetch(`${API_BASE_URL}/api/v1/integration/rms/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicationId: app.id,
                candidateId: profile.id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));

            if (verifyRes.ok && verifyData.success) {
              setActionMessage({
                type: 'success',
                text: `Payment successfully verified via Razorpay! Ref: ${response.razorpay_payment_id}. Your application is now confirmed and ready for interview scheduling.`,
              });
              await loadData(profile.id);
            } else {
              setActionMessage({
                type: 'error',
                text: verifyData.message || 'Payment signature verification failed. Please contact HR support.',
              });
            }
          } catch (verifyErr: any) {
            setActionMessage({
              type: 'error',
              text: `Network error during payment verification: ${verifyErr.message}`,
            });
          } finally {
            setProcessingAppId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingAppId(null);
            setActionMessage({
              type: 'info',
              text: 'Payment checkout dismissed. Your pending fee obligation remains active.',
            });
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (failResp: any) => {
        setProcessingAppId(null);
        setActionMessage({
          type: 'error',
          text: `Payment failed: ${failResp.error?.description || 'Transaction declined by bank'}`,
        });
      });

      rzp.open();
    } catch (err: any) {
      setProcessingAppId(null);
      setActionMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while launching payment.',
      });
    }
  };

  // Offline / Reference Registration Fallback
  const handleRegisterIntent = async (appId: string, feeAmount: number) => {
    if (!profile) return;
    setProcessingAppId(appId);
    setActionMessage(null);
    try {
      const { data, error } = await initiateApplicationPayment(appId, feeAmount, 'manual', 'Application Fee');
      if (error || !data) {
        setActionMessage({
          type: 'error',
          text: error || 'Failed to register payment intent record. Please try again.',
        });
        return;
      }
      setActionMessage({
        type: 'success',
        text: `Payment obligation reference generated: ${data.id.slice(0, 8)}. Awaiting desk verification.`,
      });
      await loadData(profile.id);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setProcessingAppId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white animate-pulse rounded-xl border border-primary-100" />
        ))}
      </div>
    );
  }

  const hasAnyRecords = payments.length > 0 || pendingApps.length > 0;

  if (!hasAnyRecords) {
    return (
      <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
        <CreditCard className="w-12 h-12 text-primary-200 mx-auto mb-3" />
        <p className="font-bold text-primary-600 text-lg mb-2">No Payment Records</p>
        <p className="text-primary-500 text-sm">Your application and onboarding fee payments will appear here.</p>
      </div>
    );
  }

  const total = payments.filter(p => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === 'pending').length + pendingApps.length;

  return (
    <div className="space-y-5">
      {/* Alert banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : actionMessage.type === 'info' ? (
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Paid', value: `₹${total.toLocaleString('en-IN')}`, color: 'text-emerald-700' },
          { label: 'Pending Items', value: totalPending.toString(), color: 'text-amber-700' },
          { label: 'Total Records', value: (payments.length + pendingApps.length).toString(), color: 'text-primary-700' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-primary-100 rounded-xl p-4 text-center">
            <div className={`text-xl font-black mb-0.5 ${item.color}`}>{item.value}</div>
            <div className="text-xs font-semibold text-primary-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Fee Applications */}
      {pendingApps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
              Pending Fee Obligations
            </h3>
          </div>
          {pendingApps.map(app => {
            const fee = Number(app.job_posting?.application_fee_amount ?? 0);
            const matchingPayment = payments.find(p => p.application_id === app.id);
            const isProcessing = processingAppId === app.id;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50/50 rounded-xl border-2 border-amber-200 p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="font-bold text-primary-900 text-base">
                        Application Fee — {app.job_posting?.title ?? 'Recruitment Position'}
                      </span>
                      <span className="text-lg font-black text-amber-800">
                        ₹{fee.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-500 mb-2">
                      <span className="font-mono">App No: {app.application_number}</span>
                      <span className="font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Payment Pending
                      </span>
                      {matchingPayment && (
                        <span className="font-mono text-primary-600 bg-primary-100/70 px-2 py-0.5 rounded-full">
                          Ref: {matchingPayment.id.slice(0, 8)} ({matchingPayment.status})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-amber-800 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200/60 mb-4">
                      Your application has been registered with number <strong>{app.application_number}</strong>. Complete online payment via Razorpay UPI, Net Banking, or Card to activate your candidature and unlock interview slot selection.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handlePayOnline(app)}
                        disabled={isProcessing}
                        className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing Payment...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-emerald-300" />
                            <span>Pay Fee Online (₹{fee.toLocaleString('en-IN')})</span>
                          </>
                        )}
                      </button>

                      {!matchingPayment && (
                        <button
                          onClick={() => handleRegisterIntent(app.id, fee)}
                          disabled={isProcessing}
                          className="py-2.5 px-3.5 border border-primary-200 hover:bg-primary-50 text-primary-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <FileCheck className="w-4 h-4 text-primary-500" />
                          <span>Generate Offline Reference</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Recorded Payment Transactions */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-600" />
            <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
              Payment Transaction History
            </h3>
          </div>
          {payments.map((p, idx) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-xl border-2 p-4 ${cfg.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="font-bold text-primary-900 text-sm capitalize">
                        {p.payment_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-base font-black ${cfg.color}`}>₹{Number(p.amount).toLocaleString('en-IN')}</span>
                    </div>
                    {p.application?.job_posting?.title && (
                      <p className="text-xs text-primary-600 mb-1">{(p.application.job_posting as { title?: string }).title}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-400">
                      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                      {p.gateway && <span>{p.gateway}</span>}
                      {p.gateway_payment_id && <span className="font-mono">{p.gateway_payment_id}</span>}
                      {p.completed_at && <span>{new Date(p.completed_at).toLocaleDateString('en-IN')}</span>}
                    </div>
                    {(p as PaymentWithRelations).receipt && (
                      <p className="mt-1.5 text-xs font-mono text-primary-500">
                        Receipt: {(p as PaymentWithRelations).receipt!.receipt_number}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
