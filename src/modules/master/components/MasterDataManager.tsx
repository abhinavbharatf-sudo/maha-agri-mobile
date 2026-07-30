/**
 * MasterDataManager Component
 * Enterprise Master Data Administration Overview & Management Dashboard.
 */

import React, { useState } from 'react';
import {
  Building2, MapPin, Briefcase, Wrench, Database, FileText,
  CreditCard, Settings, Calendar, Bell, Layers, CheckCircle, RefreshCw
} from 'lucide-react';
import { LookupSelect } from './LookupSelect';
import { GeographySelector } from './GeographySelector';
import { masterDataService } from '../services/MasterDataService';

export const MasterDataManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GEOGRAPHY' | 'LOOKUPS'>('OVERVIEW');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluka, setSelectedTaluka] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [testGender, setTestGender] = useState('');

  const masterCategories = [
    { title: 'Organizations', icon: Building2, desc: 'Multi-Org Hierarchy, Branches & Departments', color: 'from-blue-600 to-indigo-700' },
    { title: 'Geography Master', icon: MapPin, desc: 'Country, State, Region, District, Taluka, Village', color: 'from-emerald-600 to-teal-700' },
    { title: 'Project Master', icon: Briefcase, desc: 'Agricultural Initiatives, Schemes & FY Links', color: 'from-amber-600 to-orange-700' },
    { title: 'Service Master', icon: Wrench, desc: 'Soil Testing, EDP, Drone Training & Spraying', color: 'from-purple-600 to-pink-700' },
    { title: 'Enhanced Lookup Engine', icon: Database, desc: 'Gender, Education, Occupation, Category & System Rules', color: 'from-cyan-600 to-blue-700' },
    { title: 'Document Types', icon: FileText, desc: 'Aadhaar, PAN, Voter ID, Passport & Farmer IDs', color: 'from-rose-600 to-red-700' },
    { title: 'Payment Methods', icon: CreditCard, desc: 'Cash, UPI, QR, Razorpay, Bank Transfer & Cheque', color: 'from-emerald-600 to-green-700' },
    { title: 'System Settings', icon: Settings, desc: 'OTP Length, Password Policy, GPS Accuracy & Lockouts', color: 'from-slate-600 to-gray-700' },
    { title: 'Financial Years', icon: Calendar, desc: 'FY Periods (e.g. FY 2025-26) & Active Triggers', color: 'from-blue-600 to-cyan-700' },
    { title: 'Notification Templates', icon: Bell, desc: 'SMS, WhatsApp & Email Template Manager', color: 'from-amber-600 to-yellow-700' },
  ];

  return (
    <div className="w-full bg-primary-50/50 p-4 sm:p-6 rounded-2xl border border-primary-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-primary-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-primary-900">Master Data Management (MDM)</h1>
          </div>
          <p className="text-xs text-primary-500 mt-1">
            Single Source of Truth for Organizations, Geography, Projects, Services, and System Masters.
          </p>
        </div>

        <button
          onClick={() => masterDataService.clearCache()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-primary-200 rounded-xl text-xs font-semibold text-primary-700 hover:bg-primary-50 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Cache</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-primary-200 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'OVERVIEW' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-100'
          }`}
        >
          Overview (10 Masters)
        </button>
        <button
          onClick={() => setActiveTab('GEOGRAPHY')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'GEOGRAPHY' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-100'
          }`}
        >
          Geography Selector Component
        </button>
        <button
          onClick={() => setActiveTab('LOOKUPS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'LOOKUPS' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-100'
          }`}
        >
          Lookup Engine Component
        </button>
      </div>

      {/* Tab: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {masterCategories.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-primary-100 hover:shadow-md transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-md`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary-900 group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-primary-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: GEOGRAPHY */}
      {activeTab === 'GEOGRAPHY' && (
        <div className="bg-white p-5 rounded-xl border border-primary-100 space-y-4">
          <h3 className="text-sm font-bold text-primary-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Reusable Mobile-First Cascading Geography Selector
          </h3>
          <p className="text-xs text-primary-500">
            Cascading selection from State down to Village using cached Master Data Service.
          </p>

          <GeographySelector
            selectedStateId={selectedState}
            selectedDistrictId={selectedDistrict}
            selectedTalukaId={selectedTaluka}
            selectedVillageId={selectedVillage}
            onStateChange={setSelectedState}
            onDistrictChange={setSelectedDistrict}
            onTalukaChange={setSelectedTaluka}
            onVillageChange={setSelectedVillage}
          />
        </div>
      )}

      {/* Tab: LOOKUPS */}
      {activeTab === 'LOOKUPS' && (
        <div className="bg-white p-5 rounded-xl border border-primary-100 space-y-4">
          <h3 className="text-sm font-bold text-primary-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Generic Reusable Lookup Selector
          </h3>
          <p className="text-xs text-primary-500">
            Dynamically populates dropdown values from normalized lookup categories without hardcoded strings.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LookupSelect
              categoryKey="GENDER"
              label="Gender Lookup"
              value={testGender}
              onChange={(e) => setTestGender(e.target.value)}
            />
            <LookupSelect categoryKey="EDUCATION" label="Education Qualification" />
            <LookupSelect categoryKey="OCCUPATION" label="Occupation Category" />
          </div>
        </div>
      )}
    </div>
  );
};
