import { useState, useMemo } from 'react';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, CheckCircle2,
  AlertCircle, Copy, HelpCircle, Save, X,
  History, ShieldCheck, ChevronDown, Sparkles
} from 'lucide-react';
import type { RmsJobPosting, JobQuestionnaire, JobQuestion, QuestionType, QuestionOption, QuestionnaireSection, QuestionnaireVersionSnapshot } from '../../lib/types';

interface HRQuestionnaireBuilderProps {
  job: Partial<RmsJobPosting>;
  onChange: (questionnaire: JobQuestionnaire | null) => void;
  onSave?: (mode?: 'continue' | 'close' | 'stay') => Promise<void>;
  saving?: boolean;
}

const DEFAULT_SECTION: QuestionnaireSection = {
  id: 'sec_default',
  title: 'Role Assessment Questions',
  description: 'Role-specific assessment questions for applicants.',
};

export default function HRQuestionnaireBuilder({
  job,
  onChange,
  onSave,
  saving = false,
}: HRQuestionnaireBuilderProps) {
  const currentQ = job.questionnaire;

  // Active in-builder state
  const isEnabled = Boolean(currentQ && Array.isArray(currentQ.questions));

  // Editing state for new section modal / inline form
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Candidate Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const notify = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ── Initialize Default Questionnaire ──────────────────────────────────────
  const handleEnableQuestionnaire = () => {
    const initial: JobQuestionnaire = {
      version: 'v1.0',
      title: `${job.title || 'Role'} Assessment Questionnaire`,
      description: 'Please answer these questions carefully as part of your application.',
      status: 'draft',
      publishedAt: null,
      isVisibleToCandidates: true,
      sections: [DEFAULT_SECTION],
      questions: [
        {
          id: `q_${Date.now()}_1`,
          sectionTitle: DEFAULT_SECTION.title,
          questionText: 'Do you have prior experience relevant to this role?',
          type: 'boolean',
          required: true,
          isVisible: true,
          helpText: 'Indicate whether you possess hands-on field experience.',
        },
      ],
      previousVersions: [],
    };
    onChange(initial);
    notify('Questionnaire enabled for this position. Configure questions below.', 'info');
  };

  const handleDisableQuestionnaire = () => {
    if (confirm('Are you sure you want to remove the questionnaire from this job posting? Candidates will automatically skip Step 4.')) {
      onChange(null);
      notify('Questionnaire removed. Candidates will skip Step 4 for this position.', 'info');
    }
  };

  // ── Sections & Questions Resolution ────────────────────────────────────────
  const sections: QuestionnaireSection[] = useMemo(() => {
    if (!currentQ) return [];
    if (currentQ.sections && currentQ.sections.length > 0) {
      return currentQ.sections;
    }
    // Fallback: extract distinct section titles from questions
    const set = new Set<string>();
    currentQ.questions?.forEach(q => {
      if (q.sectionTitle?.trim()) set.add(q.sectionTitle.trim());
    });
    if (set.size === 0) return [DEFAULT_SECTION];
    return Array.from(set).map((title, i) => ({
      id: `sec_${i + 1}`,
      title,
    }));
  }, [currentQ]);

  const questions: JobQuestion[] = useMemo(() => {
    return currentQ?.questions || [];
  }, [currentQ]);

  // ── Mutators ───────────────────────────────────────────────────────────────
  const updateQuestionnaire = (updates: Partial<JobQuestionnaire>) => {
    if (!currentQ) return;
    onChange({
      ...currentQ,
      ...updates,
    });
  };

  // ── Section Actions ────────────────────────────────────────────────────────
  const handleAddSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    if (sections.some(s => s.title.toLowerCase() === title.toLowerCase())) {
      alert('A section with this title already exists.');
      return;
    }
    const newSec: QuestionnaireSection = {
      id: `sec_${Date.now()}`,
      title,
    };
    updateQuestionnaire({
      sections: [...sections, newSec],
    });
    setNewSectionTitle('');
    setShowAddSection(false);
    notify(`Section "${title}" added.`);
  };

  const handleDeleteSection = (secTitle: string) => {
    if (sections.length <= 1) {
      alert('Questionnaire must contain at least one section.');
      return;
    }
    if (confirm(`Delete section "${secTitle}"? Any questions inside will be moved to the primary section.`)) {
      const fallbackSec = sections.find(s => s.title !== secTitle) || DEFAULT_SECTION;
      const updatedQuestions = questions.map(q =>
        q.sectionTitle === secTitle ? { ...q, sectionTitle: fallbackSec.title } : q
      );
      const updatedSections = sections.filter(s => s.title !== secTitle);
      updateQuestionnaire({
        sections: updatedSections,
        questions: updatedQuestions,
      });
      notify(`Section removed and questions reassigned to "${fallbackSec.title}".`);
    }
  };

  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    updateQuestionnaire({ sections: copy });
  };

  // ── Question Actions ───────────────────────────────────────────────────────
  const handleAddQuestion = (sectionTitle: string) => {
    const newQ: JobQuestion = {
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sectionTitle,
      questionText: 'New Assessment Question',
      type: 'text',
      required: true,
      isVisible: true,
      placeholder: '',
      helpText: '',
      options: [],
    };
    updateQuestionnaire({
      questions: [...questions, newQ],
    });
    setEditingQuestionId(newQ.id);
    notify('New question added.');
  };

  const handleUpdateQuestion = (qId: string, updates: Partial<JobQuestion>) => {
    const updated = questions.map(q => (q.id === qId ? { ...q, ...updates } : q));
    updateQuestionnaire({ questions: updated });
  };

  const handleDeleteQuestion = (qId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      // Also clear any condition in other questions that depends on this deleted question
      const updated = questions
        .filter(q => q.id !== qId)
        .map(q => (q.condition?.dependsOnQuestionId === qId ? { ...q, condition: undefined } : q));
      updateQuestionnaire({ questions: updated });
      if (editingQuestionId === qId) setEditingQuestionId(null);
      notify('Question deleted.');
    }
  };

  const handleDuplicateQuestion = (qId: string) => {
    const original = questions.find(q => q.id === qId);
    if (!original) return;
    const origIndex = questions.indexOf(original);
    const duplicated: JobQuestion = {
      ...JSON.parse(JSON.stringify(original)),
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      questionText: `${original.questionText} (Copy)`,
      condition: undefined, // Clear condition on clone to avoid confusion
    };
    const copy = [...questions];
    copy.splice(origIndex + 1, 0, duplicated);
    updateQuestionnaire({ questions: copy });
    setEditingQuestionId(duplicated.id);
    notify('Question duplicated.');
  };

  const handleMoveQuestion = (qId: string, direction: 'up' | 'down') => {
    const idx = questions.findIndex(q => q.id === qId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const copy = [...questions];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    // If moved past its dependent condition, safely clear the condition to preserve DAG order
    const cleaned = copy.map((q, i) => {
      if (q.condition) {
        const depIdx = copy.findIndex(parent => parent.id === q.condition!.dependsOnQuestionId);
        if (depIdx >= i) {
          return { ...q, condition: undefined };
        }
      }
      return q;
    });

    updateQuestionnaire({ questions: cleaned });
  };

  // ── Question Options Actions (for radio, checkbox, select) ─────────────────
  const handleAddOption = (qId: string) => {
    const q = questions.find(item => item.id === qId);
    if (!q) return;
    const currentOpts: QuestionOption[] = q.options ? [...q.options] : [];
    const count = currentOpts.length + 1;
    const newOpt: QuestionOption = {
      label: `Option ${count}`,
      value: `option_${count}`,
    };
    handleUpdateQuestion(qId, { options: [...currentOpts, newOpt] });
  };

  const handleUpdateOption = (qId: string, optIdx: number, key: 'label' | 'value', val: string) => {
    const q = questions.find(item => item.id === qId);
    if (!q || !q.options) return;
    const updatedOpts = q.options.map((opt, i) => {
      if (i !== optIdx) return opt;
      if (key === 'label') {
        const autoVal = opt.value.startsWith('option_') ? val.toLowerCase().replace(/[^a-z0-9]+/g, '_') : opt.value;
        return { ...opt, label: val, value: autoVal || opt.value };
      }
      return { ...opt, [key]: val };
    });
    handleUpdateQuestion(qId, { options: updatedOpts });
  };

  const handleDeleteOption = (qId: string, optIdx: number) => {
    const q = questions.find(item => item.id === qId);
    if (!q || !q.options) return;
    const updatedOpts = q.options.filter((_, i) => i !== optIdx);
    handleUpdateQuestion(qId, { options: updatedOpts });
  };

  // ── Version Increment & Publishing ─────────────────────────────────────────
  const parseVersionNumber = (v: string): number => {
    const match = v.replace(/^v/i, '').match(/^(\d+)(\.(\d+))?/);
    if (!match) return 1.0;
    return parseFloat(match[0]) || 1.0;
  };

  const getNextVersionString = (currentV: string): string => {
    const num = parseVersionNumber(currentV);
    const nextMajor = Math.floor(num) + 1;
    return `v${nextMajor}.0`;
  };

  const handleSaveDraft = async () => {
    if (!currentQ) return;
    updateQuestionnaire({
      status: 'draft',
    });
    notify('Questionnaire saved as Draft.', 'info');
    if (onSave) {
      await onSave('stay');
    }
  };

  const handlePublish = async () => {
    if (!currentQ) return;
    if (questions.length === 0) {
      alert('Please add at least one question before publishing.');
      return;
    }

    const wasPublished = currentQ.status === 'published' || Boolean(currentQ.lastPublishedSnapshot);
    const nowIso = new Date().toISOString();
    const isVisibleToCandidates = currentQ.isVisibleToCandidates !== false;

    let newVersion = currentQ.version || 'v1.0';
    let previousVersions: QuestionnaireVersionSnapshot[] = currentQ.previousVersions ? [...currentQ.previousVersions] : [];

    // If modifying an already published questionnaire, snapshot the previous version and bump
    if (wasPublished && currentQ.lastPublishedSnapshot) {
      previousVersions = [...previousVersions, currentQ.lastPublishedSnapshot];
      newVersion = getNextVersionString(currentQ.version);
    } else if (wasPublished && !currentQ.lastPublishedSnapshot) {
      const initialSnapshot: QuestionnaireVersionSnapshot = {
        version: currentQ.version,
        publishedAt: currentQ.publishedAt || nowIso,
        title: currentQ.title,
        description: currentQ.description,
        sections: currentQ.sections,
        questions: currentQ.questions,
        isVisibleToCandidates,
      };
      previousVersions = [...previousVersions, initialSnapshot];
      newVersion = getNextVersionString(currentQ.version);
    }

    const currentSnapshot: QuestionnaireVersionSnapshot = {
      version: newVersion,
      publishedAt: nowIso,
      title: currentQ.title,
      description: currentQ.description,
      sections: currentQ.sections,
      questions: currentQ.questions,
      isVisibleToCandidates,
    };

    const publishedQ: JobQuestionnaire = {
      ...currentQ,
      version: newVersion,
      status: 'published',
      publishedAt: nowIso,
      isVisibleToCandidates,
      previousVersions,
      lastPublishedSnapshot: currentSnapshot,
    };

    onChange(publishedQ);
    notify(`Questionnaire successfully published as ${newVersion}!`, 'success');

    if (onSave) {
      await onSave('stay');
    }
  };

  // ── Preceding Questions for Condition Dropdown ──────────────────────────────
  const getPrecedingQuestions = (targetQId: string): JobQuestion[] => {
    const idx = questions.findIndex(q => q.id === targetQId);
    if (idx <= 0) return [];
    return questions.slice(0, idx).filter(q => ['boolean', 'radio', 'select', 'checkbox'].includes(q.type));
  };

  // ── RENDER: NOT ENABLED STATE ──────────────────────────────────────────────
  if (!isEnabled || !currentQ) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-[#102a43]" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h4 className="text-base font-bold text-[#102a43]">Job-Specific Questionnaire Not Configured</h4>
          <p className="text-xs text-[#627d98] leading-relaxed">
            Candidates applying for <strong>{job.title || 'this position'}</strong> currently skip Step 4 directly to Review &amp; Submit.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleEnableQuestionnaire}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Enable Role Questionnaire
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: ACTIVE BUILDER ─────────────────────────────────────────────────
  const isPublished = currentQ.status === 'published';

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedbackMsg.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Builder Header & Version Controls ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-[#102a43]">Role Assessment Questionnaire</h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}
              >
                {isPublished ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Sparkles className="w-3 h-3 text-amber-600" />}
                {isPublished ? `Published (${currentQ.version})` : `Draft (${currentQ.version})`}
              </span>

              {currentQ.publishedAt && (
                <span className="text-[11px] text-slate-400">
                  Published on {new Date(currentQ.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <p className="text-xs text-[#627d98]">
              Configure role-specific assessment questions loaded in Candidate Application Step 4.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setPreviewAnswers({});
                setShowPreviewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#102a43] text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Preview exactly as applicants will experience in Candidate Step 4"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" /> Preview as Candidate
            </button>

            {currentQ.previousVersions && currentQ.previousVersions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowVersionHistory(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-purple-600" /> History ({currentQ.previousVersions.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isPublished ? 'Update & Publish New Version' : 'Publish Questionnaire'}
            </button>

            <button
              type="button"
              onClick={handleDisableQuestionnaire}
              className="px-2.5 py-2 text-slate-400 hover:text-red-600 rounded-xl text-xs hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove questionnaire from this position (skip Step 4)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Questionnaire Title & Description Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
              Questionnaire Title
            </label>
            <input
              type="text"
              value={currentQ.title || ''}
              onChange={e => updateQuestionnaire({ title: e.target.value })}
              placeholder="E.g. Field Assistant Agronomy Assessment"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
              Instructions for Candidate (Optional)
            </label>
            <input
              type="text"
              value={currentQ.description || ''}
              onChange={e => updateQuestionnaire({ description: e.target.value })}
              placeholder="E.g. Please answer the following technical questions accurately."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Global Questionnaire Candidate Visibility Toggle */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 flex-wrap transition-colors ${
          currentQ.isVisibleToCandidates !== false
            ? 'bg-emerald-50/60 border-emerald-200'
            : 'bg-amber-50/70 border-amber-300'
        }`}>
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                currentQ.isVisibleToCandidates !== false
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-400'
              }`}>
                {currentQ.isVisibleToCandidates !== false ? (
                  <>
                    <Eye className="w-3 h-3 text-emerald-700" /> VISIBILITY: ON (Visible to Applicants)
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-amber-700" /> VISIBILITY: OFF (Hidden / Auto-Skipped)
                  </>
                )}
              </span>
              <span className="text-xs font-bold text-[#102a43]">
                Show Questionnaire to Candidates
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {currentQ.isVisibleToCandidates !== false
                ? 'Published questionnaire is actively presented to applicants in Step 4 of the Candidate Application Portal.'
                : 'Questionnaire is completely hidden from candidates. Step 4 will be automatically skipped. Questions and settings remain safely stored in HR.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={currentQ.isVisibleToCandidates !== false}
              onChange={e => {
                const nextVal = e.target.checked;
                updateQuestionnaire({ isVisibleToCandidates: nextVal });
                notify(
                  nextVal
                    ? 'Questionnaire visibility turned ON. Step 4 enabled for candidates.'
                    : 'Questionnaire visibility turned OFF. Candidates will skip Step 4.',
                  nextVal ? 'success' : 'info'
                );
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            <span className="ml-3 text-xs font-bold text-slate-700">
              {currentQ.isVisibleToCandidates !== false ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      {/* ── Version History Drawer ─────────────────────────────────────────── */}
      {showVersionHistory && currentQ.previousVersions && currentQ.previousVersions.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-purple-200">
            <h4 className="text-xs font-bold text-purple-900 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-700" />
              Immutable Version Archive ({currentQ.previousVersions.length} prior versions preserved)
            </h4>
            <button
              type="button"
              onClick={() => setShowVersionHistory(false)}
              className="text-purple-600 hover:text-purple-800 text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {currentQ.previousVersions.map(ver => (
              <div key={ver.version} className="bg-white p-3 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#102a43] font-mono mr-2">{ver.version}</span>
                  <span className="text-slate-500">
                    Published: {new Date(ver.publishedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="text-slate-400 ml-2">({ver.questions?.length || 0} questions)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Locked Snapshot
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sections & Questions Builder ───────────────────────────────────── */}
      <div className="space-y-5">
        {sections.map((section, secIdx) => {
          const secQuestions = questions.filter(
            q => (q.sectionTitle?.trim() || DEFAULT_SECTION.title) === section.title
          );

          return (
            <div key={section.id || section.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-4 bg-emerald-600 rounded-full" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#102a43]">
                    {section.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({secQuestions.length} {secQuestions.length === 1 ? 'Question' : 'Questions'})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMoveSection(secIdx, 'up')}
                    disabled={secIdx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                    title="Move section up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(secIdx, 'down')}
                    disabled={secIdx === sections.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                    title="Move section down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(section.title)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                      title="Delete section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Questions List for this Section */}
              <div className="space-y-3">
                {secQuestions.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No questions in this section yet.
                  </div>
                ) : (
                  secQuestions.map((q) => {
                    const globalIdx = questions.indexOf(q);
                    const isExpanded = editingQuestionId === q.id;
                    const precedingOptions = getPrecedingQuestions(q.id);

                    return (
                      <div
                        key={q.id}
                        className={`border rounded-xl transition-all ${
                          isExpanded
                            ? 'border-emerald-400 bg-white shadow-sm ring-1 ring-emerald-400/20'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        {/* Question Summary Bar (Collapsible) */}
                        <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                          <div
                            onClick={() => setEditingQuestionId(isExpanded ? null : q.id)}
                            className="flex items-center gap-2.5 flex-1 min-w-[200px] cursor-pointer select-none"
                          >
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                              {globalIdx + 1}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold text-[#102a43] truncate block">
                                {q.questionText || 'Untitled Question'}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {q.type}
                                </span>
                                {q.required ? (
                                  <span className="text-red-600 font-semibold">Required</span>
                                ) : (
                                  <span>Optional</span>
                                )}
                                {q.condition && (
                                  <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    Conditional
                                  </span>
                                )}
                                {q.isVisible === false && (
                                  <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-semibold inline-flex items-center gap-1">
                                    <EyeOff className="w-2.5 h-2.5 text-amber-600" /> Hidden from Candidates
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(q.id, 'up')}
                              disabled={globalIdx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200 cursor-pointer"
                              title="Move question up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(q.id, 'down')}
                              disabled={globalIdx === questions.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200 cursor-pointer"
                              title="Move question down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(q.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                              title="Duplicate question"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-100 cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingQuestionId(isExpanded ? null : q.id)}
                              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 cursor-pointer"
                            >
                              {isExpanded ? 'Done' : 'Edit'}
                            </button>
                          </div>
                        </div>

                        {/* Detailed Editor Panel */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-200 bg-white space-y-4 rounded-b-xl text-xs">
                            {/* Question Text */}
                            <div>
                              <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                Question Text <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={q.questionText}
                                onChange={e => handleUpdateQuestion(q.id, { questionText: e.target.value })}
                                placeholder="Enter the question prompt as it should appear to candidate..."
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-medium"
                              />
                            </div>

                            {/* Question Type, Section Assignment, Required Flag & Visibility Toggle */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                  Response Type
                                </label>
                                <select
                                  value={q.type}
                                  onChange={e => {
                                    const nextType = e.target.value as QuestionType;
                                    const updates: Partial<JobQuestion> = { type: nextType };
                                    if (['radio', 'checkbox', 'select'].includes(nextType) && (!q.options || q.options.length === 0)) {
                                      updates.options = [
                                        { label: 'Option 1', value: 'option_1' },
                                        { label: 'Option 2', value: 'option_2' },
                                      ];
                                    }
                                    handleUpdateQuestion(q.id, updates);
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 cursor-pointer font-medium"
                                >
                                  <option value="text">Single Line Text</option>
                                  <option value="textarea">Multi-Line Textarea</option>
                                  <option value="radio">Single Choice (Radio)</option>
                                  <option value="checkbox">Multiple Choice (Checkboxes)</option>
                                  <option value="select">Dropdown Select</option>
                                  <option value="boolean">Yes / No Toggle</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                  Assign to Section
                                </label>
                                <select
                                  value={q.sectionTitle || section.title}
                                  onChange={e => handleUpdateQuestion(q.id, { sectionTitle: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 cursor-pointer font-medium"
                                >
                                  {sections.map(s => (
                                    <option key={s.id || s.title} value={s.title}>
                                      {s.title}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                  Mandatory Flag
                                </label>
                                <label className="flex items-center gap-2 p-2 border border-slate-300 rounded-xl bg-slate-50 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={q.required}
                                    onChange={e => handleUpdateQuestion(q.id, { required: e.target.checked })}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="font-semibold text-slate-800">Required Question</span>
                                </label>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                  Candidate Visibility
                                </label>
                                <label className="flex items-center gap-2 p-2 border border-slate-300 rounded-xl bg-slate-50 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={q.isVisible !== false}
                                    onChange={e => handleUpdateQuestion(q.id, { isVisible: e.target.checked })}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="font-semibold text-slate-800">Show this question to candidates</span>
                                </label>
                              </div>
                            </div>

                            {/* Help Text & Placeholder */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                  Candidate Help Guidance (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={q.helpText || ''}
                                  onChange={e => handleUpdateQuestion(q.id, { helpText: e.target.value })}
                                  placeholder="E.g. Upload proof or specify details in years..."
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                                />
                              </div>
                              {['text', 'textarea'].includes(q.type) && (
                                <div>
                                  <label className="block text-[11px] font-bold text-[#102a43] uppercase tracking-wider mb-1">
                                    Placeholder Ghost Text (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={q.placeholder || ''}
                                    onChange={e => handleUpdateQuestion(q.id, { placeholder: e.target.value })}
                                    placeholder="E.g. Enter summary..."
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Options Editor (Radio, Checkbox, Select) */}
                            {['radio', 'checkbox', 'select'].includes(q.type) && (
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-[#102a43] uppercase tracking-wider">
                                    Options ({q.options?.length || 0})
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleAddOption(q.id)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Option
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {q.options?.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={opt.label}
                                        onChange={e => handleUpdateOption(q.id, optIdx, 'label', e.target.value)}
                                        placeholder="Option Label"
                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                      />
                                      <input
                                        type="text"
                                        value={opt.value}
                                        onChange={e => handleUpdateOption(q.id, optIdx, 'value', e.target.value)}
                                        placeholder="Stored Value"
                                        className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-500"
                                      />
                                      {q.options && q.options.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteOption(q.id, optIdx)}
                                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Conditional Display Rules */}
                            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2.5">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={Boolean(q.condition)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      const defaultParent = precedingOptions[0];
                                      handleUpdateQuestion(q.id, {
                                        condition: {
                                          dependsOnQuestionId: defaultParent ? defaultParent.id : '',
                                          expectedValue: defaultParent?.type === 'boolean' ? true : defaultParent?.options?.[0]?.value || 'yes',
                                        },
                                      });
                                    } else {
                                      handleUpdateQuestion(q.id, { condition: undefined });
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-bold text-blue-950 text-xs">
                                  Enable Conditional Visibility (Show only when another question matches a specific answer)
                                </span>
                              </label>

                              {q.condition && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {precedingOptions.length === 0 ? (
                                    <div className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                      No eligible preceding questions found. Move a Yes/No, Radio, Select or Checkbox question above this question to use as a dependency.
                                    </div>
                                  ) : (
                                    <>
                                      <div>
                                        <label className="block text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                                          Depends On Question
                                        </label>
                                        <select
                                          value={q.condition.dependsOnQuestionId}
                                          onChange={e => {
                                            const parentId = e.target.value;
                                            const parentQ = precedingOptions.find(item => item.id === parentId);
                                            handleUpdateQuestion(q.id, {
                                              condition: {
                                                dependsOnQuestionId: parentId,
                                                expectedValue: parentQ?.type === 'boolean' ? true : parentQ?.options?.[0]?.value || 'yes',
                                              },
                                            });
                                          }}
                                          className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs cursor-pointer"
                                        >
                                          {precedingOptions.map(parentQ => (
                                            <option key={parentQ.id} value={parentQ.id}>
                                              {parentQ.questionText} ({parentQ.type})
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                                          Expected Value to Trigger Visibility
                                        </label>
                                        {(() => {
                                          const parentQ = questions.find(item => item.id === q.condition?.dependsOnQuestionId);
                                          if (parentQ?.type === 'boolean') {
                                            return (
                                              <select
                                                value={q.condition.expectedValue === true ? 'true' : 'false'}
                                                onChange={e =>
                                                  handleUpdateQuestion(q.id, {
                                                    condition: {
                                                      ...q.condition!,
                                                      expectedValue: e.target.value === 'true',
                                                    },
                                                  })
                                                }
                                                className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs cursor-pointer"
                                              >
                                                <option value="true">Yes (True)</option>
                                                <option value="false">No (False)</option>
                                              </select>
                                            );
                                          }
                                          if (parentQ?.options && parentQ.options.length > 0) {
                                            return (
                                              <select
                                                value={String(q.condition.expectedValue)}
                                                onChange={e =>
                                                  handleUpdateQuestion(q.id, {
                                                    condition: {
                                                      ...q.condition!,
                                                      expectedValue: e.target.value,
                                                    },
                                                  })
                                                }
                                                className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs cursor-pointer"
                                              >
                                                {parentQ.options.map(opt => (
                                                  <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                  </option>
                                                ))}
                                              </select>
                                            );
                                          }
                                          return (
                                            <input
                                              type="text"
                                              value={String(q.condition.expectedValue)}
                                              onChange={e =>
                                                handleUpdateQuestion(q.id, {
                                                  condition: {
                                                    ...q.condition!,
                                                    expectedValue: e.target.value,
                                                  },
                                                })
                                              }
                                              className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs"
                                            />
                                          );
                                        })()}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Question Button for Section */}
              <button
                type="button"
                onClick={() => handleAddQuestion(section.title)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-dashed border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question to {section.title}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Add Section Bar ─────────────────────────────────────────────────── */}
      {showAddSection ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={newSectionTitle}
            onChange={e => setNewSectionTitle(e.target.value)}
            placeholder="Enter New Section Title (e.g. Technical Field Skills)..."
            className="flex-1 min-w-[200px] px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
          />
          <button
            type="button"
            onClick={handleAddSection}
            className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Create Section
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddSection(false);
              setNewSectionTitle('');
            }}
            className="px-3 py-2 border border-slate-300 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddSection(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#102a43] text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-700" /> Add Another Section
        </button>
      )}

      {/* ── Candidate Live Preview Modal ────────────────────────────────────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f0f4f8] rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 bg-white -mx-6 -mt-6 p-5 rounded-t-2xl">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Live Candidate Simulation
                </span>
                <h3 className="text-base font-bold text-[#102a43] mt-1">Step 4: Job-Specific Questionnaire</h3>
                <p className="text-xs text-slate-500">
                  {currentQ.description || `Test question visibility and responses for ${job.title || 'this position'}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Global Visibility Inactive Notice in Preview */}
            {currentQ.isVisibleToCandidates === false && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Global Visibility is OFF</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    This questionnaire is currently hidden from candidates and Step 4 will be automatically skipped in the live application portal. This simulation previews what candidates would experience if global visibility were enabled.
                  </p>
                </div>
              </div>
            )}

            {/* Simulated Questions List */}
            <div className="space-y-4">
              {(() => {
                const isPreviewQuestionVisible = (targetQ: JobQuestion): boolean => {
                  if (targetQ.isVisible === false) return false;
                  if (!targetQ.condition) return true;
                  const parentQ = questions.find(item => item.id === targetQ.condition!.dependsOnQuestionId);
                  if (parentQ && !isPreviewQuestionVisible(parentQ)) return false;
                  const parentVal = previewAnswers[targetQ.condition.dependsOnQuestionId];
                  if (Array.isArray(parentVal)) {
                    return parentVal.includes(targetQ.condition.expectedValue);
                  }
                  return parentVal === targetQ.condition.expectedValue;
                };

                return sections.map(section => {
                  const secQuestions = questions.filter(
                    q => (q.sectionTitle?.trim() || DEFAULT_SECTION.title) === section.title
                  );
                  const visibleSecQuestions = secQuestions.filter(isPreviewQuestionVisible);
                  if (visibleSecQuestions.length === 0) return null;

                  return (
                    <div key={section.id || section.title} className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#102a43] border-b pb-2 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
                        {section.title}
                      </h4>

                      <div className="space-y-4">
                        {visibleSecQuestions.map((q, idx) => {
                          const val = previewAnswers[q.id];

                          return (
                            <div key={q.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                              <label className="font-bold text-[#102a43] block">
                                {idx + 1}. {q.questionText}
                                {q.required ? (
                                  <span className="text-red-500 ml-1">*</span>
                                ) : (
                                  <span className="text-slate-400 font-normal ml-1">(optional)</span>
                                )}
                              </label>
                              {q.helpText && <p className="text-[11px] text-slate-500">{q.helpText}</p>}

                              {/* Controls */}
                              <div className="pt-1">
                                {q.type === 'text' && (
                                  <input
                                    type="text"
                                    value={val || ''}
                                    placeholder={q.placeholder || 'Enter text...'}
                                    onChange={e => setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border rounded-lg text-xs"
                                  />
                                )}
                                {q.type === 'textarea' && (
                                  <textarea
                                    rows={2}
                                    value={val || ''}
                                    placeholder={q.placeholder || 'Enter explanation...'}
                                    onChange={e => setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border rounded-lg text-xs"
                                  />
                                )}
                                {q.type === 'boolean' && (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: true })}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                                        val === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300'
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: false })}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                                        val === false ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300'
                                      }`}
                                    >
                                      No
                                    </button>
                                  </div>
                                )}
                                {['radio', 'select'].includes(q.type) && (
                                  <div className="flex flex-wrap gap-2">
                                    {q.options?.map(opt => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt.value })}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                          val === opt.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'checkbox' && (
                                  <div className="flex flex-wrap gap-2">
                                    {q.options?.map(opt => {
                                      const list: string[] = Array.isArray(val) ? val : [];
                                      const checked = list.includes(opt.value);
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => {
                                            const next = checked ? list.filter(v => v !== opt.value) : [...list, opt.value];
                                            setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                                          }}
                                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                            checked ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300'
                                          }`}
                                        >
                                          {checked ? '✓ ' : ''}{opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-[#102a43] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
