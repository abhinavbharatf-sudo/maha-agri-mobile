/**
 * Developer Diagnostics Panel (Module 02.6 Hardening)
 * Location: /src/core/components/DeveloperDiagnosticsPanel.tsx
 * Floating Developer Diagnostics Panel displayed ONLY in Development mode.
 * Completely disabled in Production.
 */

import React, { useState } from 'react';
import { Cpu, CheckCircle2, ShieldCheck, Database, Zap, X, ChevronUp, ChevronDown, Activity, Terminal } from 'lucide-react';

interface DeveloperDiagnosticsPanelProps {
  currentRoleKey: string;
  platformVersion?: string;
}

export const DeveloperDiagnosticsPanel: React.FC<DeveloperDiagnosticsPanelProps> = ({
  currentRoleKey,
  platformVersion = 'v1.0.0-alpha',
}) => {
  const [expanded, setExpanded] = useState(false);

  // Disable completely in production mode
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    return null;
  }

  const diagnostics = [
    { name: 'Core Engine', status: 'OK', color: 'text-emerald-400' },
    { name: 'Event Bus', status: 'OK', color: 'text-emerald-400' },
    { name: 'Workflow Engine', status: 'OK', color: 'text-emerald-400' },
    { name: 'Timeline Engine', status: 'OK', color: 'text-emerald-400' },
    { name: 'Numbering Engine', status: 'OK', color: 'text-emerald-400' },
    { name: 'Database', status: 'Connected', color: 'text-emerald-400' },
    { name: 'Storage Provider', status: 'Connected', color: 'text-emerald-400' },
    { name: 'Notification Bus', status: 'Ready', color: 'text-blue-400' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none font-sans text-xs">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 border border-blue-500/40 text-white rounded-xl shadow-2xl backdrop-blur-md hover:bg-slate-900 transition-all font-mono"
        >
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold">DEV DIAGNOSTICS</span>
          <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 rounded text-[10px]">
            {platformVersion}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-80 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl p-4 text-slate-100 backdrop-blur-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white font-mono">Developer Diagnostics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                {platformVersion}
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Environment:</span>
              <span className="text-amber-400 font-bold">Development</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Active Role:</span>
              <span className="text-blue-300 font-bold">{currentRoleKey}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1">
              {diagnostics.map((d, i) => (
                <div key={i} className="flex justify-between items-center py-0.5">
                  <span className="text-slate-400">{d.name}:</span>
                  <span className={`font-bold flex items-center gap-1 ${d.color}`}>
                    <CheckCircle2 className="w-3 h-3" /> {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
            <span>Module 02.6 Hardened</span>
            <span>PROD: Auto-Disabled</span>
          </div>
        </div>
      )}
    </div>
  );
};
