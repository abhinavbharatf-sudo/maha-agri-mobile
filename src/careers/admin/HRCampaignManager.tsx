import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Eye, Copy, ArrowRight, Megaphone, CheckCircle, Clock, Archive } from 'lucide-react';
import { listAllCampaigns, upsertCampaign } from '../lib/api';
import type { RmsCampaign, CampaignStatus } from '../lib/types';
import { supabase } from '../../lib/supabase/client';

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft:    'bg-neutral-100 text-neutral-700 border-neutral-200',
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused:   'bg-amber-50 text-amber-700 border-amber-200',
  closed:   'bg-primary-100 text-primary-600 border-primary-200',
  archived: 'bg-primary-50 text-primary-400 border-primary-100',
};

export default function HRCampaignManager() {
  const [campaigns, setCampaigns] = useState<RmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [formData, setFormData] = useState<Partial<RmsCampaign>>({ type: 'open', status: 'draft', geographic_scope: 'state', is_public: false });
  const [saving, setSaving] = useState(false);

  const load = () => listAllCampaigns().then(r => { setCampaigns(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await upsertCampaign(formData);
    setSaving(false);
    if (!error) { setShowForm(false); setFormData({ type: 'open', status: 'draft', geographic_scope: 'state', is_public: false }); load(); }
  };

  const handleClone = async (campaign: RmsCampaign) => {
    if (!window.confirm(`Clone campaign "${campaign.name}"? All jobs, vacancies, and drives will be duplicated with reset dates.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    await upsertCampaign({
      name: `Copy of ${campaign.name}`,
      description: campaign.description,
      type: campaign.type,
      status: 'draft',
      campaign_owner_id: user?.id,
      geographic_scope: campaign.geographic_scope,
      start_date: null,
      application_deadline: null,
      expected_close_date: null,
      banner_image_url: campaign.banner_image_url,
      is_public: false,
      cloned_from: campaign.id,
      created_by: user?.id,
    });
    load();
  };

  const InputField = ({ label, name, value, onChange, type = 'text' }: { label: string; name: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-primary-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 bg-white" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Recruitment Campaigns</h2>
          <p className="text-sm text-primary-500">{campaigns.length} total campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-colors">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* New Campaign Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-primary-200 p-6">
          <h3 className="text-base font-bold text-primary-900 mb-5">
            {formData.id ? 'Edit Campaign' : 'New Campaign'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField label="Campaign Name *" name="name" value={formData.name ?? ''} onChange={v => setFormData(f => ({ ...f, name: v }))} />
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1.5">Type</label>
                <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value as RmsCampaign['type'] }))}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                  <option value="open">Open Recruitment</option>
                  <option value="targeted">Targeted Drive</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="online">Online Only</option>
                </select>
              </div>
              <InputField label="Start Date" name="start_date" value={formData.start_date ?? ''} onChange={v => setFormData(f => ({ ...f, start_date: v }))} type="date" />
              <InputField label="Last Date to Apply" name="deadline" value={formData.application_deadline ?? ''} onChange={v => setFormData(f => ({ ...f, application_deadline: v }))} type="date" />
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1.5">Geographic Scope</label>
                <select value={formData.geographic_scope} onChange={e => setFormData(f => ({ ...f, geographic_scope: e.target.value as RmsCampaign['geographic_scope'] }))}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                  <option value="state">State-wide (Maharashtra)</option>
                  <option value="division">Division-wise</option>
                  <option value="district">District-wise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary-700 mb-1.5">Status</label>
                <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">Description</label>
              <textarea value={formData.description ?? ''} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_public" checked={formData.is_public ?? false}
                onChange={e => setFormData(f => ({ ...f, is_public: e.target.checked }))}
                className="w-4 h-4 rounded border-primary-300" />
              <label htmlFor="is_public" className="text-sm font-medium text-primary-700">Publish on careers portal</label>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={!formData.name || saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-50 transition-all text-sm">
                {saving ? 'Saving...' : 'Save Campaign'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-white rounded-xl h-24 border border-primary-100" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
          <Megaphone className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-500">No campaigns yet. Create your first recruitment campaign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-primary-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-primary-900 truncate">{c.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                    {c.is_public && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">Public</span>
                    )}
                    {c.cloned_from && (
                      <span className="text-xs text-primary-400 flex items-center gap-1"><Copy className="w-3 h-3" />Cloned</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-primary-500">
                    <span>{c.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    {c.start_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Start: {new Date(c.start_date).toLocaleDateString('en-IN')}</span>}
                    {c.application_deadline && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Deadline: {new Date(c.application_deadline).toLocaleDateString('en-IN')}</span>}
                  </div>
                  {c.description && <p className="text-xs text-primary-500 mt-2 line-clamp-1">{c.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleClone(c)}
                    className="p-2 rounded-lg border border-primary-200 text-primary-500 hover:bg-primary-50 hover:text-primary-800 transition-all" title="Clone Campaign">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setFormData({ ...c }); setShowForm(true); }}
                    className="p-2 rounded-lg border border-primary-200 text-primary-500 hover:bg-primary-50 hover:text-primary-800 transition-all" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <Link to={`/admin/rms/campaigns/${c.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
