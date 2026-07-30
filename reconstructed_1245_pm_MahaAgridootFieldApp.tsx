import fs from 'fs';

const filePath = 'e:/project-bolt-sb1-qsboyjjv/project/src/modules/agridoot/MahaAgridootFieldApp.tsx';
let fileContent = fs.readFileSync(filePath, 'utf8');

const startMarker = `{/* 1. ASSIGNED WORK (TODAYS_MISSION) - FINAL HYBRID PRODUCTION LAYOUT */}`;
const endMarker = `{/* 2. FARMER MANAGEMENT (FARMER_REGISTRATION) */}`;

const startIndex = fileContent.indexOf(startMarker);
const endIndex = fileContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newV2RefinementCode = `{/* 1. ASSIGNED WORK (TODAYS_MISSION) - FINAL PRODUCTION UX REFINEMENT (v2) */}
          {activeMainView === 'TODAYS_MISSION' && (
            <div className="space-y-3.5 text-xs">
              
              {/* SCREEN TITLE HEADER */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={\`font-black text-base \${textPrimary}\`}>Today's Assigned Work</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* REFINED 4 COMPACT CLICKABLE SUMMARY STATISTICS CARDS (REDUCED HEIGHT BY 20%) */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <button
                  onClick={() => setAssignedWorkTab('active')}
                  className={\`p-2 \${cardBg} rounded-2xl border transition-all \${assignedWorkTab === 'active' ? 'border-emerald-500 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/50' : 'border-slate-800 hover:border-slate-700'} space-y-0.5\` me-0}
                >
                  <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Today's Tasks</span>
                  <span className="text-sm font-black text-white block">28</span>
                </button>

                <button
                  onClick={() => setAssignedWorkTab('active')}
                  className={\`p-2 \${cardBg} rounded-2xl border transition-all \${assignedWorkTab === 'active' ? 'border-emerald-500 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/50' : 'border-slate-800 hover:border-slate-700'} space-y-0.5\`}
                >
                  <span className="text-[8.5px] font-extrabold text-emerald-400 uppercase tracking-wider block truncate">Active</span>
                  <span className="text-sm font-black text-emerald-300 block">4</span>
                </button>

                <button
                  onClick={() => setAssignedWorkTab('upcoming')}
                  className={\`p-2 \${cardBg} rounded-2xl border transition-all \${assignedWorkTab === 'upcoming' ? 'border-blue-500 bg-blue-950/20 shadow-md ring-1 ring-blue-500/50' : 'border-slate-800 hover:border-slate-700'} space-y-0.5\`}
                >
                  <span className="text-[8.5px] font-extrabold text-blue-400 uppercase tracking-wider block truncate">Upcoming</span>
                  <span className="text-sm font-black text-blue-300 block">3</span>
                </button>

                <button
                  onClick={() => setAssignedWorkTab('completed')}
                  className={\`p-2 \${cardBg} rounded-2xl border relative transition-all \${assignedWorkTab === 'completed' ? 'border-teal-500 bg-teal-950/20 shadow-md ring-1 ring-teal-500/50' : 'border-slate-800 hover:border-slate-700'} space-y-0.5\`}
                >
                  {/* COMPACT OVERDUE INDICATOR BADGE */}
                  <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-rose-600 text-white font-black text-[8px] rounded-full border border-rose-400 shadow animate-pulse">
                    1 Overdue
                  </span>
                  <span className="text-[8.5px] font-extrabold text-teal-400 uppercase tracking-wider block truncate">Completed</span>
                  <span className="text-sm font-black text-teal-300 block">18</span>
                </button>
              </div>

              {/* TODAY'S PROGRESS BAR */}
              <div className={\`p-2.5 \${cardBg} rounded-2xl border border-slate-800/80 space-y-1.5 shadow-sm\`}>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-extrabold text-slate-300 flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>Today's Progress</span>
                  </span>
                  <span className="font-black text-emerald-400">64% <span className="text-slate-400 font-semibold">(18 of 28 Completed)</span></span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: '64%' }}></div>
                </div>
              </div>

              {/* REFINED MATERIAL DESIGN 3 FILTER CHIPS WITH SEPARATE BADGE COUNT */}
              <div className="grid grid-cols-5 gap-1 text-[9.5px] font-bold">
                {[
                  { id: 'active', label: 'Active', count: 4 },
                  { id: 'upcoming', label: 'Upcoming', count: 3 },
                  { id: 'priority', label: 'Priority', count: 2 },
                  { id: 'overdue', label: 'Overdue', count: 1, isUrgent: true },
                  { id: 'completed', label: 'Completed', count: 18 }
                ].map(chip => {
                  const isActive = assignedWorkTab === chip.id;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setAssignedWorkTab(chip.id as any)}
                      className={\`py-1.5 px-0.5 rounded-xl border flex items-center justify-center space-x-1 transition-all \${
                        isActive
                          ? 'bg-emerald-600 text-white font-black border-emerald-500 shadow-md scale-[1.02]'
                          : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                      }\`}
                    >
                      <span className="truncate">{chip.label}</span>
                      <span className={\`px-1.5 py-0.2 rounded-full text-[8.5px] font-black \${
                        isActive
                          ? 'bg-white/20 text-white'
                          : chip.isUrgent
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }\`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* TASK LIST - RENDERS ONLY TASKS BELONGING TO SELECTED FILTER CHIP */}
              <div className="space-y-3 pt-0.5">
                {(() => {
                  const tasksMap: Record<string, Array<{
                    id: string;
                    type: string;
                    farmer: string;
                    village: string;
                    gps: string;
                    dueDate: string;
                    dueTime: string;
                    priority: string;
                    status: string;
                    assignedBy: string;
                  }>> = {
                    active: [
                      { id: 'TSK-2026-0891', type: 'Soil Sample Collection', farmer: 'Rameshwar Patil', village: 'Pimpri, Wardha', gps: '20.7453° N, 78.6022° E', dueDate: '30 Jul 2026', dueTime: '04:30 PM', priority: 'HIGH', status: 'IN_PROGRESS', assignedBy: 'Block Ag. Officer' },
                      { id: 'TSK-2026-0895', type: 'Crop Inspection & Pest Audit', farmer: 'Ganesh Deshmukh', village: 'Seloo, Wardha', gps: '20.8122° N, 78.7104° E', dueDate: '30 Jul 2026', dueTime: '05:45 PM', priority: 'HIGH', status: 'IN_PROGRESS', assignedBy: 'District Ag. Office' },
                      { id: 'TSK-2026-0898', type: 'Fertilizer Grant Verification', farmer: 'Vijay Pawar', village: 'Deoli, Wardha', gps: '20.6511° N, 78.4820° E', dueDate: '30 Jul 2026', dueTime: '06:15 PM', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedBy: 'Block Ag. Officer' },
                      { id: 'TSK-2026-0902', type: 'Water Table Telemetry Check', farmer: 'Prakash Jadhav', village: 'Hinganghat', gps: '20.5510° N, 78.8350° E', dueDate: '30 Jul 2026', dueTime: '07:00 PM', priority: 'LOW', status: 'ASSIGNED', assignedBy: 'Sub-Div. Officer' }
                    ],
                    upcoming: [
                      { id: 'TSK-2026-0910', type: 'Agri-Drone Spraying Demo', farmer: 'Suresh Deshmukh', village: 'Seloo, Wardha', gps: '20.8122° N, 78.7104° E', dueDate: '31 Jul 2026', dueTime: '10:00 AM', priority: 'HIGH', status: 'SCHEDULED', assignedBy: 'District Ag. Office' },
                      { id: 'TSK-2026-0912', type: 'Organic Certification Site Visit', farmer: 'Nitin Kadam', village: 'Arvi, Wardha', gps: '20.9800° N, 78.2300° E', dueDate: '31 Jul 2026', dueTime: '02:00 PM', priority: 'MEDIUM', status: 'SCHEDULED', assignedBy: 'Block Ag. Officer' },
                      { id: 'TSK-2026-0915', type: 'Farmer Producer Org Workshop', farmer: 'Anil Shinde', village: 'Samudrapur', gps: '20.5900° N, 79.0100° E', dueDate: '01 Aug 2026', dueTime: '11:30 AM', priority: 'LOW', status: 'SCHEDULED', assignedBy: 'State Extension Office' }
                    ],
                    priority: [
                      { id: 'TSK-2026-0892', type: 'Emergency Pest Outbreak Inspection', farmer: 'Sunil Gawande', village: 'Hinganghat, Wardha', gps: '20.5400° N, 78.8400° E', dueDate: '30 Jul 2026', dueTime: '03:00 PM', priority: 'URGENT', status: 'PENDING', assignedBy: 'District Ag. Office' },
                      { id: 'TSK-2026-0894', type: 'Disaster Compensation Assessment', farmer: 'Vinod Kale', village: 'Ashti, Wardha', gps: '21.2100° N, 78.1700° E', dueDate: '30 Jul 2026', dueTime: '04:00 PM', priority: 'URGENT', status: 'PENDING', assignedBy: 'State Agri Dept' }
                    ],
                    overdue: [
                      { id: 'TSK-2026-0880', type: 'Soil Health Card Distribution', farmer: 'Maroti Bhoyar', village: 'Karanja, Wardha', gps: '21.1500° N, 78.3600° E', dueDate: '29 Jul 2026', dueTime: '05:00 PM', priority: 'HIGH', status: 'OVERDUE', assignedBy: 'Block Ag. Officer' }
                    ],
                    completed: [
                      { id: 'TSK-2026-0850', type: 'Drone Spraying Pilot Drive #12', farmer: 'Dipak Mahajan', village: 'Seloo', gps: '20.8122° N, 78.7104° E', dueDate: '29 Jul 2026', dueTime: '01:00 PM', priority: 'MEDIUM', status: 'COMPLETED', assignedBy: 'District Ag. Office' },
                      { id: 'TSK-2026-0852', type: 'DBT Subsidy Field Audit', farmer: 'Sanjay Wagh', village: 'Wardha Central', gps: '20.7400° N, 78.6000° E', dueDate: '28 Jul 2026', dueTime: '04:00 PM', priority: 'HIGH', status: 'COMPLETED', assignedBy: 'Block Ag. Officer' },
                      ...Array.from({ length: 16 }, (_, i) => ({
                        id: \`TSK-2026-08\${30 - i}\`,
                        type: \`Completed Field Mission #\${i + 3}\`,
                        farmer: \`Farmer \${i + 3}\`,
                        village: 'Wardha Sub-Division',
                        gps: '20.7500° N, 78.6000° E',
                        dueDate: \`\${27 - Math.floor(i / 3)} Jul 2026\`,
                        dueTime: '03:00 PM',
                        priority: 'MEDIUM',
                        status: 'COMPLETED',
                        assignedBy: 'Dept of Agriculture'
                      }))
                    ]
                  };

                  const currentTasks = tasksMap[assignedWorkTab] || tasksMap['active'];

                  return currentTasks.map(task => (
                    <div key={task.id} className={\`p-4 \${cardBg} rounded-3xl border border-slate-800 shadow-lg space-y-3\`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                          {task.id}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className={\`px-2 py-0.5 rounded-full text-[9px] font-black \${task.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}\`}>
                            {task.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className={\`font-black text-sm \${textPrimary}\`}>{task.type}</h4>
                        <p className={\`text-xs \${textSecondary} font-semibold mt-0.5\`}>Farmer: <span className="text-white font-bold">{task.farmer}</span> • {task.village}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block text-[9px] font-bold">GPS LOCATION</span>
                          <span className="text-emerald-400 font-mono font-semibold flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{task.gps}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] font-bold">DUE DATE & TIME</span>
                          <span className="text-slate-200 font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{task.dueDate} • {task.dueTime}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium">
                        Assigned By: <span className="text-slate-300 font-bold">{task.assignedBy}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button onClick={() => triggerToast(\`Started work on \${task.id}\`)} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10.5px] shadow-md flex items-center justify-center space-x-1">
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </button>
                        <button onClick={() => triggerToast(\`Evidence upload opened for \${task.id}\`)} className="py-2 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-bold rounded-xl text-[10.5px] border border-blue-500/30 flex items-center justify-center space-x-1">
                          <Camera className="w-3 h-3" />
                          <span>Evidence</span>
                        </button>
                        <button onClick={() => triggerToast(\`Task \${task.id} marked complete\`)} className="py-2 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl text-[10.5px] shadow-md flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete</span>
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

            </div>
          )}

`;

  fileContent = fileContent.slice(0, startIndex) + newV2RefinementCode + fileContent.slice(endIndex);
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log('Successfully applied Final Production UX Refinement (v2) to MahaAgridootFieldApp.tsx');
} else {
  console.error('Could not locate TODAYS_MISSION markers');
}
