import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Calendar, Briefcase, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyAllAppointmentLetters } from '../lib/api';
import type { RmsAppointmentLetter, RmsApplicationWithDetails } from '../lib/types';

type LetterWithRelations = RmsAppointmentLetter & { application?: RmsApplicationWithDetails };

export default function AppointmentLetters() {
  const { profile } = useCandidateAuth();
  const [letters, setLetters] = useState<LetterWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyAllAppointmentLetters(profile.id).then(r => {
      setLetters((r.data ?? []) as LetterWithRelations[]);
      setLoading(false);
    });
  }, [profile]);

  if (loading) {
    return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-white animate-pulse rounded-xl border border-primary-100" />)}</div>;
  }

  if (letters.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
        <Award className="w-12 h-12 text-primary-200 mx-auto mb-3" />
        <p className="font-bold text-primary-600 text-lg mb-2">No Appointment Letters</p>
        <p className="text-primary-500 text-sm">Your appointment letters will appear here once issued by HR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <p><strong>{letters.length}</strong> appointment letter{letters.length !== 1 ? 's' : ''} issued. Download and keep a copy for your records.</p>
      </div>

      <div className="space-y-3">
        {letters.map((letter, idx) => (
          <motion.div key={letter.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
            className="bg-white rounded-xl border-2 border-emerald-200 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary-900 text-sm mb-1">
                  {(letter.application?.job_posting as { title?: string } | undefined)?.title ?? 'Appointment Letter'}
                </p>
                <p className="font-mono text-xs text-primary-500 mb-2">{letter.letter_number}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary-400" />
                    Issued: {new Date(letter.issued_at).toLocaleDateString('en-IN')}
                  </span>
                  {letter.joining_date && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-primary-400" />
                      Joining: {new Date(letter.joining_date).toLocaleDateString('en-IN')}
                    </span>
                  )}
                  {letter.joining_venue && (
                    <span className="flex items-center gap-1 font-medium text-primary-700">
                      {letter.joining_venue}
                    </span>
                  )}
                </div>
              </div>
              {letter.pdf_url && (
                <div className="shrink-0 flex flex-col gap-2">
                  <a href={letter.pdf_url} download target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <a href={letter.pdf_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
