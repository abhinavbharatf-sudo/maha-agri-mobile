import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings, MessageSquare, Mail, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { listNotificationTemplates, upsertNotificationTemplate } from '../lib/api';
import type { RmsNotificationTemplate, NotificationChannel } from '../lib/types';
import { NOTIFICATION_EVENT_LABELS, NOTIFICATION_EVENT_KEYS } from '../lib/constants';

const CHANNEL_ICONS: Record<NotificationChannel, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  inapp: Bell,
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  inapp: 'In-App',
};

export default function HRNotificationTemplateManager() {
  const [templates, setTemplates] = useState<RmsNotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RmsNotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => listNotificationTemplates().then(r => { setTemplates(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await upsertNotificationTemplate({
      event_key: editing.event_key,
      channel: editing.channel,
      body: editing.body,
      subject: editing.subject,
      is_enabled: editing.is_enabled,
      reminder_offset_minutes: editing.reminder_offset_minutes,
    });
    setSaving(false);
    if (!error) { setSaved(true); load(); setTimeout(() => setSaved(false), 2000); }
  };

  const grouped = NOTIFICATION_EVENT_KEYS.reduce((acc, key) => {
    acc[key] = (['whatsapp', 'email', 'inapp'] as NotificationChannel[]).map(channel =>
      templates.find(t => t.event_key === key && t.channel === channel) ??
      { id: '', event_key: key, channel, body: '', is_enabled: false, subject: null, reminder_offset_minutes: null, updated_by: null, updated_at: '' }
    );
    return acc;
  }, {} as Record<string, RmsNotificationTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary-900">Notification Templates</h2>
          <p className="text-sm text-primary-500">Configure message content per event and channel. No developer required.</p>
        </div>
      </div>

      {/* Variable Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-2">Available Variables (use in message body):</p>
        <div className="flex flex-wrap gap-2">
          {['{{candidate_name}}', '{{job_title}}', '{{application_number}}', '{{interview_date}}', '{{interview_time}}', '{{interview_venue}}', '{{training_start_date}}', '{{training_mode}}', '{{training_venue}}', '{{joining_date}}', '{{joining_venue}}'].map(v => (
            <code key={v} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">{v}</code>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-white rounded-xl h-32 border border-primary-100" />)}</div>
      ) : (
        <div className="space-y-4">
          {NOTIFICATION_EVENT_KEYS.map(eventKey => (
            <div key={eventKey} className="bg-white rounded-2xl border border-primary-100 overflow-hidden">
              <div className="px-5 py-3 bg-primary-50 border-b border-primary-100">
                <h3 className="text-sm font-bold text-primary-800">
                  {NOTIFICATION_EVENT_LABELS[eventKey]}
                </h3>
              </div>
              <div className="divide-y divide-primary-50">
                {grouped[eventKey]?.map(tmpl => {
                  const Icon = CHANNEL_ICONS[tmpl.channel as NotificationChannel];
                  const isEditing = editing?.event_key === eventKey && editing?.channel === tmpl.channel;
                  return (
                    <div key={tmpl.channel} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary-500" />
                          <span className="text-sm font-semibold text-primary-700">{CHANNEL_LABELS[tmpl.channel as NotificationChannel]}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tmpl.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {tmpl.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditing(isEditing ? null : { ...tmpl })}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-900 transition-colors"
                        >
                          {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                      </div>

                      {isEditing && editing ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                          {editing.channel === 'email' && (
                            <div>
                              <label className="block text-xs font-semibold text-primary-600 mb-1">Email Subject</label>
                              <input value={editing.subject ?? ''} onChange={e => setEditing({ ...editing, subject: e.target.value })}
                                className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-semibold text-primary-600 mb-1">Message Body</label>
                            <textarea value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })}
                              rows={4} className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-y font-mono" />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={editing.is_enabled} onChange={e => setEditing({ ...editing, is_enabled: e.target.checked })}
                                className="w-4 h-4 rounded border-primary-300" />
                              <span className="font-medium text-primary-700">Enabled</span>
                            </label>
                            <button onClick={handleSave} disabled={saving}
                              className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-bold rounded-lg hover:bg-primary-800 disabled:opacity-70 transition-colors">
                              {saving ? 'Saving...' : saved ? <><CheckCircle className="w-4 h-4 text-emerald-400" />Saved!</> : <><Save className="w-4 h-4" />Save</>}
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <p className="text-xs text-primary-500 line-clamp-2 font-mono bg-primary-50 p-2 rounded-lg">
                          {tmpl.body || <span className="italic text-primary-300">No template configured</span>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

