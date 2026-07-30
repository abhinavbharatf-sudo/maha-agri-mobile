import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle, ChevronDown } from 'lucide-react';
import { listRecruitmentSteps, upsertRecruitmentStep, deleteRecruitmentStep } from '../lib/api';
import type { RmsRecruitmentStep } from '../lib/types';

const EMPTY: Partial<RmsRecruitmentStep> = { label: '', description: '', order: 0, enabled: true };

export default function HRFlowManager({ jobId }: { jobId: string }) {
  const [steps, setSteps]       = useState<RmsRecruitmentStep[]>([]);
  const [form, setForm]         = useState<Partial<RmsRecruitmentStep>>(EMPTY);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = () => listRecruitmentSteps(jobId).then(r => setSteps(r.data));
  useEffect(() => { load(); }, [jobId]);

  const save = async () => {
    if (!form.label?.trim()) return setError('Step label is required.');
    setSaving(true); setError(null);
    const { error: e } = await upsertRecruitmentStep({ ...form, job_id: jobId, label: form.label.trim() } as RmsRecruitmentStep);
    setSaving(false);
    if (e) return setError(e.message);
    setForm(EMPTY); setShowAdd(false);
    load();
  };

  const remove = async (id: string) => {
    await deleteRecruitmentStep(id);
    load();
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-xs font-bold text-primary-600 uppercase tracking-wide">
        <span>Recruitment Flow ({steps.length > 0 ? `${steps.length} custom steps` : 'default 14-step flow'})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 pl-1">
          {steps.length === 0 && (
            <p className="text-xs text-primary-400 italic bg-primary-50 rounded-lg p-2.5">
              Using default 14-step recruitment flow. Add custom steps below to override.
            </p>
          )}

          <button type="button" onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>

          {showAdd && (
            <div className="p-3 bg-white border border-primary-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1">Step Label *</label>
                  <input value={form.label ?? ''} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Document Verification"
                    className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary-700 mb-1">Display Order</label>
                  <input type="number" min="0" value={form.order ?? 0}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1">Description</label>
                <textarea value={form.description ?? ''} rows={2}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this step..."
                  className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary-500 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.enabled ?? true} id="step-enabled"
                  onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                  className="rounded border-primary-300" />
                <label htmlFor="step-enabled" className="text-xs text-primary-700">Enabled</label>
              </div>
              {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY); setError(null); }}
                  className="px-3 py-1.5 border border-primary-200 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-50">Cancel</button>
                <button type="button" onClick={save} disabled={saving}
                  className="flex-1 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50">
                  {saving ? 'Saving…' : form.id ? 'Update Step' : 'Add Step'}
                </button>
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-1.5">
              {steps.map(s => (
                <div key={s.id} className="flex items-start gap-2.5 p-2.5 bg-white border border-primary-100 rounded-xl">
                  <GripVertical className="w-3.5 h-3.5 text-primary-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary-800">{s.label}</p>
                    {s.description && <p className="text-[11px] text-primary-500 mt-0.5 truncate">{s.description}</p>}
                  </div>
                  <span className="text-xs text-primary-400 shrink-0">#{s.order}</span>
                  <button type="button" onClick={() => { setForm({ ...s }); setShowAdd(true); }}
                    className="text-xs text-primary-500 hover:text-primary-700 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50">Edit</button>
                  <button type="button" onClick={() => remove(s.id)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
