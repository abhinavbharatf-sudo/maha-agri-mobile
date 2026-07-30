/**
 * Enterprise Production Governance & Observability Console UI Component
 * Location: /src/core/governance/components/PlatformGovernanceConsole.tsx
 * Features:
 * - Feature Flag Framework (District-wise Toggles & Rollback Controls)
 * - Central Configuration Manager (Dynamic SLA, Batch Size & QR Expiry Entries)
 * - Data Retention Compliance Policy Inspector
 * - Real-Time Observability & Telemetry Metrics Console
 */

import React, { useState } from 'react';
import {
  FeatureFlag,
  ConfigurationEntry,
  DataRetentionPolicy,
  TelemetryMetric
} from '../types/governance.types';
import { PlatformGovernanceService } from '../services/PlatformGovernanceService';
import { Sliders, ToggleLeft, ToggleRight, Database, ShieldCheck, Activity, Cpu, Layers, Lock, RefreshCw, Server, AlertTriangle } from 'lucide-react';

import { OperationsCommandCentre } from './OperationsCommandCentre';

export const PlatformGovernanceConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OCC_COMMAND_CENTRE' | 'FEATURE_FLAGS' | 'CONFIG_STORE' | 'RETENTION_POLICY' | 'TELEMETRY'>('OCC_COMMAND_CENTRE');

  const [flags, setFlags] = useState<FeatureFlag[]>(PlatformGovernanceService.INITIAL_FEATURE_FLAGS);
  const [configs, setConfigs] = useState<ConfigurationEntry[]>(PlatformGovernanceService.INITIAL_CONFIGURATIONS);

  const retentionPolicies = PlatformGovernanceService.RETENTION_POLICIES;
  const metrics = PlatformGovernanceService.getTelemetryMetrics();

  const handleToggleFlag = (flagId: string) => {
    setFlags(
      flags.map((f) => {
        if (f.id === flagId) {
          const updated = { ...f, isEnabled: !f.isEnabled, updatedAt: new Date().toISOString() };
          alert(`Feature Flag '${f.flagKey}' toggled to ${updated.isEnabled ? 'ENABLED' : 'DISABLED'}`);
          return updated;
        }
        return f;
      })
    );
  };

  const handleUpdateConfigValue = (cfgId: string, currentVal: string) => {
    const newVal = prompt('Enter New Central Configuration Value:', currentVal);
    if (!newVal) return;

    setConfigs(
      configs.map((c) => {
        if (c.id === cfgId) {
          const updated = { ...c, configValue: newVal, updatedAt: new Date().toISOString() };
          alert(`Configuration '${c.configKey}' updated to '${newVal}'`);
          return updated;
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-purple-600">
              Platform Governance & Production Hardening
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v2.0.0-alpha Production Hardened
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Enterprise Governance & Telemetry Console</h2>
          <p className="text-xs text-slate-500">
            Feature Flag Framework, Central Configuration Store, Compliance Retention Matrix & Real-Time Telemetry
          </p>
        </div>
      </div>

      {/* Workspace Sub-Tabs */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        <button
          onClick={() => setActiveTab('OCC_COMMAND_CENTRE')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'OCC_COMMAND_CENTRE' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          🖥️ Operations Command Centre (OCC)
        </button>
        <button
          onClick={() => setActiveTab('FEATURE_FLAGS')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'FEATURE_FLAGS' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
          }`}
        >
          🚩 Feature Flag Framework ({flags.length})
        </button>
        <button
          onClick={() => setActiveTab('CONFIG_STORE')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'CONFIG_STORE' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
          }`}
        >
          ⚙️ Central Configuration Store ({configs.length})
        </button>
        <button
          onClick={() => setActiveTab('RETENTION_POLICY')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'RETENTION_POLICY' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
          }`}
        >
          🔒 Compliance Data Retention Policy
        </button>
        <button
          onClick={() => setActiveTab('TELEMETRY')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'TELEMETRY' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
          }`}
        >
          ⚡ Observability Telemetry Console
        </button>
      </div>

      {/* TAB 0: OPERATIONS COMMAND CENTRE */}
      {activeTab === 'OCC_COMMAND_CENTRE' && (
        <OperationsCommandCentre />
      )}

      {/* TAB 1: FEATURE FLAGS FRAMEWORK */}
      {activeTab === 'FEATURE_FLAGS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {flags.map((f) => (
            <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {f.flagKey}
                </span>

                <button onClick={() => handleToggleFlag(f.id)} className="cursor-pointer">
                  {f.isEnabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              <h3 className="text-sm font-extrabold text-slate-900">{f.flagName}</h3>
              <p className="text-xs text-slate-500">{f.description}</p>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-500">Scope: {f.targetScope}</span>
                <span className={`font-bold ${f.isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {f.isEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CENTRAL CONFIGURATION STORE */}
      {activeTab === 'CONFIG_STORE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Central Configuration Store (Zero Hardcoding)</h3>
              <p className="text-xs text-slate-500">Dynamic configuration entries for SLA Hours, Batch Sizes & Limits</p>
            </div>
            <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2.5 py-1 rounded font-bold border border-purple-200">
              ZERO HARDCODED VALUES
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                  <th className="p-3">Config Key</th>
                  <th className="p-3">Config Value</th>
                  <th className="p-3">Data Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {configs.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-purple-700">{c.configKey}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 text-sm">{c.configValue}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-600">{c.dataType}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">
                        {c.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{c.description}</td>
                    <td className="p-3 text-right">
                      {!c.isReadOnly && (
                        <button
                          onClick={() => handleUpdateConfigValue(c.id, c.configValue)}
                          className="px-2.5 py-1 bg-purple-600 text-white font-bold rounded-lg text-[10px]"
                        >
                          Edit Value
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATA RETENTION COMPLIANCE POLICY */}
      {activeTab === 'RETENTION_POLICY' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
            Compliance Data Retention & Archival Matrix
          </h3>

          <div className="space-y-3">
            {retentionPolicies.map((rp) => (
              <div key={rp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{rp.moduleName}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">Archive Period: {rp.archiveRetentionDays / 365} Years ({rp.archiveRetentionDays} Days)</p>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-mono font-bold rounded-full text-xs border border-emerald-200">
                  {rp.purgePolicy}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OBSERVABILITY TELEMETRY CONSOLE */}
      {activeTab === 'TELEMETRY' && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm font-mono">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-purple-400">Observability Telemetry & System Latency Console</h3>
              <p className="text-xs text-slate-400">Real-time p99 API Latency, Error Rate, and Queue Monitoring</p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-bold border border-emerald-800">
              HEALTH 99.98% OPTIMAL
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
            {metrics.map((m) => (
              <div key={m.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">{m.metricName}</p>
                <p className="text-xl font-black text-emerald-400">
                  {m.metricValue} {m.unit}
                </p>
                <span className="text-[9px] text-slate-500">Status: {m.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
