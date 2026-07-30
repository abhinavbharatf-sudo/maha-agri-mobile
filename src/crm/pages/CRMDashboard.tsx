import { useState, useEffect } from 'react';
import { fetchLeads, type CRMLead } from '../lib/api';
import { Users, PhoneCall, Target, TrendingUp, Clock, AlertCircle, PhoneOff, ShieldAlert, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CRMDashboard() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads().then(data => setLeads(data as CRMLead[])).finally(() => setLoading(false));
  }, []);

  const highPriorityCount = leads.filter(l => l.priority === 'High').length;
  const blacklistedCount = leads.filter(l => l.is_blacklisted).length;
  // Note: These mock calculations for metrics will be updated when the backend provides aggregated endpoints
  const followupsToday = 12; 
  const callbacksCount = 5;
  const overdueCount = 3;
  const dncCount = leads.filter(l => l.lead_source === 'DNC').length || 2; 

  const recentLeads = leads.slice(0, 5);

  const stats = [
    { label: 'Total Leads', value: leads.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', filterParam: 'All' },
    { label: 'Today\'s Follow-ups', value: followupsToday.toString(), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-100', filterParam: 'Today\'s Follow-ups' },
    { label: 'Callbacks', value: callbacksCount.toString(), icon: PhoneCall, color: 'text-emerald-600', bg: 'bg-emerald-100', filterParam: 'Callbacks' },
    { label: 'Overdue', value: overdueCount.toString(), icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', filterParam: 'Overdue' },
    { label: 'High Priority', value: highPriorityCount.toString(), icon: Target, color: 'text-red-600', bg: 'bg-red-100', filterParam: 'High Priority' },
    { label: 'Do Not Call', value: dncCount.toString(), icon: PhoneOff, color: 'text-slate-600', bg: 'bg-slate-200', filterParam: 'Do Not Call' },
    { label: 'Blacklisted', value: blacklistedCount.toString(), icon: ShieldAlert, color: 'text-rose-800', bg: 'bg-rose-100', filterParam: 'Blacklisted' },
    { label: 'Reports Gen.', value: '18', icon: BarChart, color: 'text-purple-600', bg: 'bg-purple-100', filterParam: 'All' },
  ];

  if (loading) {
    return (
      <div className="p-10 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CRM Overview</h2>
          <p className="text-slate-500 text-sm mt-1">Welcome back. Here is what's happening with your leads today.</p>
        </div>
      </div>

      {/* KPI Cards (Fully Responsive) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link to={`/crm/leads?filter=${encodeURIComponent(stat.filterParam)}`} key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">{stat.label}</span>
                <span className="block text-2xl font-bold text-slate-900 leading-none">{stat.value}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Recent Leads
            </h3>
            <Link to="/crm/leads" className="text-sm font-semibold text-blue-600 hover:text-blue-800">View All</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLeads.map(lead => (
              <div key={lead.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {lead.first_name ? lead.first_name.charAt(0) : '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{lead.first_name} {lead.last_name}</h4>
                    <p className="text-xs text-slate-500">{lead.mobile_number}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    lead.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {lead.priority}
                  </span>
                  <p className="text-xs font-semibold text-emerald-600">{lead.lead_score} pts</p>
                </div>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No recent leads found.</div>
            )}
          </div>
        </div>

        {/* Action Center */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-sm border border-slate-700 p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <PhoneCall className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">Ready to dial?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-[200px]">You have {followupsToday} pending follow-ups scheduled for today.</p>
            
            <div className="space-y-3">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <PhoneCall className="w-4 h-4" /> Start Auto-Dialer
              </button>
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors text-slate-300">
                View Reports
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
