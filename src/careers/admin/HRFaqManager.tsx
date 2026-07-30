import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { listJobFaqs, upsertJobFaq, deleteJobFaq } from '../lib/api';
import type { RmsJobFaq } from '../lib/types';

const EMPTY: Partial<RmsJobFaq> = { question: '', answer: '', order: 0, enabled: true };

export default function HRFaqManager({ jobId }: { jobId: string }) {
  const [faqs, setFaqs]         = useState<RmsJobFaq[]>([]);
  const [form, setForm]         = useState<Partial<RmsJobFaq>>(EMPTY);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = () => listJobFaqs(jobId).then(r => setFaqs(r.data));
  useEffect(() => { load(); }, [jobId]);

  const save = async () => {
    if (!form.question?.trim()) return setError('Question is required.');
    if (!form.answer?.trim())   return setError('Answer is required.');
    setSaving(true); setError(null);
    const { error: e } = await upsertJobFaq({ ...form, job_id: jobId, question: form.question.trim(), answer: form.answer.trim() } as RmsJobFaq);
    setSaving(false);
    if (e) return setError(e.message);
    setForm(EMPTY); setShowAdd(false);
    load();
  };

  const remove = async (id: string) => {
    await deleteJobFaq(id);
    load();
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-xs font-bold text-primary-600 uppercase tracking-wide">
        <span>FAQ Manager ({faqs.length > 0 ? `${faqs.length} custom FAQs` : 'default FAQs'})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 pl-1">
          {faqs.length === 0 && (
            <p className="text-xs text-primary-400 italic bg-primary-50 rounded-lg p-2.5">
              Using default FAQ items. Add custom FAQs below to override them for this job.
            </p>
          )}

          <button type="button" onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>

          {showAdd && (
            <div className="p-3 bg-white border border-primary-200 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1">Question *</label>
                <input value={form.question ?? ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="e.g. What is the application fee?"
                  className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1">Answer *</label>
                <textarea value={form.answer ?? ''} rows={3}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Provide a clear, concise answer..."
                  className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1">Display Order</label>
                  <input type="number" min="0" value={form.order ?? 0}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.enabled ?? true}
                      onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                      className="rounded border-primary-300" />
                    <span className="text-xs text-primary-700">Enabled</span>
                  </label>
                </div>
              </div>
              {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY); setError(null); }}
                  className="px-3 py-1.5 border border-primary-200 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-50">Cancel</button>
                <button type="button" onClick={save} disabled={saving}
                  className="flex-1 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50">
                  {saving ? 'Saving…' : form.id ? 'Update FAQ' : 'Add FAQ'}
                </button>
              </div>
            </div>
          )}

          {faqs.length > 0 && (
            <div className="space-y-1.5">
              {faqs.map(faq => (
                <div key={faq.id} className="p-2.5 bg-white border border-primary-100 rounded-xl">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary-800 leading-snug">{faq.question}</p>
                      <p className="text-[11px] text-primary-500 mt-0.5 line-clamp-2">{faq.answer}</p>
                    </div>
                    <button type="button" onClick={() => { setForm({ ...faq }); setShowAdd(true); }}
                      className="text-xs text-primary-500 hover:text-primary-700 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 shrink-0">Edit</button>
                    <button type="button" onClick={() => remove(faq.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
