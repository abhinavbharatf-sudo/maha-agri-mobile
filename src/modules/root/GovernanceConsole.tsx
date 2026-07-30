/**
 * Pre-Phase 3 Enterprise Governance Console (`/governance`)
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Interactive Console for Governance Services:
 * 1. Feature Flag Service
 * 2. Configuration Service
 * 3. Scheduler / Job Engine
 * 4. Health Monitoring
 * 5. Metrics Dashboard
 * 6. Global Search Engine
 * 7. Global Activity Timeline
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ToggleRight,
  Sliders,
  Clock,
  Activity,
  BarChart3,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  FeatureFlags,
  JobEngine,
  HealthMonitor,
  MetricsEngine,
  GlobalSearchEngine,
  SearchIndexItem,
} from '../../core/governance/GovernanceEngine';
import { AuditLogger, AuditLogEntry } from '../../core/audit/auditLogger';

export const GovernanceConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'health' | 'flags' | 'jobs' | 'search' | 'timeline'>('metrics');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);

  const metrics = MetricsEngine.getMetrics();
  const healthList = HealthMonitor.getHealthMetrics();
  const flagsList = FeatureFlags.getAllFlags();
  const jobsList = JobEngine.getJobs();
  const activityTimeline: AuditLogEntry[] = AuditLogger.getLogs();

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setSearchResults(GlobalSearchEngine.search(q));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Governance Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Enterprise Governance Layer Console
              <span className="text-[10px] font-extrabold bg-indigo-950 text-indigo-400 border border-indigo-800 px-2.5 py-0.5 rounded-full uppercase">
                Active & Frozen
              </span>
            </h1>
            <p className="text-xs text-slate-400">Shared Governance: Feature Flags, AppConfig, Jobs, Health & Global Search</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-3 py-1.5 rounded-full">
          <Activity className="w-4 h-4" />
          <span>Governance Layer Operational</span>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'metrics'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Ecosystem Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'health'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>2. Health Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('flags')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flags'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <ToggleRight className="w-4 h-4" />
            <span>3. Feature Flags ({flagsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'jobs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>4. Scheduler / Job Engine ({jobsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>5. Global Search Index</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>6. Global Activity Feed</span>
          </button>
        </div>

        {/* TAB 1: METRICS DASHBOARD */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Ecosystem Operational Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <p className="text-xs text-slate-400 uppercase font-semibold">Active Users</p>
                <p className="text-2xl font-black text-white">{metrics.activeUsers}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <p className="text-xs text-slate-400 uppercase font-semibold">Active Sessions</p>
                <p className="text-2xl font-black text-indigo-400">{metrics.activeSessions}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <p className="text-xs text-slate-400 uppercase font-semibold">Avg Response Time</p>
                <p className="text-2xl font-black text-emerald-400">{metrics.avgApiResponseTimeMs} ms</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <p className="text-xs text-slate-400 uppercase font-semibold">Storage Usage</p>
                <p className="text-2xl font-black text-purple-400">{metrics.storageUsageMb} MB</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HEALTH MONITOR */}
        {activeTab === 'health' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Enterprise Health & Service Status</h2>
            <div className="divide-y divide-slate-800 text-xs">
              {healthList.map((h) => (
                <div key={h.service} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-white">{h.service}</p>
                    <p className="text-slate-400">Latency: <span className="text-indigo-400">{h.latencyMs} ms</span> • Uptime: {h.uptime}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FEATURE FLAGS */}
        {activeTab === 'flags' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Enterprise Feature Flag Management</h2>
            <div className="divide-y divide-slate-800 text-xs">
              {flagsList.map((f) => (
                <div key={f.key} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{f.name} <code className="text-[10px] text-indigo-400 ml-2">[{f.key}]</code></p>
                    <p className="text-slate-400">Environment: <span className="uppercase text-slate-300">{f.environment}</span></p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${f.enabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                    {f.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: JOB ENGINE */}
        {activeTab === 'jobs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Scheduler & Job Engine (Cron Tasks)</h2>
            <div className="divide-y divide-slate-800 text-xs">
              {jobsList.map((j) => (
                <div key={j.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{j.name}</p>
                    <p className="text-slate-400">Cron: <code className="text-indigo-400 font-mono">{j.cronSchedule}</code> • Last Run: {new Date(j.lastRunAt || '').toLocaleTimeString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full text-xs font-bold">
                    ✓ {j.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: GLOBAL SEARCH INDEX */}
        {activeTab === 'search' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Global Enterprise Search Index</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search employees, farmers, documents, or workflows across all platforms..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="divide-y divide-slate-800 text-xs pt-2">
              {searchResults.length > 0 ? (
                searchResults.map((res) => (
                  <div key={res.id} className="py-3 space-y-1">
                    <p className="font-bold text-indigo-300">{res.title} <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">{res.category}</span></p>
                    <p className="text-slate-400">{res.snippet}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Route: {res.url}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs py-4 text-center">Type a search query above to query the Global Search Index.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: GLOBAL ACTIVITY FEED */}
        {activeTab === 'timeline' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Global Unified Activity Feed</h2>
              <span className="text-xs text-slate-400">Streamed via Enterprise Audit Engine</span>
            </div>
            <div className="divide-y divide-slate-800 text-xs">
              {activityTimeline.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-400">{item.userName}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-300">{item.action}</span>
                    </div>
                    <p className="text-slate-400">{item.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
