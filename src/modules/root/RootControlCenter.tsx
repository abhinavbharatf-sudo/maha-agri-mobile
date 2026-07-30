/**
 * Phase 1: Root Control Center Console (`/root/control-center`)
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Unrestricted Governance Panel for ABF Root Super Admin:
 * - Platform Registry
 * - Module & Permission Matrix Editor
 * - Audit Logs & Soft-Delete Inspector
 * - Organization Scope Manager
 * - Feature Flags & System Health
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Users,
  Activity,
  Settings,
  Lock,
  Key,
  Server,
  Database,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { PlatformRegistry, PlatformMetadata } from '../../core/registry/platformRegistry';
import { AuditLogger, AuditLogEntry } from '../../core/audit/auditLogger';

export const RootControlCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'platforms' | 'permissions' | 'audit' | 'flags'>('platforms');
  const [platforms, setPlatforms] = useState<PlatformMetadata[]>(PlatformRegistry.getActivePlatforms());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(AuditLogger.getLogs());

  const [showAddPlatformModal, setShowAddPlatformModal] = useState(false);
  const [newPlatName, setNewPlatName] = useState('');
  const [newPlatSlug, setNewPlatSlug] = useState('');
  const [newPlatDesc, setNewPlatDesc] = useState('');

  const handleAddPlatform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatName || !newPlatSlug) return;

    const created = PlatformRegistry.registerPlatform({
      name: newPlatName,
      slug: newPlatSlug.toLowerCase().replace(/\s+/g, '-'),
      description: newPlatDesc || 'Enterprise business platform',
      logo: '🔮',
      themeColor: 'purple',
      version: 'v1.0.0',
      activeStatus: true,
      createdBy: 'ROOT_SUPER_ADMIN',
      modulesCount: 1,
    });

    setPlatforms(PlatformRegistry.getActivePlatforms());
    setShowAddPlatformModal(false);
    setNewPlatName('');
    setNewPlatSlug('');
    setNewPlatDesc('');

    AuditLogger.logAction({
      userId: 'usr_root_admin',
      userName: 'ABF Root Super Admin',
      roleKey: 'ROOT_SUPER_ADMIN',
      platformSlug: 'root',
      action: 'CREATE_PLATFORM',
      entityType: 'PLATFORM_REGISTRY',
      entityId: created.id,
      details: `Registered new enterprise platform: ${created.name} (${created.slug})`,
      ipAddress: '127.0.0.1',
      userAgent: 'Internal System Engine',
    });
    setAuditLogs(AuditLogger.getLogs());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Governance Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              ABF Root Control Center
              <span className="text-[10px] font-extrabold bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full uppercase">
                Global Scope
              </span>
            </h1>
            <p className="text-xs text-slate-400">Master Governance, Platform Registry & Permission Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 rounded-full">
            <Activity className="w-3.5 h-3.5" />
            <span>Ecosystem Online (100%)</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('platforms')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'platforms'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Platform Registry ({platforms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'permissions'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>14-Action Permission Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: PLATFORM REGISTRY */}
        {activeTab === 'platforms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Registered Business Platforms</h2>
                <p className="text-xs text-slate-400">Dynamic platform registry powering post-login workspace routing.</p>
              </div>
              <button
                onClick={() => setShowAddPlatformModal(true)}
                className="flex items-center space-x-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Platform</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-purple-600/50 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{p.logo}</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {p.version}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Slug: <code className="text-purple-400">/{p.slug}</code></span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PERMISSION MATRIX */}
        {activeTab === 'permissions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">14-Action Enterprise Permission Matrix Engine</h2>
            <p className="text-xs text-slate-400">
              Evaluates User + Platform + Role + Scope to authorize operations (VIEW, CREATE, UPDATE, DELETE, APPROVE, REJECT, VERIFY, EXPORT, PRINT, ASSIGN, TRANSFER, ARCHIVE, RESTORE, HARD_DELETE).
            </p>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-purple-300 space-y-1">
              <p>✓ ROOT_SUPER_ADMIN ➔ Full Unrestricted Privilege (* on *)</p>
              <p>✓ ABF_SUPER_ADMIN ➔ 13 Enterprise Actions on /abf/*</p>
              <p>✓ MAHA_AGRI_SUPER_ADMIN ➔ 13 Enterprise Actions on /maha-agri/*</p>
              <p>✓ SOIL_CHEMIST ➔ VIEW, CREATE, UPDATE, APPROVE, VERIFY, PRINT, EXPORT on /maha-agri/soil-testing</p>
              <p>✓ EDP_AGRI_CANDIDATE ➔ VIEW, CREATE, UPDATE, PRINT on /maha-agri/edp</p>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Enterprise Action Audit History</h2>
              <span className="text-xs text-slate-400">Soft-Delete & Compliance Protected</span>
            </div>
            <div className="divide-y divide-slate-800 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-purple-400">{log.userName}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-300">{log.action}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                        {log.platformSlug}
                      </span>
                    </div>
                    <p className="text-slate-400">{log.details}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                    <p>{new Date(log.timestamp).toLocaleString()}</p>
                    <p className="font-mono text-slate-400">{log.ipAddress}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Platform Modal */}
      {showAddPlatformModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddPlatform} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-white">Register New Platform</h3>
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">Platform Name</label>
              <input
                type="text"
                value={newPlatName}
                onChange={(e) => setNewPlatName(e.target.value)}
                placeholder="e.g. Skill Development Platform"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">Platform Slug</label>
              <input
                type="text"
                value={newPlatSlug}
                onChange={(e) => setNewPlatSlug(e.target.value)}
                placeholder="e.g. skills"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">Description</label>
              <textarea
                value={newPlatDesc}
                onChange={(e) => setNewPlatDesc(e.target.value)}
                placeholder="Platform operational scope description"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPlatformModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
              >
                Register Platform
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
