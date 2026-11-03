import { useState } from 'react';
import { Settings2, Bell, Shield, MessageSquare, Save, CheckCircle } from 'lucide-react';

export default function CRMSettings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">CRM Settings</h2>
        <p className="text-slate-500 text-sm mt-1">Configure global parameters and automation rules.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 hidden md:block">
          <ul className="space-y-1">
            {[
              { id: 'general', label: 'General SLA', icon: Settings2 },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'automations', label: 'Automations', icon: MessageSquare },
              { id: 'permissions', label: 'Permissions', icon: Shield },
            ].map(tab => (
              <li key={tab.id}>
                <button className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab.id === 'general' ? 'bg-blue-100/50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-8 space-y-8">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Lead Assignment & Workload Limits</h3>
              <p className="text-sm text-slate-500">Configure parameters for the Hybrid Round-Robin distribution algorithm.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Staff Active Workload Limit (Leads)</label>
                <input
                  type="number"
                  defaultValue={50}
                  min={1}
                  max={500}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">If all staff exceed this limit, assignment automatically falls back to staff with lowest active workload.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Candidate Rolling WhatsApp Cooldown (Hours)</label>
                <input
                  type="number"
                  defaultValue={12}
                  min={1}
                  max={48}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Prevents sending more than 1 automated reminder to the same mobile number within this window.</p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Service Level Agreements (SLA)</h3>
              <p className="text-sm text-slate-500">Define maximum allowable response times for candidates.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Initial Follow-up SLA (Hours)</label>
                <input type="number" defaultValue={24} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Max Call Attempts</label>
                <input type="number" defaultValue={5} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm" />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">WhatsApp Automations</h3>
              <p className="text-sm text-slate-500">Manage automatic message dispatch triggers.</p>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-start justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <div>
                  <div className="font-bold text-slate-900">Welcome Message (OTP-1)</div>
                  <div className="text-sm text-slate-500 mt-0.5">Send a greeting when candidate verifies phone number</div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>

              <label className="flex items-start justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <div>
                  <div className="font-bold text-slate-900">Application Submitted</div>
                  <div className="text-sm text-slate-500 mt-0.5">Send confirmation upon successful application</div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && <span className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Settings Saved</span>}
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
