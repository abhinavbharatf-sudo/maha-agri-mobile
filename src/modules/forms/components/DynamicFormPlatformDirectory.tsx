/**
 * Dynamic Form Platform Directory & Analytics UI Component — DFP Module 06
 * Location: /src/modules/forms/components/DynamicFormPlatformDirectory.tsx
 * Features:
 * - Real-Time Form Submissions Analytics Dashboard
 * - Dynamic Form Catalog with Version Badges (v1.0, v2.0)
 * - Submissions Queue with Immutable Version Lock
 * - Trigger for Form Runner & Form Builder
 */

import React, { useState } from 'react';
import { FormDefinition, FormSubmission } from '../types/form.types';
import { DynamicFormPlatformService } from '../services/DynamicFormPlatformService';
import { DynamicFormRunner } from './DynamicFormRunner';
import { DynamicFormBuilder } from './DynamicFormBuilder';
import { FileText, Plus, Search, Play, Edit3, CheckCircle2, Clock, MapPin, BarChart3, Layers, GitBranch, ShieldCheck } from 'lucide-react';

export const DynamicFormPlatformDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'SUBMISSIONS'>('TEMPLATES');
  const [forms, setForms] = useState<FormDefinition[]>(DynamicFormPlatformService.INITIAL_FORMS);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([
    {
      id: 'sub-1',
      submissionCode: 'SUB-2026-00890',
      formCode: 'FORM-SOIL-01',
      formVersion: 'v1.0',
      applicantUppId: 'UPP-000000125',
      applicantName: 'Ankita Suresh Deshmukh',
      missionCode: 'MSN-2026-00048',
      caseCode: 'CASE-2026-0048',
      answers: {
        Q1_LAND_ACRES: 4.5,
        Q2_SOIL_TYPE: 'Black Cotton Soil (Regur)',
        Q8_HEALTH_RATING: 5,
      },
      submittedByName: 'Suresh Agridoot',
      submittedAt: '2026-07-22T14:30:00Z',
      gpsLatitude: 18.5204,
      gpsLongitude: 73.8567,
    },
    {
      id: 'sub-2',
      submissionCode: 'SUB-2026-00891',
      formCode: 'FORM-DRONE-01',
      formVersion: 'v1.0',
      applicantUppId: 'UPP-000000124',
      applicantName: 'Sunil Dattatray Patil',
      missionCode: 'MSN-2026-00049',
      caseCode: 'CASE-2026-0049',
      answers: {
        QD1_PILOT_LICENSE: 'DGCA-IND-90124',
        QD2_CHEMICAL_TYPE: 'Nano Urea (IFFCO)',
        QD3_SPRAY_ACRES: 5,
      },
      submittedByName: 'Suresh Agridoot',
      submittedAt: '2026-07-22T16:00:00Z',
      gpsLatitude: 20.7453,
      gpsLongitude: 78.6022,
    },
  ]);

  // Selected state for Runner or Builder
  const [selectedFormForRun, setSelectedFormForRun] = useState<FormDefinition | null>(null);
  const [selectedFormForBuild, setSelectedFormForBuild] = useState<FormDefinition | null>(null);
  const [isCreatingNewForm, setIsCreatingNewForm] = useState(false);

  const analytics = DynamicFormPlatformService.computeAnalytics(forms, submissions);

  if (selectedFormForRun) {
    return (
      <DynamicFormRunner
        form={selectedFormForRun}
        onBack={() => setSelectedFormForRun(null)}
        onSubmitSuccess={(newSub) => {
          setSubmissions([newSub, ...submissions]);
          setSelectedFormForRun(null);
        }}
      />
    );
  }

  if (selectedFormForBuild || isCreatingNewForm) {
    return (
      <DynamicFormBuilder
        initialForm={selectedFormForBuild || undefined}
        onBack={() => {
          setSelectedFormForBuild(null);
          setIsCreatingNewForm(false);
        }}
        onSaveForm={(savedForm) => {
          const exists = forms.some((f) => f.id === savedForm.id);
          if (exists) {
            setForms(forms.map((f) => (f.id === savedForm.id ? savedForm : f)));
          } else {
            setForms([savedForm, ...forms]);
          }
          setSelectedFormForBuild(null);
          setIsCreatingNewForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
              Module 06: Dynamic Form Platform (DFP)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v1.4.0-alpha Enterprise
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Dynamic Form Platform Catalog & Analytics</h2>
          <p className="text-xs text-slate-500">
            Form Builder, 12 Question Types, Version Locking (v1.0, v2.0) & Submissions Processing
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Form</span>
        </button>
      </div>

      {/* ─── REAL-TIME DFP ANALYTICS KPI BAR ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Form Templates</p>
          <p className="text-xl font-black text-slate-900">{analytics.totalForms}</p>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Active Forms</p>
          <p className="text-xl font-black text-emerald-600">{analytics.activeForms}</p>
        </div>
        <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Total Submissions</p>
          <p className="text-xl font-black text-blue-600">{analytics.totalSubmissions}</p>
        </div>
        <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Survey / Inspection</p>
          <p className="text-xl font-black text-purple-600">
            {(analytics.submissionsByCategory.SURVEY || 0) + (analytics.submissionsByCategory.INSPECTION || 0)}
          </p>
        </div>
        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Completion Rate</p>
          <p className="text-xl font-black text-amber-600">{analytics.completionRatePercentage}%</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'TEMPLATES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Form Templates ({forms.length})
        </button>
        <button
          onClick={() => setActiveTab('SUBMISSIONS')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'SUBMISSIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Submitted Records Queue ({submissions.length})
        </button>
      </div>

      {/* TAB 1: FORM TEMPLATES CATALOG */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((f) => (
            <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                    {f.formCode}
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                    {f.version}
                  </span>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                  {f.category}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  {f.sections.length} Sections • {f.sections.reduce((acc, s) => acc + s.questions.length, 0)} Total Questions (12 Types)
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedFormForBuild(f)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit in Builder</span>
                </button>

                <button
                  onClick={() => setSelectedFormForRun(f)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Form ({f.version})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SUBMITTED RECORDS QUEUE */}
      {activeTab === 'SUBMISSIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                <th className="p-3">Submission Code</th>
                <th className="p-3">Form Code & Version</th>
                <th className="p-3">Applicant UPP ID</th>
                <th className="p-3">Mission / Case Link</th>
                <th className="p-3">Submitted By</th>
                <th className="p-3">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-700">{sub.submissionCode}</td>
                  <td className="p-3 font-bold">
                    <span>{sub.formCode}</span>{' '}
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      {sub.formVersion}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{sub.applicantName}</p>
                    <p className="font-mono text-[10px] text-slate-400">{sub.applicantUppId}</p>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    <p className="text-purple-700 font-bold">{sub.missionCode}</p>
                    <p className="text-slate-400">{sub.caseCode}</p>
                  </td>
                  <td className="p-3">{sub.submittedByName}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    {new Date(sub.submittedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
