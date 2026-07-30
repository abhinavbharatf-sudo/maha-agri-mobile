import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications } from '../lib/api';
import { getMyPayments } from '../lib/api';
import type { RmsPayment, RmsPaymentReceipt, RmsApplicationWithDetails } from '../lib/types';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pending',        icon: Clock,         color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  initiated: { label: 'Processing',     icon: Clock,         color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  success:   { label: 'Paid',           icon: CheckCircle2,  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  failed:    { label: 'Failed',         icon: AlertCircle,   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  refunded:  { label: 'Refunded',       icon: CheckCircle2,  color: 'text-neutral-600',bg: 'bg-neutral-50',border: 'border-neutral-200' },
  waived:    { label: 'Waived by HR',   icon: CheckCircle2,  color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200' },
};

type PaymentWithRelations = RmsPayment & {
  receipt?: RmsPaymentReceipt;
  application?: RmsApplicationWithDetails;
};

export default function CandidatePayments() {
  const { profile } = useCandidateAuth();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyPayments(profile.id).then(r => {
      setPayments((r.data ?? []) as PaymentWithRelations[]);
      setLoading(false);
    });
  }, [profile]);

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-xl border border-primary-100" />)}</div>;
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
        <CreditCard className="w-12 h-12 text-primary-200 mx-auto mb-3" />
        <p className="font-bold text-primary-600 text-lg mb-2">No Payment Records</p>
        <p className="text-primary-500 text-sm">Your application and onboarding fee payments will appear here.</p>
      </div>
    );
  }

  const total = payments.filter(p => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Paid', value: `₹${total.toLocaleString('en-IN')}`, color: 'text-emerald-700' },
          { label: 'Pending', value: payments.filter(p => p.status === 'pending').length.toString(), color: 'text-amber-700' },
          { label: 'Total Records', value: payments.length.toString(), color: 'text-primary-700' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-primary-100 rounded-xl p-4 text-center">
            <div className={`text-xl font-black mb-0.5 ${item.color}`}>{item.value}</div>
            <div className="text-xs font-semibold text-primary-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Payment list */}
      <div className="space-y-3">
        {payments.map((p, idx) => {
          const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-xl border-2 p-4 ${cfg.border}`}>
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
    </div>
  );
}
