import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Phone, MapPin, Calendar, Clock, ChevronRight, UserCircle, Star, PhoneOff, ShieldAlert } from 'lucide-react';
import { fetchLeads, type CRMLead } from '../lib/api';

const SMART_FILTERS = [
  'All',
  'Today\'s Follow-ups',
  'Callbacks',
  'Interested',
  'Payment Pending',
  'Application Started',
  'Overdue',
  'Do Not Call',
  'Blacklisted',
  'Lost',
  'Assigned To Me'
];

export default function LeadList() {
  const [searchParams] = useSearchParams();
  const defaultFilter = searchParams.get('filter') || 'All';

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSmartFilter, setActiveSmartFilter] = useState(SMART_FILTERS.includes(defaultFilter) ? defaultFilter : 'All');

  // Update filter if URL changes
  useEffect(() => {
    const f = searchParams.get('filter');
    if (f && SMART_FILTERS.includes(f)) setActiveSmartFilter(f);
  }, [searchParams]);

  useEffect(() => {
    fetchLeads()
      .then(data => setLeads(data as CRMLead[]))
      .catch(err => console.error("Error fetching leads", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(q);
        const matchesMobile = lead.mobile_number.includes(q);
        const matchesId = lead.internal_candidate_id.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesId) return false;
      }

      switch (activeSmartFilter) {
        case 'Blacklisted':
          if (!lead.is_blacklisted) return false;
          break;
        case 'Do Not Call':
          if (lead.lead_source !== 'DNC') return false; // Note: adjust based on actual DNC flag logic
          break;
        case 'High Priority': // Placeholder for other filters that don't map to CRMLead yet
          if (lead.priority !== 'High') return false;
          break;
        default:
          break; // 'All'
      }

      return true;
    });
  }, [leads, searchTerm, activeSmartFilter]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Lead Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and track candidate recruitment progress.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Search & Smart Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
          <div className="relative w-full max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, mobile, or ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 md:py-2.5 bg-white border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {SMART_FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveSmartFilter(filter)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                  activeSmartFilter === filter 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        {/* Lead Grid / Table */}
        <div className="p-0 flex-1 overflow-auto bg-slate-50 md:bg-white">
          {loading ? (
             <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Loading Leads...</div>
          ) : filteredLeads.length === 0 ? (
             <div className="p-10 text-center text-slate-500 font-medium">No leads match your filters.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Candidate Profile</th>
                      <th className="px-6 py-4">Contact Details</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Status & Score</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              {lead.first_name ? lead.first_name.charAt(0) : '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{lead.first_name} {lead.last_name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{lead.internal_candidate_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {lead.mobile_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {lead.district ? `${lead.district}, ${lead.state}` : lead.state}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              lead.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {lead.priority}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">{lead.lead_score} pts</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            to={`/crm/leads/${lead.id}`}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                {filteredLeads.map(lead => (
                  <Link 
                    to={`/crm/leads/${lead.id}`} 
                    key={lead.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                          {lead.first_name ? lead.first_name.charAt(0) : '?'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{lead.first_name || 'Unknown'} {lead.last_name || ''}</h4>
                          <p className="text-xs font-medium text-slate-500">{lead.internal_candidate_id}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        lead.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {lead.priority}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{lead.mobile_number}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 text-sm justify-end">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{lead.district || lead.state}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-slate-400 uppercase">Score</span>
                        <span className="text-emerald-600">{lead.lead_score}</span>
                      </div>
                      <div className="text-blue-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                        View Details <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
