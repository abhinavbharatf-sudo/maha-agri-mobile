import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Bell, FileText, IndianRupee } from 'lucide-react';
import { getApplication } from '../lib/api';
import type { RmsApplicationWithDetails } from '../lib/types';

export default function ApplicationSuccess() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<RmsApplicationWithDetails | null>(null);

  useEffect(() => {
    if (applicationId) getApplication(applicationId).then(r => setApp(r.data));
  }, [applicationId]);

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-primary-100 max-w-lg w-full p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-11 h-11 text-emerald-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-primary-900 mb-2">Application Submitted!</h1>
        <p className="text-primary-600 mb-6">
          Your application for <strong>{app?.job_posting?.title ?? 'this position'}</strong> has been received successfully.
        </p>

        {app && (
          <div className="bg-primary-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-primary-500">Application No.</span>
              <span className="font-bold text-primary-900 tracking-wider">{app.application_number}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-primary-500">Position</span>
              <span className="font-semibold text-primary-800">{app.job_posting?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-500">Status</span>
              <span className="font-semibold text-blue-700">Submitted</span>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Bell className="w-4 h-4 shrink-0" />
            You will receive WhatsApp and email notifications at every stage.
          </div>
          {app?.job_posting?.application_fee_amount && app.job_posting.application_fee_amount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <IndianRupee className="w-4 h-4 shrink-0" />
              Application fee of ₹{app.job_posting.application_fee_amount.toLocaleString('en-IN')} is required to complete your application.
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg text-sm text-primary-700">
            <FileText className="w-4 h-4 shrink-0" />
            Track your application status from your dashboard.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {app && Number(app.job_posting?.application_fee_amount ?? 0) === 0 ? (
            <Link
              to="/candidate/interviews"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm"
            >
              Select Interview Slot <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/candidate/dashboard"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            to="/careers"
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            More Positions
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
