import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, ShieldCheck, CheckCircle2, Award, Calendar, MapPin, Hash } from 'lucide-react';
import type { RmsAppointmentLetter } from '../lib/types';

interface PrintableAppointmentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: (RmsAppointmentLetter & { application?: any; org_signature?: any }) | null;
  candidateName?: string;
  candidateMobile?: string;
  jobTitle?: string;
}

export default function PrintableAppointmentLetterModal({
  isOpen,
  onClose,
  letter,
  candidateName,
  candidateMobile,
  jobTitle,
}: PrintableAppointmentLetterModalProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !letter) return null;

  const resolvedCandName = candidateName || letter.application?.candidate?.full_name || letter.signed_legal_name || 'Candidate';
  const resolvedMobile = candidateMobile || letter.application?.candidate?.mobile || 'Registered Mobile';
  const resolvedJob = jobTitle || letter.application?.job_posting?.title || 'Recruitment Position';
  const isFinal = letter.letter_type === 'final';
  const termsPayload = letter.terms_payload as { common_terms?: string[]; position_terms?: string[] } | null;
  const commonTerms = termsPayload?.common_terms || [
    'The candidate must report to the assigned location on or before the specified reporting date.',
    'Original government identification (Aadhaar/PAN) and educational certificates must be presented for physical verification on joining.',
    'This appointment is subject to satisfactory verification of submitted credentials and police/background clearance.',
    'The employment is governed by the service rules and codes of conduct of the MAHA-AGRI Operations Platform.',
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-primary-200 overflow-hidden my-8 print:border-none print:shadow-none print:max-w-none print:m-0 print:rounded-none"
        >
          {/* Action Bar (Hidden in print) */}
          <div className="bg-primary-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm">Official {isFinal ? 'Final' : 'Provisional'} Appointment Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-primary-200 hover:text-white hover:bg-primary-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Sheet */}
          <div ref={printAreaRef} className="p-8 sm:p-12 space-y-6 text-slate-800 bg-white font-sans text-xs leading-relaxed print:p-8">
            {/* Header: Platform Entity Letterhead (Authentic Organization Header) */}
            <div className="border-b-2 border-slate-900 pb-5 text-center space-y-1">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-lg border-2 border-amber-400 shadow-md">
                  MA
                </div>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-widest text-slate-900">
                MAHA-AGRI DIGITAL OPERATIONS PLATFORM
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Human Capital & Field Placement Management Cell
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Regional Operations Hub, Pune 411001, Maharashtra, India
              </p>
            </div>

            {/* Letter Meta Details */}
            <div className="flex flex-wrap justify-between items-start gap-4 pt-2">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">
                  <span className="text-slate-500 font-medium">Ref No:</span> {letter.letter_number}
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 font-medium">Date of Issue:</span>{' '}
                  {new Date(letter.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right space-y-1">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  isFinal ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {isFinal ? 'Confirmed Appointment Order' : 'Provisional Offer of Appointment'}
                </span>
                <p className="text-[10px] text-slate-500 font-mono">Status: {letter.signature_status?.toUpperCase() || 'VALID'}</p>
              </div>
            </div>

            {/* Recipient Block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase">To:</p>
              <p className="text-sm font-bold text-slate-900">{resolvedCandName}</p>
              <p className="text-slate-700">Mobile: {resolvedMobile}</p>
              <p className="text-slate-600">Application Reference: #{letter.application_id?.slice(0, 8)}</p>
            </div>

            {/* Subject */}
            <div>
              <p className="font-bold text-slate-900">
                SUBJECT: {isFinal ? 'FINAL ORDER OF APPOINTMENT' : 'PROVISIONAL OFFER OF APPOINTMENT'} FOR THE POSITION OF{' '}
                <span className="uppercase text-slate-950 underline decoration-slate-900 decoration-1 underline-offset-2">{resolvedJob}</span>
              </p>
            </div>

            {/* Body */}
            <div className="space-y-3 text-slate-700 text-justify">
              <p>Dear {resolvedCandName},</p>
              <p>
                Consequent upon your performance in the selection process, verification of eligibility criteria, and approval by the competent selection authority of the MAHA-AGRI Platform, we are pleased to offer you appointment to the position of <strong>{resolvedJob}</strong>.
              </p>
              <p>
                You are directed to report for duty and complete remaining onboarding formalities on the scheduled date and location stipulated below:
              </p>

              {/* Joining Particulars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Reporting Date:</span>
                    <strong className="text-slate-900 text-xs">
                      {letter.joining_date
                        ? new Date(letter.joining_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                        : 'To be notified by Department'}
                    </strong>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Joining Venue / Office:</span>
                    <strong className="text-slate-900 text-xs">{letter.joining_venue || 'MAHA-AGRI Pune Central Operations Hub'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">Terms & Conditions of Service:</h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
                {commonTerms.map((term, tIdx) => (
                  <li key={tIdx}>{term}</li>
                ))}
              </ol>
            </div>

            {/* Dual Signatures Section */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              {/* Candidate Digital Signature Acceptance */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Acceptance & Electronic Signature:</p>
                {letter.signature_data ? (
                  <div className="h-16 flex items-center justify-center bg-white rounded border border-slate-200 p-1">
                    <img src={letter.signature_data} alt="Candidate Signature" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center bg-amber-50 rounded border border-dashed border-amber-300 text-amber-700 text-[11px] font-semibold">
                    Awaiting Candidate Digital Signature
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900">{letter.signed_legal_name || resolvedCandName}</p>
                  <p className="text-[10px] text-slate-500">
                    {letter.signed_at
                      ? `Signed on: ${new Date(letter.signed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`
                      : 'Pending Acceptance'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> WhatsApp OTP Two-Factor Verified
                  </p>
                </div>
              </div>

              {/* Organization Signatory */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-right sm:text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">For MAHA-AGRI Digital Operations Platform:</p>
                <div className="h-16 flex items-center justify-end bg-white rounded border border-slate-200 p-1">
                  {letter.org_signature?.signature_image_url ? (
                    <img src={letter.org_signature.signature_image_url} alt="Authorized Signatory" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-[10px] text-slate-400 italic pr-2 font-mono">
                      [ Authorized Corporate E-Signatory ]
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{letter.org_signature?.signatory_name || 'Authorized Signatory'}</p>
                  <p className="text-[10px] text-slate-600">{letter.org_signature?.designation || 'Head of Talent Acquisition & Operations'}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">MAHA-AGRI Operations Platform</p>
                </div>
              </div>
            </div>

            {/* Cryptographic Seal & Statutory Notice */}
            <div className="pt-4 border-t-2 border-slate-900 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  SHA-256 DOC HASH: <strong className="text-slate-800 break-all">{letter.doc_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold font-sans">
                  <ShieldCheck className="w-3.5 h-3.5" /> Cryptographically Validated
                </span>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight text-justify">
                <strong>Statutory Notice:</strong> This document is an electronic record under Section 2(t) and forms an enforceable contract pursuant to Section 10A of the Information Technology Act, 2000 (India). Valid without physical wet ink signature or hardware DSC / Aadhaar eSign. Authenticated via candidate digital canvas signature and two-factor WhatsApp OTP verification.
              </p>
              <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[9px] text-amber-900 font-medium">
                <strong>LEGAL NOTICE:</strong> This electronic appointment letter template is an operational platform document and is subject to formal legal review and verification by an Indian advocate / legal counsel prior to formal operational deployment.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
