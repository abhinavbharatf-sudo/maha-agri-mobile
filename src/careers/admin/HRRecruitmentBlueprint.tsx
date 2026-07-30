import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Building2, Briefcase, FileText, GitBranch, Mail,
  CheckCircle2, AlertCircle, Settings, Eye, Save,
  Copy, HelpCircle, ToggleLeft, ToggleRight,
  ClipboardList, MessageSquare,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType =
  | 'short_text' | 'paragraph' | 'number' | 'yes_no'
  | 'radio' | 'checkbox' | 'dropdown' | 'date' | 'file_upload';

interface BlueprintQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  helpText: string;
  options: string[];
}

interface WorkflowStage {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface BlueprintTemplate {
  name: string;
  content: string;
  variables: string[];
}

interface Blueprint {
  project: string;
  positionName: string;
  employmentType: string;
  vacancies: string;
  applicationFee: string;
  onboardingFee: string;
  eligibilityRules: string[];
  requiredEducation: string[];
  requiredExperience: string;
  requiredDocuments: string[];
  questions: BlueprintQuestion[];
  stages: WorkflowStage[];
  templates: Record<string, BlueprintTemplate>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECTS = ['MAHA-AGRI PROJECT', 'EMERGENCY HELP QR PROJECT', 'मी स्वयंसेविका'];

const EMPLOYMENT_TYPES = [
  { value: 'full_time',   label: 'Full Time'   },
  { value: 'part_time',   label: 'Part Time'   },
  { value: 'contract',    label: 'Contract'    },
  { value: 'volunteer',   label: 'Volunteer'   },
  { value: 'internship',  label: 'Internship'  },
];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text:   'Short Text',
  paragraph:    'Paragraph',
  number:       'Number',
  yes_no:       'Yes / No',
  radio:        'Radio Button',
  checkbox:     'Checkbox',
  dropdown:     'Dropdown',
  date:         'Date',
  file_upload:  'File Upload',
};

const DEFAULT_STAGES: WorkflowStage[] = [
  { id: 's1',  name: 'Application',                   type: 'application_form',         required: true,  description: 'Candidate submits application form.' },
  { id: 's2',  name: 'Application Fee',               type: 'application_fee_payment',  required: false, description: 'Candidate pays the application processing fee.' },
  { id: 's3',  name: 'Interview Slot Booking',        type: 'interview_round',          required: true,  description: 'Candidate selects a convenient interview slot.' },
  { id: 's4',  name: 'Interview',                     type: 'interview_round',          required: true,  description: 'Candidate attends the scheduled interview.' },
  { id: 's5',  name: 'Primary Selection',             type: 'result_announcement',      required: true,  description: 'HR announces shortlisted candidates.' },
  { id: 's6',  name: 'Document Verification',         type: 'document_verification',    required: true,  description: 'Original documents verified by HR.' },
  { id: 's7',  name: 'Provisional Appointment Letter',type: 'appointment_letter',       required: true,  description: 'Provisional offer issued to selected candidate.' },
  { id: 's8',  name: 'Project Work Assignment (PWAN)',type: 'training_allocation',      required: true,  description: 'Specific project area and targets assigned.' },
  { id: 's9',  name: 'Candidate Acceptance',          type: 'background_check',         required: true,  description: 'Candidate formally accepts the offer.' },
  { id: 's10', name: 'Onboarding Fee',                type: 'onboarding_fee_payment',   required: false, description: 'Candidate pays onboarding fee.' },
  { id: 's11', name: 'Final Appointment Letter',      type: 'appointment_letter',       required: true,  description: 'Final confirmed letter issued.' },
];

const DEFAULT_TEMPLATES: Record<string, BlueprintTemplate> = {
  appointmentLetter: {
    name: 'Appointment Letter',
    content: `Dear {{candidate_name}},

We are pleased to appoint you as {{position_title}} under the {{project_name}} initiative.

Your joining date is {{joining_date}}. Please report to {{reporting_location}} at 10:00 AM.

Regards,
HR Team
Abhinav Bharat Foundation`,
    variables: ['candidate_name', 'position_title', 'project_name', 'joining_date', 'reporting_location'],
  },
  pwan: {
    name: 'Project Work Assignment Notice (PWAN)',
    content: `Dear {{candidate_name}},

Your work area assignment is as follows:

• District: {{district}}
• Taluka: {{taluka}}
• Target Villages: {{target_count}}
• Monthly Target: {{monthly_target}}

Reporting Manager: {{reporting_manager}}

Regards,
HR Team`,
    variables: ['candidate_name', 'district', 'taluka', 'target_count', 'monthly_target', 'reporting_manager'],
  },
  email: {
    name: 'Email Notification Template',
    content: `Subject: {{subject}}

Dear {{candidate_name}},

{{message_body}}

For any queries, contact: {{hr_email}}

Regards,
HR Team
Abhinav Bharat Foundation`,
    variables: ['subject', 'candidate_name', 'message_body', 'hr_email'],
  },
  whatsapp: {
    name: 'WhatsApp Notification Template',
    content: `*{{subject}}*

Dear {{candidate_name}},

{{message_body}}

— Abhinav Bharat Foundation HR
📞 {{hr_mobile}}`,
    variables: ['subject', 'candidate_name', 'message_body', 'hr_mobile'],
  },
};

const EMPTY_BLUEPRINT: Blueprint = {
  project: '',
  positionName: '',
  employmentType: 'full_time',
  vacancies: '',
  applicationFee: '0',
  onboardingFee: '0',
  eligibilityRules: [],
  requiredEducation: [],
  requiredExperience: '',
  requiredDocuments: [],
  questions: [],
  stages: DEFAULT_STAGES,
  templates: DEFAULT_TEMPLATES,
};

// ─── Mock existing blueprints list ────────────────────────────────────────────

const MOCK_BLUEPRINTS = [
  { id: 'bp1', project: 'MAHA-AGRI PROJECT',        position: 'District Coordinator',   employment: 'Full Time',  stages: 11, questions: 8  },
  { id: 'bp2', 'EMERGENCY HELP QR PROJECT': '',      project: 'EMERGENCY HELP QR PROJECT', position: 'District Manager', employment: 'Full Time', stages: 11, questions: 6 },
];

const TABS = [
  { id: 'position',   label: 'Position Setup',  icon: Briefcase     },
  { id: 'questions',  label: 'Questions',        icon: ClipboardList },
  { id: 'workflow',   label: 'Workflow',         icon: GitBranch     },
  { id: 'templates',  label: 'Templates',        icon: Mail          },
  { id: 'preview',    label: 'Preview',          icon: Eye           },
] as const;

type TabId = typeof TABS[number]['id'];

let idCounter = 0;
const uid = () => `id_${++idCounter}_${Date.now()}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HRRecruitmentBlueprint() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('position');
  const [blueprint, setBlueprint] = useState<Blueprint>(EMPTY_BLUEPRINT);
  const [saved, setSaved] = useState(false);

  // Temp inputs
  const [eligInput, setEligInput]     = useState('');
  const [eduInput, setEduInput]       = useState('');
  const [docInput, setDocInput]       = useState('');
  const [stageInput, setStageInput]   = useState('');

  const set = <K extends keyof Blueprint>(key: K, value: Blueprint[K]) =>
    setBlueprint(b => ({ ...b, [key]: value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── List view ───────────────────────────────────────────────────────────────

  if (!showForm) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary-900">Recruitment Blueprints</h2>
            <p className="text-sm text-primary-500 mt-0.5">
              Configure complete recruitment specifications per position.
            </p>
          </div>
          <button
            onClick={() => { setBlueprint(EMPTY_BLUEPRINT); setActiveTab('position'); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Blueprint
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800">What is a Recruitment Blueprint?</p>
            <p className="text-sm text-blue-700 mt-0.5 leading-relaxed">
              A Blueprint is a complete recruitment specification for a position — covering eligibility,
              application questions, workflow stages, fee rules, and notification templates.
              Every campaign must be linked to a Blueprint.
            </p>
          </div>
        </div>

        {/* Existing blueprints */}
        {MOCK_BLUEPRINTS.length > 0 && (
          <div className="space-y-3">
            {MOCK_BLUEPRINTS.map((bp, i) => (
              <motion.div
                key={bp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-primary-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full">
                      {bp.project}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      {bp.employment}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-primary-900">{bp.position}</h3>
                  <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-primary-500">
                    <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {bp.stages} stages</span>
                    <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {bp.questions} questions</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={() => { setActiveTab('position'); setShowForm(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-900 rounded-lg hover:bg-primary-800 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => setShowForm(false)}
            className="text-xs font-semibold text-primary-500 hover:text-primary-800 transition-colors mb-1"
          >
            ← Back to Blueprints
          </button>
          <h2 className="text-xl font-bold text-primary-900">
            {blueprint.positionName || 'New Recruitment Blueprint'}
          </h2>
          {blueprint.project && (
            <p className="text-sm text-primary-500 mt-0.5">{blueprint.project}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-all active:scale-95"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Blueprint'}
        </button>
      </div>

      {/* Saved toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Blueprint saved successfully. (UI preview only — connect to database in next phase.)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-primary-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors shrink-0 border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-900 text-primary-900 bg-primary-50'
                  : 'border-transparent text-primary-500 hover:text-primary-700 hover:bg-primary-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 md:p-6">

          {/* ── TAB 1: POSITION SETUP ──────────────────────────────────────── */}
          {activeTab === 'position' && (
            <div className="space-y-6">
              <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="Position Details" />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormGroup label="Project *">
                  <select
                    value={blueprint.project}
                    onChange={e => set('project', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Project</option>
                    {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FormGroup>

                <FormGroup label="Position Name *">
                  <input
                    type="text"
                    value={blueprint.positionName}
                    onChange={e => set('positionName', e.target.value)}
                    placeholder="e.g., District Coordinator"
                    className="form-input"
                  />
                </FormGroup>

                <FormGroup label="Employment Type *">
                  <select
                    value={blueprint.employmentType}
                    onChange={e => set('employmentType', e.target.value)}
                    className="form-input"
                  >
                    {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </FormGroup>

                <FormGroup label="Vacancies">
                  <input
                    type="number"
                    min="1"
                    value={blueprint.vacancies}
                    onChange={e => set('vacancies', e.target.value)}
                    placeholder="e.g., 36"
                    className="form-input"
                  />
                </FormGroup>

                <FormGroup label="Application Fee (₹)" hint="Set 0 for no fee">
                  <input
                    type="number"
                    min="0"
                    value={blueprint.applicationFee}
                    onChange={e => set('applicationFee', e.target.value)}
                    className="form-input"
                  />
                </FormGroup>

                <FormGroup label="Onboarding Fee (₹)" hint="Set 0 for no fee">
                  <input
                    type="number"
                    min="0"
                    value={blueprint.onboardingFee}
                    onChange={e => set('onboardingFee', e.target.value)}
                    className="form-input"
                  />
                </FormGroup>
              </div>

              <FormGroup label="Required Experience">
                <input
                  type="text"
                  value={blueprint.requiredExperience}
                  onChange={e => set('requiredExperience', e.target.value)}
                  placeholder="e.g., 2–4 years in field coordination"
                  className="form-input"
                />
              </FormGroup>

              <div className="grid md:grid-cols-3 gap-5">
                {/* Eligibility Rules */}
                <DynamicListEditor
                  title="Eligibility Rules"
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  placeholder="e.g., Must be a Graduate"
                  inputValue={eligInput}
                  onInputChange={setEligInput}
                  items={blueprint.eligibilityRules}
                  onAdd={() => {
                    if (!eligInput.trim()) return;
                    set('eligibilityRules', [...blueprint.eligibilityRules, eligInput.trim()]);
                    setEligInput('');
                  }}
                  onRemove={i => set('eligibilityRules', blueprint.eligibilityRules.filter((_, idx) => idx !== i))}
                />

                {/* Required Education */}
                <DynamicListEditor
                  title="Required Education"
                  icon={<Building2 className="w-4 h-4 text-blue-500" />}
                  placeholder="e.g., HSC / Graduate"
                  inputValue={eduInput}
                  onInputChange={setEduInput}
                  items={blueprint.requiredEducation}
                  onAdd={() => {
                    if (!eduInput.trim()) return;
                    set('requiredEducation', [...blueprint.requiredEducation, eduInput.trim()]);
                    setEduInput('');
                  }}
                  onRemove={i => set('requiredEducation', blueprint.requiredEducation.filter((_, idx) => idx !== i))}
                />

                {/* Required Documents */}
                <DynamicListEditor
                  title="Required Documents"
                  icon={<FileText className="w-4 h-4 text-amber-500" />}
                  placeholder="e.g., Aadhaar Card"
                  inputValue={docInput}
                  onInputChange={setDocInput}
                  items={blueprint.requiredDocuments}
                  onAdd={() => {
                    if (!docInput.trim()) return;
                    set('requiredDocuments', [...blueprint.requiredDocuments, docInput.trim()]);
                    setDocInput('');
                  }}
                  onRemove={i => set('requiredDocuments', blueprint.requiredDocuments.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>
          )}

          {/* ── TAB 2: APPLICATION QUESTIONS ──────────────────────────────── */}
          {activeTab === 'questions' && (
            <QuestionBuilder
              questions={blueprint.questions}
              onChange={qs => set('questions', qs)}
            />
          )}

          {/* ── TAB 3: WORKFLOW ───────────────────────────────────────────── */}
          {activeTab === 'workflow' && (
            <WorkflowEditor
              stages={blueprint.stages}
              onChange={stages => set('stages', stages)}
              stageInput={stageInput}
              onStageInputChange={setStageInput}
            />
          )}

          {/* ── TAB 4: TEMPLATES ──────────────────────────────────────────── */}
          {activeTab === 'templates' && (
            <TemplateEditor
              templates={blueprint.templates}
              onChange={t => set('templates', t)}
            />
          )}

          {/* ── TAB 5: PREVIEW ────────────────────────────────────────────── */}
          {activeTab === 'preview' && (
            <BlueprintPreview blueprint={blueprint} />
          )}

        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowForm(false)}
          className="px-5 py-2.5 text-sm font-semibold border border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-all active:scale-95"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Blueprint'}
        </button>
      </div>
    </div>
  );
}

// ─── Question Builder ─────────────────────────────────────────────────────────

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: BlueprintQuestion[];
  onChange: (qs: BlueprintQuestion[]) => void;
}) {
  const [newType, setNewType] = useState<QuestionType>('short_text');

  const addQuestion = () => {
    onChange([
      ...questions,
      { id: uid(), text: '', type: newType, required: false, helpText: '', options: [] },
    ]);
  };

  const update = (id: string, patch: Partial<BlueprintQuestion>) =>
    onChange(questions.map(q => q.id === id ? { ...q, ...patch } : q));

  const remove = (id: string) => onChange(questions.filter(q => q.id !== id));

  const move = (idx: number, dir: -1 | 1) => {
    const qs = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= qs.length) return;
    [qs[idx], qs[target]] = [qs[target], qs[idx]];
    onChange(qs);
  };

  const hasOptions = (t: QuestionType) => ['radio', 'checkbox', 'dropdown'].includes(t);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader icon={<ClipboardList className="w-4 h-4" />} title={`Application Questions (${questions.length})`} />
        <div className="flex items-center gap-2">
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as QuestionType)}
            className="form-input py-2 text-sm"
          >
            {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="py-14 text-center border-2 border-dashed border-primary-200 rounded-2xl">
          <MessageSquare className="w-10 h-10 text-primary-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-primary-500">No questions yet.</p>
          <p className="text-xs text-primary-400 mt-1">Select a question type above and click Add Question.</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary-50 rounded-2xl border border-primary-100 p-4"
          >
            {/* Question header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex flex-col gap-1 pt-1 shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="p-1 rounded hover:bg-primary-200 disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-3.5 h-3.5 text-primary-500" />
                </button>
                <GripVertical className="w-3.5 h-3.5 text-primary-300 mx-auto" />
                <button onClick={() => move(idx, 1)} disabled={idx === questions.length - 1}
                  className="p-1 rounded hover:bg-primary-200 disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-primary-400">Q{idx + 1}</span>
                  <span className="text-xs font-bold px-2 py-1 bg-primary-200 text-primary-700 rounded-full">
                    {QUESTION_TYPE_LABELS[q.type]}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                    <span className="text-xs font-semibold text-primary-600">Required</span>
                    <button
                      type="button"
                      onClick={() => update(q.id, { required: !q.required })}
                    >
                      {q.required
                        ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                        : <ToggleLeft  className="w-5 h-5 text-primary-400" />
                      }
                    </button>
                  </label>
                </div>

                <input
                  type="text"
                  value={q.text}
                  onChange={e => update(q.id, { text: e.target.value })}
                  placeholder="Enter your question..."
                  className="form-input"
                />

                <input
                  type="text"
                  value={q.helpText}
                  onChange={e => update(q.id, { helpText: e.target.value })}
                  placeholder="Help text (optional)..."
                  className="form-input text-xs"
                />

                {/* Options editor (radio / checkbox / dropdown) */}
                {hasOptions(q.type) && (
                  <OptionsEditor
                    options={q.options}
                    onChange={opts => update(q.id, { options: opts })}
                  />
                )}
              </div>

              <button onClick={() => remove(q.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Options Editor (for radio / checkbox / dropdown) ─────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const [input, setInput] = useState('');

  return (
    <div className="bg-white rounded-xl p-3 border border-primary-200 space-y-2">
      <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Options</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-primary-400 w-5 text-right">{i + 1}.</span>
          <input
            type="text"
            value={opt}
            onChange={e => {
              const o = [...options]; o[i] = e.target.value; onChange(o);
            }}
            className="flex-1 text-sm border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400 bg-primary-50"
          />
          <button onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            className="text-red-400 hover:text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); if (input.trim()) { onChange([...options, input.trim()]); setInput(''); } }
          }}
          placeholder="Type option and press Enter or +"
          className="flex-1 text-sm border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400"
        />
        <button
          onClick={() => { if (input.trim()) { onChange([...options, input.trim()]); setInput(''); } }}
          className="px-3 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-lg hover:bg-primary-800"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Workflow Editor ──────────────────────────────────────────────────────────

function WorkflowEditor({
  stages,
  onChange,
  stageInput,
  onStageInputChange,
}: {
  stages: WorkflowStage[];
  onChange: (s: WorkflowStage[]) => void;
  stageInput: string;
  onStageInputChange: (v: string) => void;
}) {
  const addStage = () => {
    if (!stageInput.trim()) return;
    onChange([...stages, { id: uid(), name: stageInput.trim(), type: 'interview_round', required: true, description: '' }]);
    onStageInputChange('');
  };

  const update = (id: string, patch: Partial<WorkflowStage>) =>
    onChange(stages.map(s => s.id === id ? { ...s, ...patch } : s));

  const remove = (id: string) => onChange(stages.filter(s => s.id !== id));

  const move = (idx: number, dir: -1 | 1) => {
    const ss = [...stages];
    const t = idx + dir;
    if (t < 0 || t >= ss.length) return;
    [ss[idx], ss[t]] = [ss[t], ss[idx]];
    onChange(ss);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader icon={<GitBranch className="w-4 h-4" />} title={`Workflow Stages (${stages.length})`} />
        <button
          onClick={() => onChange(DEFAULT_STAGES)}
          className="text-xs font-semibold text-primary-600 border border-primary-200 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Reset to Default
        </button>
      </div>

      {/* Add stage */}
      <div className="flex gap-2">
        <input
          type="text"
          value={stageInput}
          onChange={e => onStageInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStage()}
          placeholder="Stage name, e.g. Written Test"
          className="flex-1 form-input"
        />
        <button
          onClick={addStage}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Stage
        </button>
      </div>

      {/* Stages list */}
      <div className="relative">
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-primary-100" />
        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <motion.div
              key={stage.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative flex items-start gap-3"
            >
              {/* Step number */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                idx === 0 ? 'bg-primary-900 border-primary-900 text-white'
                : idx === stages.length - 1 ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-primary-200 text-primary-600'
              }`}>
                {idx + 1}
              </div>

              {/* Stage card */}
              <div className="flex-1 bg-white rounded-xl border border-primary-100 p-4 min-w-0">
                <div className="flex flex-wrap gap-2 items-start mb-2">
                  <input
                    type="text"
                    value={stage.name}
                    onChange={e => update(stage.id, { name: e.target.value })}
                    className="flex-1 min-w-[140px] font-bold text-sm text-primary-900 border-b border-dashed border-primary-200 focus:outline-none focus:border-primary-400 bg-transparent pb-0.5"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-xs font-semibold text-primary-500">Required</span>
                    <button type="button" onClick={() => update(stage.id, { required: !stage.required })}>
                      {stage.required
                        ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                        : <ToggleLeft  className="w-5 h-5 text-primary-400" />
                      }
                    </button>
                  </label>
                </div>

                <input
                  type="text"
                  value={stage.description}
                  onChange={e => update(stage.id, { description: e.target.value })}
                  placeholder="Stage description (optional)"
                  className="w-full text-xs text-primary-500 border-none focus:outline-none bg-transparent"
                />
              </div>

              {/* Reorder + Delete */}
              <div className="flex flex-col gap-1 shrink-0 pt-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="p-1.5 rounded-lg hover:bg-primary-100 disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-3.5 h-3.5 text-primary-500" />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === stages.length - 1}
                  className="p-1.5 rounded-lg hover:bg-primary-100 disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
                </button>
                <button onClick={() => remove(stage.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({
  templates,
  onChange,
}: {
  templates: Record<string, BlueprintTemplate>;
  onChange: (t: Record<string, BlueprintTemplate>) => void;
}) {
  const [activeKey, setActiveKey] = useState<string>('appointmentLetter');

  const update = (key: string, content: string) =>
    onChange({ ...templates, [key]: { ...templates[key], content } });

  const templateKeys = Object.keys(templates);
  const current = templates[activeKey];

  return (
    <div className="space-y-5">
      <SectionHeader icon={<Mail className="w-4 h-4" />} title="Notification & Document Templates" />

      {/* Template switcher */}
      <div className="flex flex-wrap gap-2">
        {templateKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeKey === key
                ? 'bg-primary-900 text-white'
                : 'bg-primary-50 border border-primary-200 text-primary-600 hover:bg-primary-100'
            }`}
          >
            {templates[key].name}
          </button>
        ))}
      </div>

      {/* Variables hint */}
      <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-1.5 w-full mb-1">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-blue-700">Available Variables:</span>
        </div>
        {current.variables.map(v => (
          <code key={v}
            className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono cursor-pointer hover:bg-blue-200 transition-colors"
            onClick={() => {
              const el = document.getElementById(`template-${activeKey}`) as HTMLTextAreaElement;
              if (!el) return;
              const start = el.selectionStart;
              const before = current.content.slice(0, start);
              const after  = current.content.slice(el.selectionEnd);
              update(activeKey, before + `{{${v}}}` + after);
              setTimeout(() => el.focus(), 50);
            }}
          >
            {`{{${v}}}`}
          </code>
        ))}
      </div>

      {/* Template textarea */}
      <div>
        <label className="block text-xs font-bold text-primary-700 mb-2">{current.name}</label>
        <textarea
          id={`template-${activeKey}`}
          value={current.content}
          onChange={e => update(activeKey, e.target.value)}
          rows={16}
          className="w-full font-mono text-sm border-2 border-primary-200 rounded-xl p-4 focus:outline-none focus:border-primary-400 resize-y bg-primary-50"
        />
      </div>
    </div>
  );
}

// ─── Blueprint Preview ────────────────────────────────────────────────────────

function BlueprintPreview({ blueprint }: { blueprint: Blueprint }) {
  const isEmpty = !blueprint.positionName && !blueprint.project;

  if (isEmpty) {
    return (
      <div className="py-14 text-center">
        <Eye className="w-10 h-10 text-primary-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-primary-500">Nothing to preview yet.</p>
        <p className="text-xs text-primary-400 mt-1">Fill in Position Setup to see a preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader icon={<Eye className="w-4 h-4" />} title="Blueprint Summary" />

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Project',          value: blueprint.project       || '—' },
          { label: 'Position',         value: blueprint.positionName  || '—' },
          { label: 'Employment',       value: EMPLOYMENT_TYPES.find(t => t.value === blueprint.employmentType)?.label || '—' },
          { label: 'Vacancies',        value: blueprint.vacancies     || '—' },
          { label: 'Application Fee',  value: blueprint.applicationFee === '0' ? 'Free' : `₹${blueprint.applicationFee}` },
          { label: 'Onboarding Fee',   value: blueprint.onboardingFee  === '0' ? 'None' : `₹${blueprint.onboardingFee}` },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-xs font-bold text-primary-400 mb-1">{label}</p>
            <p className="text-sm font-bold text-primary-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <PreviewList title="Eligibility Rules"       items={blueprint.eligibilityRules}  empty="None configured" />
        <PreviewList title="Required Education"      items={blueprint.requiredEducation} empty="None configured" />
        <PreviewList title="Required Documents"      items={blueprint.requiredDocuments} empty="None configured" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
          <p className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-3">Questions ({blueprint.questions.length})</p>
          {blueprint.questions.length === 0
            ? <p className="text-xs text-primary-400">None added.</p>
            : blueprint.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 mb-2 last:mb-0">
                <span className="text-xs text-primary-400 w-5 shrink-0 font-bold">Q{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary-800 truncate">{q.text || '(untitled)'}</p>
                  <p className="text-xs text-primary-500">{QUESTION_TYPE_LABELS[q.type]} {q.required ? '• Required' : '• Optional'}</p>
                </div>
              </div>
            ))
          }
        </div>

        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
          <p className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-3">Workflow ({blueprint.stages.length} stages)</p>
          {blueprint.stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-primary-900 text-white' : i === blueprint.stages.length - 1 ? 'bg-emerald-600 text-white' : 'bg-primary-200 text-primary-600'
              }`}>{i + 1}</span>
              <p className="text-xs font-semibold text-primary-800 truncate">{s.name}</p>
              {!s.required && <span className="text-xs text-primary-400 ml-auto shrink-0">Optional</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-primary-500">{icon}</span>
      <h3 className="text-base font-bold text-primary-900">{title}</h3>
    </div>
  );
}

function FormGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-primary-700 mb-1.5">
        {label}
        {hint && <span className="font-normal text-primary-400 ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function DynamicListEditor({
  title,
  icon,
  placeholder,
  inputValue,
  onInputChange,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  inputValue: string;
  onInputChange: (v: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="bg-primary-50 rounded-xl border border-primary-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-bold text-primary-700">{title}</p>
      </div>

      <div className="space-y-1.5 mb-3 min-h-[40px]">
        {items.length === 0 && (
          <p className="text-xs text-primary-400 italic">None added yet.</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-primary-200">
            <span className="flex-1 text-xs font-medium text-primary-800 leading-snug">{item}</span>
            <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 shrink-0 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={placeholder}
          className="flex-1 text-xs border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400 bg-white"
        />
        <button onClick={onAdd}
          className="px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PreviewList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
      <p className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-2">{title}</p>
      {items.length === 0
        ? <p className="text-xs text-primary-400">{empty}</p>
        : items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-primary-700">{item}</span>
          </div>
        ))
      }
    </div>
  );
}
