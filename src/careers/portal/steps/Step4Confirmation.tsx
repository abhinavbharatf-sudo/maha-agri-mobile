import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowRight,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
  Monitor,
  MapPin,
  X
} from 'lucide-react';
import type { RmsJobPosting, RmsInterviewSlot, RmsInterviewBooking } from '../../lib/types';
import { useCandidateAuth } from '../../lib/CandidateAuthContext';
import { getMyInterviewBooking, listAvailableSlots, bookApplicationToSlot, getMyPayments } from '../../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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

export interface Step4ConfirmationProps {
  applicationNumber: string;
  applicationId: string;
  submittedAt: string | null;
  status?: string | null;
  applicationFeeAmount?: number;
  job: RmsJobPosting;
  projectName?: string | null;
  masterProfile?: any;
  jobSpecific?: any;
}

export default function Step4Confirmation({
  applicationNumber,
  applicationId,
  submittedAt,
  status,
  applicationFeeAmount = 0,
  job,
  projectName,
}: Step4ConfirmationProps) {
  const navigate = useNavigate();
  const { profile } = useCandidateAuth();

  const isFreeJob = applicationFeeAmount === 0;

  // Status & Verification States
  const [currentStatus, setCurrentStatus] = useState<string>(
    status || (isFreeJob ? 'submitted' : 'payment_pending')
  );

  const [isPaymentVerified, setIsPaymentVerified] = useState<boolean>(
    isFreeJob ||
    currentStatus === 'payment_successful' ||
    currentStatus === 'interview_scheduled' ||
    currentStatus === 'interview_slot_pending'
  );

  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Interview Booking States
  const [interviewBooking, setInterviewBooking] = useState<(RmsInterviewBooking & { slot?: RmsInterviewSlot }) | null>(null);
  const [bookingLoading, setBookingLoading] = useState<boolean>(true);
  const [showSlotPicker, setShowSlotPicker] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<RmsInterviewSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotBookingProcessing, setSlotBookingProcessing] = useState<boolean>(false);
  const [slotBookingError, setSlotBookingError] = useState<string | null>(null);

  // ── Authoritative Hydration: Verified Payments & Scheduled Bookings ──────────
  const refreshApplicationState = useCallback(async () => {
    if (!applicationId) return;

    try {
      // 1. Check existing interview booking for this specific application
      const bookingRes = await getMyInterviewBooking(applicationId);
      if (bookingRes.data) {
        setInterviewBooking(bookingRes.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setBookingLoading(false);
    }

    // 2. Check verified payment status if paid position
    if (!isFreeJob && profile?.id) {
      try {
        const payRes = await getMyPayments(profile.id);
        const payments = payRes.data || [];
        const appPayment = payments.find(p => p.application_id === applicationId || (p.application as any)?.id === applicationId);
        if (appPayment && appPayment.status === 'success') {
          setIsPaymentVerified(true);
          setCurrentStatus('payment_successful');
        }
      } catch {
        // Graceful fallback
      }
    }
  }, [applicationId, isFreeJob, profile?.id]);

  useEffect(() => {
    refreshApplicationState();
  }, [refreshApplicationState]);

  // ── Formatted Submission Date & Time ────────────────────────────────────────
  const formattedTimestamp = submittedAt
    ? new Date(submittedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  // ── Razorpay Payment Gateway Integration ────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (paymentProcessing) return;
    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      // 1. Create order on authoritative NestJS backend
      const res = await fetch(`${API_BASE_URL}/api/v1/integration/rms/payment/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          candidateId: profile?.id,
          customerName: profile?.full_name || '',
          customerPhone: profile?.mobile || '',
          customerEmail: profile?.email || '',
        }),
      });

      const orderData = await res.json().catch(() => ({}));

      if (!res.ok || !orderData.orderId) {
        throw new Error(orderData.message || 'Payment gateway service is currently unavailable. You may retry here or from Candidate Dashboard.');
      }

      // 2. Load Razorpay Checkout SDK
      const sdkReady = await loadRazorpayScript();
      if (!sdkReady) {
        throw new Error('Could not load payment checkout script. Please check your internet connection and try again.');
      }

      // 3. Launch Checkout Modal
      const rzpOptions = {
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency || 'INR',
        name: 'MAHA-AGRI Recruitment Platform',
        description: `Application Fee - ${job.title}`,
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || '',
          contact: profile?.mobile || '',
          email: profile?.email || '',
        },
        theme: { color: '#16a34a' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setPaymentProcessing(true);
          try {
            // Authoritative server-side signature verification
            const verifyRes = await fetch(`${API_BASE_URL}/api/v1/integration/rms/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicationId,
                candidateId: profile?.id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));

            if (verifyRes.ok && verifyData.success) {
              setIsPaymentVerified(true);
              setCurrentStatus('payment_successful');
              setPaymentError(null);
              await refreshApplicationState();
            } else {
              setPaymentError(verifyData.message || 'Payment signature verification failed. Please contact support.');
            }
          } catch (verifyErr: any) {
            setPaymentError(`Network verification error: ${verifyErr.message}`);
          } finally {
            setPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (failResp: any) => {
        setPaymentProcessing(false);
        setPaymentError(`Payment failed: ${failResp.error?.description || 'Transaction declined by bank.'}`);
      });

      rzp.open();
    } catch (err: any) {
      setPaymentProcessing(false);
      setPaymentError(err.message || 'Could not initiate payment. Please try again or proceed to Payments from Dashboard.');
    }
  };

  // ── Online Interview Slot Booking Flow ──────────────────────────────────────
  const handleOpenSlotPicker = async () => {
    setShowSlotPicker(true);
    setSlotsLoading(true);
    setSlotBookingError(null);
    try {
      const { data, error } = await listAvailableSlots(job.id);
      if (error) {
        setSlotBookingError('Unable to load available slots. Please try again.');
      } else {
        setAvailableSlots(data || []);
      }
    } catch {
      setSlotBookingError('Failed to load interview slots. Please check your connection.');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleConfirmSlotBooking = async () => {
    if (!selectedSlotId || slotBookingProcessing) return;
    setSlotBookingProcessing(true);
    setSlotBookingError(null);

    try {
      const { data, error } = await bookApplicationToSlot(applicationId, selectedSlotId);
      if (error || !data) {
        setSlotBookingError((error as any)?.message || 'Failed to book slot. Please select another slot.');
        return;
      }
      setInterviewBooking(data);
      setShowSlotPicker(false);
      setCurrentStatus('interview_scheduled');
      await refreshApplicationState();
    } catch (err: any) {
      setSlotBookingError(err.message || 'An unexpected error occurred while booking.');
    } finally {
      setSlotBookingProcessing(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── 1. SUCCESS CONFIRMATION ────────────────────────────────────────── */}
      <div className="text-center pt-2">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#102a43] tracking-tight mb-1.5">
          Application Submitted Successfully
        </h1>
        <p className="text-xs sm:text-sm text-[#486581] max-w-md mx-auto">
          Your application has been successfully submitted.
        </p>
      </div>

      {/* ── 2. APPLICATION REFERENCE CARD (Dark Navy) ───────────────────────── */}
      <div className="bg-[#102a43] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
            Official Application Number
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider text-white">
            {applicationNumber || 'PENDING'}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Job Title</span>
            <span className="font-bold text-white text-sm">{job.title}</span>
          </div>

          {projectName && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Project Name</span>
              <span className="font-bold text-white text-sm">{projectName}</span>
            </div>
          )}

          <div className="sm:col-span-2">
            <span className="text-[11px] text-slate-400 block mb-0.5">Submission Date &amp; Time</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedTimestamp}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. DYNAMIC NEXT STEP (PRIMARY ACTION) ────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#102a43] flex items-center gap-1.5">
          <span>Next Step</span>
        </h2>

        {/* ── SCENARIO A: PAYMENT REQUIRED (Fee > 0 and Unpaid) ── */}
        {!isFreeJob && !isPaymentVerified ? (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <span className="text-[11px] font-semibold text-[#627d98] block">Application Processing Fee</span>
                <span className="text-xl font-extrabold text-[#102a43]">
                  ₹{applicationFeeAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Payment Pending
              </span>
            </div>

            <p className="text-xs text-[#486581] leading-relaxed">
              Please complete your application processing fee payment via secure online payment to activate your application and proceed to interview slot scheduling.
            </p>

            {paymentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Payment Error</p>
                  <p className="mt-0.5">{paymentError}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={paymentProcessing}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {paymentProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : interviewBooking ? (
          /* ── INTERVIEW ALREADY BOOKED: Confirmed Appointment Card ── */
          <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Interview Slot Confirmed</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Confirmed
              </span>
            </div>

            <div className="space-y-2 text-xs text-emerald-950">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Date:{' '}
                  <strong>
                    {new Date(interviewBooking.slot?.slot_date || interviewBooking.booked_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Time: <strong>{interviewBooking.slot?.slot_time || 'Scheduled Slot'}</strong>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Format:{' '}
                  <strong>
                    {interviewBooking.slot?.mode === 'online'
                      ? 'Online Video Interview'
                      : 'District Coordination Centre Interview'}
                  </strong>
                </span>
              </p>
            </div>
          </div>
        ) : (
          /* ── SCENARIO B: NO PAYMENT REQUIRED OR PAYMENT CONFIRMED ── */
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
            {!isFreeJob && isPaymentVerified && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Fee Payment Confirmed (₹{applicationFeeAmount.toLocaleString('en-IN')})
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">Paid</span>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-[#102a43] mb-1">Book Online Interview Slot</h3>
              <p className="text-xs text-[#486581] leading-relaxed">
                Choose an available slot for your personal selection interview. Slots are confirmed instantly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenSlotPicker}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Online Interview Slot</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── 4. NAVIGATION ACTIONS (Secondary & Tertiary) ───────────────────────── */}
      <div className="pt-2 space-y-2.5">
        {/* Secondary Action 1: Go to Candidate Dashboard */}
        <button
          type="button"
          onClick={() => navigate('/candidate/dashboard')}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#102a43] border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-600" />
          <span>Go to Candidate Dashboard</span>
        </button>

        {/* Secondary Action 2: View My Applications */}
        <button
          type="button"
          onClick={() => navigate('/candidate/applications')}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>View My Applications</span>
        </button>
      </div>

      {/* ── 5. INTERVIEW SLOT PICKER MODAL ────────────────────────────────────── */}
      {showSlotPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#102a43]">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Available Interview Slots
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotPicker(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {slotsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                <p>Checking available interview slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#102a43]">No Slots Currently Available</p>
                  <p className="text-xs text-[#627d98] leading-relaxed max-w-xs mx-auto">
                    Interview slots for this position are being scheduled. You will be notified via SMS and WhatsApp once slots open.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSlotPicker(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Close &amp; Return
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#486581]">
                  Select your preferred slot date and time:
                </p>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableSlots.map(slot => {
                    const isSelected = selectedSlotId === slot.id;
                    const isOnline = slot.mode === 'online';
                    const slotDate = new Date(slot.slot_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#102a43] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {slotDate}
                          </span>
                          <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {slot.slot_time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            {isOnline ? <Monitor className="w-3 h-3 text-blue-500" /> : <MapPin className="w-3 h-3 text-amber-500" />}
                            {isOnline ? 'Online Video' : (slot.venue || 'District Center')}
                          </span>
                          <span className="text-emerald-700 font-semibold">Available</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {slotBookingError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {slotBookingError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSlotPicker(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSlotBooking}
                    disabled={!selectedSlotId || slotBookingProcessing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {slotBookingProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <span>Confirm Booking</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
