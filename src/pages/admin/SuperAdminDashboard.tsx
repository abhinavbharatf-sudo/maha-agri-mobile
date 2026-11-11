import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid, Users, Settings, Sprout, ArrowRight, Globe, Shield, PhoneCall
} from 'lucide-react';

export default function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-6 sm:p-12 font-sans antialiased">
      {/* Central Launchpad Container */}
      <div className="max-w-5xl mx-auto w-full space-y-8 my-auto">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
            MASTER CONTROL CENTER
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Central Operations & Control Gateway
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-xl mx-auto">
            Select an operational workspace below to access dedicated management modules, user permissions, and analytics.
          </p>
        </div>

        {/* 4-Card 2x2 Grid Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: HR & Recruitment Panel */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-500 transition-all space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  HR PANEL
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-900">HR & Recruitment Panel</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Job Posting Editor, Recruitment Blueprints, Candidate Applications, Interview Slots, Document Verification, and Offer Letters.
                </p>
              </div>
            </div>

            <Link
              to="/admin/rms/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors pt-2"
            >
              <span>Enter HR Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: CSM & Telecalling Panel */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-500 transition-all space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Users className="w-6 h-6" />
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  CSM / CRM PANEL
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-900">CSM & Telecalling Panel</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Manage candidate leads, monitor telecaller performance, assign follow-up calls, and track conversion metrics.
                </p>
              </div>
            </div>

            <Link
              to="/crm/dashboard"
              className="inline-flex items-center space-x-2 text-xs font-black text-amber-600 hover:text-amber-700 transition-colors pt-2"
            >
              <span>Enter CRM Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: System Admin & User Management */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-purple-500 transition-all space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Settings className="w-6 h-6" />
                </div>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  SYSTEM ADMIN
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-900">System Admin & User Management</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  User Roles, Data Permissions (RBAC), Security Settings, Audit Logs, and Global Configuration.
                </p>
              </div>
            </div>

            <Link
              to="/admin/users"
              className="inline-flex items-center space-x-2 text-xs font-black text-purple-600 hover:text-purple-700 transition-colors pt-2"
            >
              <span>Enter Admin Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 4: MAHA-AGRI Operations Platform */}
          <div className="bg-white p-7 rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md hover:border-emerald-600 transition-all space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <Sprout className="w-6 h-6" />
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-200">
                  GDOP PLATFORM
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-slate-900">MAHA-AGRI Operations Platform</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Service Request Engine, Mission Execution (MEE), Financial Ledger, Notifications, and Public Verification Gateway.
                </p>
              </div>
            </div>

            <Link
              to="/maha-agri-admin"
              className="inline-flex items-center space-x-2 text-xs font-black text-emerald-700 hover:text-emerald-800 transition-colors pt-2"
            >
              <span>Open GDOP Platform</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Footer Link */}
        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>Go to Abhinav Bharat Foundation Main Public Website</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
