import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle, Check } from 'lucide-react';
import { listJobBadges, upsertJobBadge, deleteJobBadge } from '../lib/api';
import type { RmsJobBadge } from '../lib/types';

const COLORS: { key: string; label: string; preview: string }[] = [
  { key: 'default', label: 'Default',  preview: 'bg-white/10 text-white border border-white/20' },
  { key: 'emerald', label: 'Green',    preview: 'bg-emerald-500 text-white' },
  { key: 'amber',   label: 'Amber',    preview: 'bg-amber-400 text-amber-900' },
  { key: 'orange',  label: 'Orange',   preview: 'bg-orange-400 text-white' },
  { key: 'red',     label: 'Red',      preview: 'bg-red-500 text-white' },
  { key: 'blue',    label: 'Blue',     preview: 'bg-blue-500 text-white' },
];

const EMPTY: Partial<RmsJobBadge> = { title: '', color: 'default', order: 0, enabled: true };

export default function HRBadgeManager({ jobId }: { jobId: string }) {
  const [badges, setBadges]     = useState<RmsJobBadge[]>([]);
  const [form, setForm]         = useState<Partial<RmsJobBadge>>(EMPTY);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = () => listJobBadges(jobId).then(r => setBadges(r.data));
  useEffect(() => { load(); }, [jobId]);

  const save = async () => {
    if (!form.title?.trim()) return setError('Badge title is required.');
    setSaving(true); setError(null);
    const { error: e } = await upsertJobBadge({ ...form, job_id: jobId, title: form.title.trim() } as RmsJobBadge);
    setSaving(false);
    if (e) return setError(e.message);
    setForm(EMPTY); setShowAdd(false);
    load();
  };

  const remove = async (id: string) => {
    await deleteJobBadge(id);
    load();
  };

  const toggle = async (badge: RmsJobBadge) => {
    await upsertJobBadge({ ...badge, enabled: !badge.enabled });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">Dynamic Badges ({badges.length})</p>
        <button type="button" onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Badge
        </button>
      </div>

      {showAdd && (
        <div className="p-3 bg-white border border-primary-200 rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1">Badge Title *</label>
              <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Applications Open"
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
            <label className="block text-xs font-semibold text-primary-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c.key} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c.key }))}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border-2 transition-all ${c.preview} ${form.color === c.key ? 'ring-2 ring-offset-1 ring-primary-500' : ''}`}>
                  {form.color === c.key && <Check className="w-2.5 h-2.5 inline mr-0.5" />}{c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.enabled ?? true} id="badge-enabled"
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-primary-300" />
            <label htmlFor="badge-enabled" className="text-xs text-primary-700">Enabled (visible on portal)</label>
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY); setError(null); }}
              className="px-3 py-1.5 border border-primary-200 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-50">Cancel</button>
            <button type="button" onClick={save} disabled={saving}
              className="flex-1 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50">
              {saving ? 'Saving…' : form.id ? 'Update Badge' : 'Add Badge'}
            </button>
          </div>
        </div>
      )}

      {badges.length === 0 ? (
        <p className="text-xs text-primary-400 italic">No badges yet. Add one above to display on the job listing hero.</p>
      ) : (
        <div className="space-y-1.5">
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-2.5 p-2.5 bg-white border border-primary-100 rounded-xl">
              <GripVertical className="w-3.5 h-3.5 text-primary-300 shrink-0" />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                COLORS.find(c => c.key === b.color)?.preview ?? 'bg-primary-100 text-primary-700'
              }`}>{b.title}</span>
              <span className="text-xs text-primary-500 flex-1">Order: {b.order}</span>
              <button type="button" onClick={() => toggle(b)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${b.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-primary-50 text-primary-400 border-primary-200'}`}>
                {b.enabled ? 'On' : 'Off'}
              </button>
              <button type="button" onClick={() => { setForm({ ...b }); setShowAdd(true); }}
                className="text-xs text-primary-500 hover:text-primary-700 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50">Edit</button>
              <button type="button" onClick={() => remove(b.id)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
