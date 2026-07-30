import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, ArrowLeft, Calendar, FileText, CheckCircle, Clock, User, Briefcase, MessagesSquare, MapPin, CalendarClock, Target, PhoneOutgoing, PhoneOff, Mic } from 'lucide-react';
import { fetchLeadDetails, logCall, addComment, scheduleFollowUp } from '../lib/api';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cloud Telephony State (UI Only)
  const [activeCallState, setActiveCallState] = useState<'idle' | 'dialing' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);

  // Call logging state
  const [showCallForm, setShowCallForm] = useState(false);
  const [callStatus, setCallStatus] = useState('Connected');
  const [callDisposition, setCallDisposition] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [loggingCall, setLoggingCall] = useState(false);

  // Follow-up state
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupType, setFollowupType] = useState('Call');
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  useEffect(() => {
    let timer: any;
    if (activeCallState === 'connected') {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCallState]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadLead = () => {
    setLoading(true);
    fetchLeadDetails(id!)
      .then(data => setLead(data))
      .catch(err => console.error("Error fetching lead", err))
      .finally(() => setLoading(false));
  };

  const handleStartCall = () => {
    setActiveCallState('dialing');
    // Simulate connection
    setTimeout(() => setActiveCallState('connected'), 2000);
  };

  const handleEndCall = () => {
    setActiveCallState('ended');
    setShowCallForm(true); // Auto-open disposition form
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !callNotes) return;
    setLoggingCall(true);
    try {
      await logCall(id, null, callStatus, callDisposition, callNotes);
      setShowCallForm(false);
      setActiveCallState('idle');
      setCallNotes('');
      loadLead(); // reload to get new timeline event
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingCall(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !followupDate) return;
    setSchedulingFollowup(true);
    try {
      await scheduleFollowUp(id, new Date(followupDate).toISOString(), followupType, '', null, 'telecaller-id');
      setShowFollowUpForm(false);
      setFollowupDate('');
      loadLead();
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingFollowup(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText) return;
    setSubmittingComment(true);
    try {
      await addComment(id, null, commentText);
      setCommentText('');
      setShowCommentForm(false);
      loadLead();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const MobileQuickActionBar = () => {
    if (activeCallState !== 'idle') {
      return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 p-4 pb-safe z-50 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-full">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeCallState === 'dialing' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <PhoneOutgoing className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">{lead?.first_name} {lead?.last_name}</div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                {activeCallState === 'dialing' ? 'Dialing...' : <span className="text-emerald-400 font-bold">{formatDuration(callDuration)}</span>}
              </div>
            </div>
          </div>
          <button onClick={handleEndCall} className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      );
    }

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 pb-safe z-50 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onClick={handleStartCall} className="flex flex-col items-center gap-1 text-emerald-600">
          <Phone className="w-6 h-6 p-1 rounded-full bg-emerald-50" />
          <span className="text-[10px] font-bold uppercase">Call</span>
        </button>
        <a href={`https://wa.me/${lead?.mobile_number}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-emerald-600">
          <MessagesSquare className="w-6 h-6 p-1 rounded-full bg-emerald-50" />
          <span className="text-[10px] font-bold uppercase">WhatsApp</span>
        </a>
        <button onClick={() => { setShowCommentForm(!showCommentForm); setShowCallForm(false); setShowFollowUpForm(false); window.scrollTo(0, document.body.scrollHeight); }} className="flex flex-col items-center gap-1 text-orange-500">
          <FileText className="w-6 h-6 p-1 rounded-full bg-orange-50" />
          <span className="text-[10px] font-bold uppercase">Note</span>
        </button>
        <button onClick={() => { setShowFollowUpForm(!showFollowUpForm); setShowCallForm(false); setShowCommentForm(false); window.scrollTo(0, 0); }} className="flex flex-col items-center gap-1 text-indigo-600">
          <CalendarClock className="w-6 h-6 p-1 rounded-full bg-indigo-50" />
          <span className="text-[10px] font-bold uppercase">Follow-up</span>
        </button>
        <button onClick={() => { setShowCallForm(true); window.scrollTo(0, 0); }} className="flex flex-col items-center gap-1 text-slate-600">
          <Target className="w-6 h-6 p-1 rounded-full bg-slate-100" />
          <span className="text-[10px] font-bold uppercase">Log</span>
        </button>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-slate-500">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">Loading Candidate Profile...</span>
      </div>
    </div>
  );

  if (!lead) return (
    <div className="p-8 bg-red-50 text-red-600 rounded-xl border border-red-200 m-6">
      Lead not found. Please check the URL and try again.
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-6 relative">
      
      {/* Compact Lead Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full">
            <Link to="/crm/leads" className="p-2.5 bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-full">
              <div className="flex items-center justify-between md:justify-start gap-3 mb-1 w-full">
                <h2 className="text-xl md:text-2xl font-bold truncate">{lead.first_name || 'Unknown'} {lead.last_name || ''}</h2>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  lead.priority === 'High' ? 'bg-red-500 text-white' :
                  lead.priority === 'Medium' ? 'bg-orange-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  {lead.priority}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium mt-1">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.mobile_number}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {lead.district || 'Location not set'}</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex gap-3 shrink-0">
            {activeCallState !== 'idle' ? (
              <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${activeCallState === 'dialing' ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                <span className="font-mono text-sm">{activeCallState === 'dialing' ? 'Dialing...' : formatDuration(callDuration)}</span>
                <button onClick={handleEndCall} className="ml-2 text-red-400 hover:text-red-300">
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowFollowUpForm(!showFollowUpForm); setShowCallForm(false); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all text-sm">
                  <CalendarClock className="w-4 h-4" /> Follow-up
                </button>
                <button onClick={handleStartCall} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all text-sm">
                  <Phone className="w-4 h-4" /> Call
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lead Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50 border-t border-slate-200 text-sm">
          <div className="p-3 md:p-4">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Candidate ID</span>
            <span className="font-mono font-medium text-slate-900">{lead.internal_candidate_id}</span>
          </div>
          <div className="p-3 md:p-4">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Lead Score</span>
            <span className="font-bold text-emerald-600">{lead.lead_score} pts</span>
          </div>
          <div className="p-3 md:p-4">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Lead Owner</span>
            <span className="font-semibold text-slate-700">{lead.assigned_to?.full_name || 'Unassigned'}</span>
          </div>
          <div className="p-3 md:p-4">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Last Contact</span>
            <span className="font-medium text-slate-700">{lead.activity_logs?.[0]?.created_at ? new Date(lead.activity_logs[0].created_at).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>
      </div>

      {/* Forms Area (Top) */}
      <div className="space-y-4">
        {/* Call Logger Form */}
        {showCallForm && (
          <div className="bg-white p-5 rounded-2xl shadow-lg border-2 border-emerald-100 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900">{activeCallState === 'ended' ? 'Log Completed Call' : 'Log External Call'}</h3>
            </div>
            <form onSubmit={handleLogCall} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select value={callStatus} onChange={e => setCallStatus(e.target.value)} className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500">
                    <option>Connected</option>
                    <option>Not Reachable</option>
                    <option>Busy</option>
                    <option>Wrong Number</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disposition</label>
                  <select value={callDisposition} onChange={e => setCallDisposition(e.target.value)} className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500">
                    <option>Interested</option>
                    <option>Not Interested</option>
                    <option>Call Back Later</option>
                    <option>Follow Up</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea 
                  value={callNotes} 
                  onChange={e => setCallNotes(e.target.value)}
                  required
                  placeholder="Summary of the call..."
                  className="w-full text-sm border-slate-200 rounded-lg h-24 focus:ring-emerald-500 resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowCallForm(false); setActiveCallState('idle'); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg w-full sm:w-auto">Cancel</button>
                <button type="submit" disabled={loggingCall} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 w-full sm:w-auto flex items-center justify-center">
                  {loggingCall ? 'Saving...' : 'Save Disposition'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schedule Follow-up Form */}
        {showFollowUpForm && (
          <div className="bg-white p-5 rounded-2xl shadow-lg border-2 border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <CalendarClock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Schedule Follow-up</h3>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date & Time</label>
                  <input type="datetime-local" value={followupDate} onChange={e => setFollowupDate(e.target.value)} required className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select value={followupType} onChange={e => setFollowupType(e.target.value)} className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500">
                    <option>Call</option>
                    <option>WhatsApp</option>
                    <option>Email</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowFollowUpForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg w-full sm:w-auto">Cancel</button>
                <button type="submit" disabled={schedulingFollowup} className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 w-full sm:w-auto flex items-center justify-center">
                  {schedulingFollowup ? 'Scheduling...' : 'Schedule Reminder'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Timeline & Applications */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Applications Section */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">Job Applications</h3>
            </div>
            
            {lead.interested_jobs?.length > 0 ? (
              <div className="space-y-3">
                {lead.interested_jobs.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{app.job?.title || 'Unknown Position'}</h4>
                      <p className="text-sm text-slate-500 font-mono mt-0.5">{app.application_id || 'Not applied yet'}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {app.current_stage}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">Last activity: {new Date(app.last_activity).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-4 text-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                Candidate has not shown interest in any jobs yet.
              </p>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-800">Activity Timeline</h3>
              </div>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {lead.activity_logs?.map((log: any) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    {log.activity_type.includes('Call') ? <Phone className="w-4 h-4 text-blue-600" /> :
                     log.activity_type.includes('WhatsApp') ? <MessagesSquare className="w-4 h-4 text-emerald-600" /> :
                     log.activity_type.includes('Stage') ? <Briefcase className="w-4 h-4 text-indigo-600" /> :
                     <CheckCircle className="w-4 h-4 text-slate-600" />}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 text-sm">{log.activity_type}</h4>
                      <time className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                    </div>
                    <p className="text-sm text-slate-600 leading-snug">{log.description}</p>
                    <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> By {log.actor?.full_name || log.actor_type}
                    </div>
                  </div>
                </div>
              ))}
              {!lead.activity_logs?.length && (
                <p className="text-sm text-slate-500 text-center py-4 relative z-10">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Internal Comments (Visible on Desktop, Bottom on Mobile if toggled) */}
        <div className={`space-y-6 ${showCommentForm ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-800">Internal Notes</h3>
              </div>
              <button className="md:hidden" onClick={() => setShowCommentForm(false)}><ArrowLeft className="w-5 h-5 text-slate-400"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 max-h-[300px] md:max-h-full">
              {lead.comments?.map((comment: any) => (
                <div key={comment.id} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                  <p className="text-sm text-slate-700 mb-2">{comment.comment_text}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>{comment.user?.full_name || 'System'}</span>
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {!lead.comments?.length && (
                <p className="text-sm text-slate-400 text-center py-4">No internal notes yet.</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="shrink-0 pt-4 border-t border-slate-100">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add an internal note..."
                required
                className="w-full text-sm border-slate-200 rounded-xl h-20 mb-3 focus:ring-orange-500 focus:border-orange-500 resize-none"
              ></textarea>
              <button 
                type="submit" 
                disabled={submittingComment}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {submittingComment ? 'Adding...' : 'Add Note'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <MobileQuickActionBar />
    </div>
  );
}
