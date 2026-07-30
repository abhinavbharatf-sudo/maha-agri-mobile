import React, { useState } from 'react';
import {
  GraduationCap, Plus, Users, Calendar, Award, CheckCircle2, Clock,
  FileSpreadsheet, Filter, Search, BookOpen, Send, Download
} from 'lucide-react';

export default function HRTraining() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const edpBatches = [
    {
      id: 'EDP-MH-2026-01',
      title: 'Agri-Entrepreneurship Development Program (EDP Batch 14)',
      category: 'Rural Entrepreneurship',
      enrolled: 42,
      maxCapacity: 50,
      startDate: '01 August 2026',
      endDate: '15 August 2026',
      status: 'UPCOMING',
      coordinator: 'Dr. S. K. Deshmukh',
      venue: 'VANAMATI Regional Training Institute, Nagpur',
      certificationsIssued: 0,
    },
    {
      id: 'EDP-MH-2026-02',
      title: 'Drone Entrepreneur & Spraying Operator Certification',
      category: 'Agri Drone Operations',
      enrolled: 28,
      maxCapacity: 30,
      startDate: '15 July 2026',
      endDate: '30 July 2026',
      status: 'ACTIVE',
      coordinator: 'Prof. Anil Varma',
      venue: 'Krishi Vigyan Kendra (KVK), Wardha',
      certificationsIssued: 14,
    },
    {
      id: 'EDP-MH-2026-03',
      title: 'Soil Testing Chemist & Lab Technician EDP',
      category: 'Soil Health & Chemist',
      enrolled: 35,
      maxCapacity: 35,
      startDate: '01 June 2026',
      endDate: '20 June 2026',
      status: 'COMPLETED',
      coordinator: 'Smt. Radhika Joshi',
      venue: 'State Soil Testing Laboratory, Pune',
      certificationsIssued: 35,
    },
  ];

  const filteredBatches = edpBatches.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || b.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5 font-sans text-slate-900">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Training & EDP Management Portal</h2>
            <p className="text-xs text-slate-500 font-medium">
              Entrepreneurship Development Program (EDP) & Agri-Skill Certification Manager
            </p>
          </div>
        </div>

        <button className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all">
          <Plus className="w-4 h-4" />
          <span>Create New EDP Training Batch</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Active EDP Batches</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-900">12 Batches</span>
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Total Enrolled Trainees</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-900">385 Candidates</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Certificates Issued</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-900">1,420 EDP Cards</span>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Completion Success Rate</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-slate-900">96.4% Passed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search EDP batch title or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedFilter === status
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* EDP Batches List */}
      <div className="space-y-3">
        {filteredBatches.map(batch => (
          <div key={batch.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {batch.id}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  batch.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                  batch.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {batch.status}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {batch.category}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{batch.title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Venue: <strong>{batch.venue}</strong> • Coordinator: {batch.coordinator}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Duration: {batch.startDate} to {batch.endDate}
              </p>
            </div>

            <div className="flex items-center space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              <div className="text-right space-y-0.5">
                <span className="text-xs font-bold text-slate-700 block">Enrolled Candidates</span>
                <span className="text-sm font-black text-emerald-800">{batch.enrolled} / {batch.maxCapacity} Seats</span>
              </div>

              <button className="bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs">
                Manage Batch
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
