import React, { useState, useRef, useMemo } from 'react';
import {
  ClipboardList, ArrowLeft, ArrowRight, AlertCircle,
  HelpCircle, CheckCircle2
} from 'lucide-react';
import type { RmsJobPosting } from '../../lib/types';
import type { JobQuestionnaire, JobQuestion, QuestionnaireResponses } from '../types';

interface Step4QuestionnaireProps {
  job: RmsJobPosting;
  questionnaire: JobQuestionnaire;
  answers: QuestionnaireResponses;
  onChange: (answers: QuestionnaireResponses) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Questionnaire({
  job,
  questionnaire,
  answers = {},
  onChange,
  onNext,
  onBack,
}: Step4QuestionnaireProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const questions = useMemo(() => questionnaire.questions || [], [questionnaire]);

  // ── Evaluate Conditional & Individual Visibility ───────────────────────────
  const isQuestionVisible = (q: JobQuestion): boolean => {
    // 1. Check individual visibility flag (defaults to true if omitted)
    if (q.isVisible === false) return false;

    // 2. Check conditional dependency rules
    if (!q.condition) return true;

    // 3. Cascading rule: if parent question exists and is hidden, child is also hidden
    const parentQ = questions.find(item => item.id === q.condition!.dependsOnQuestionId);
    if (parentQ && !isQuestionVisible(parentQ)) {
      return false;
    }

    const parentVal = answers[q.condition.dependsOnQuestionId];
    if (Array.isArray(parentVal)) {
      return parentVal.includes(q.condition.expectedValue);
    }
    return parentVal === q.condition.expectedValue;
  };

  // ── Value Handlers ──────────────────────────────────────────────────────────
  const handleAnswerChange = (questionId: string, val: any) => {
    const updated = { ...answers, [questionId]: val };
    onChange(updated);

    // Clear error for this field if populated
    if (errors[questionId]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  };

  const handleCheckboxToggle = (questionId: string, optionVal: string) => {
    const currentList: string[] = Array.isArray(answers[questionId]) ? [...answers[questionId]] : [];
    const idx = currentList.indexOf(optionVal);
    if (idx >= 0) {
      currentList.splice(idx, 1);
    } else {
      currentList.push(optionVal);
    }
    handleAnswerChange(questionId, currentList);
  };

  // ── Form Validation ─────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let firstErrorId: string | null = null;

    questions.forEach(q => {
      // Hidden conditional questions must NEVER block validation
      if (!isQuestionVisible(q)) return;

      if (q.required) {
        const val = answers[q.id];
        let isEmpty = false;

        if (val === undefined || val === null) {
          isEmpty = true;
        } else if (typeof val === 'string' && val.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(val) && val.length === 0) {
          isEmpty = true;
        }

        if (isEmpty) {
          newErrors[q.id] = 'This question requires an answer before proceeding.';
          if (!firstErrorId) {
            firstErrorId = q.id;
          }
        }
      }
    });

    setErrors(newErrors);

    if (firstErrorId && fieldRefs.current[firstErrorId]) {
      fieldRefs.current[firstErrorId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldRefs.current[firstErrorId]?.focus?.();
      return false;
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Cleanse answers to exclude any hidden questions before proceeding
      const sanitizedAnswers: Record<string, any> = {};
      questions.forEach(q => {
        if (isQuestionVisible(q) && answers[q.id] !== undefined) {
          sanitizedAnswers[q.id] = answers[q.id];
        }
      });
      onChange(sanitizedAnswers);
      onNext();
    }
  };

  // ── Group Questions by Section ──────────────────────────────────────────────
  const sections = useMemo(() => {
    const map = new Map<string, JobQuestion[]>();
    questions.forEach(q => {
      const sec = q.sectionTitle?.trim() || 'Job-Specific Assessment';
      if (!map.has(sec)) {
        map.set(sec, []);
      }
      map.get(sec)!.push(q);
    });
    return Array.from(map.entries());
  }, [questions]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Step Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#102a43]">Step 4: Job-Specific Questionnaire</h2>
          <p className="text-xs text-[#627d98]">
            {questionnaire.description || `Please answer the role-specific assessment questions for ${job.title}.`}
          </p>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold">Required Questions Incomplete</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              Please complete all mandatory questions marked with an asterisk (<span className="text-red-500">*</span>) to proceed.
            </p>
          </div>
        </div>
      )}

      {/* ── Sections & Questions ───────────────────────────────────────────── */}
      {sections.map(([sectionTitle, secQuestions], sIdx) => {
        // Check if any question in this section is visible
        const visibleQuestions = secQuestions.filter(isQuestionVisible);
        if (visibleQuestions.length === 0) return null;

        return (
          <div key={sectionTitle || sIdx} className="border border-slate-200 rounded-xl p-5 bg-white space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#102a43] flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
                {sectionTitle}
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                {visibleQuestions.length} {visibleQuestions.length === 1 ? 'Question' : 'Questions'}
              </span>
            </div>

            <div className="space-y-5">
              {secQuestions.map((q, qIdx) => {
                const visible = isQuestionVisible(q);
                if (!visible) return null;

                const val = answers[q.id];
                const error = errors[q.id];

                return (
                  <div
                    key={q.id}
                    ref={el => { fieldRefs.current[q.id] = el; }}
                    tabIndex={-1}
                    className={`p-4 rounded-xl border transition-all ${
                      error
                        ? 'border-red-300 bg-red-50/20'
                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                    }`}
                  >
                    {/* Question Label */}
                    <label className="block text-xs font-bold text-[#102a43] mb-1 leading-snug">
                      <span className="text-slate-500 font-mono mr-1.5">{qIdx + 1}.</span>
                      {q.questionText}
                      {q.required ? (
                        <span className="text-red-500 ml-1" title="Required question">*</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">(optional)</span>
                      )}
                    </label>

                    {/* Help Text */}
                    {q.helpText && (
                      <p className="text-[11px] text-[#627d98] mb-2.5 leading-relaxed flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 shrink-0 text-slate-400" />
                        {q.helpText}
                      </p>
                    )}

                    {/* Question Controls by Type */}
                    <div className="mt-2">
                      {/* 1. TEXT */}
                      {q.type === 'text' && (
                        <input
                          type="text"
                          value={val || ''}
                          placeholder={q.placeholder || 'Enter your response...'}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                            error
                              ? 'border-red-400 focus:ring-red-200'
                              : 'border-slate-300 focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                        />
                      )}

                      {/* 2. TEXTAREA */}
                      {q.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={val || ''}
                          placeholder={q.placeholder || 'Provide detailed explanation...'}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                            error
                              ? 'border-red-400 focus:ring-red-200'
                              : 'border-slate-300 focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                        />
                      )}

                      {/* 3. RADIO (Single Choice) */}
                      {q.type === 'radio' && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map(opt => {
                            const isSelected = val === opt.value;
                            return (
                              <label
                                key={opt.value}
                                onClick={() => handleAnswerChange(q.id, opt.value)}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. CHECKBOX (Multiple Choice) */}
                      {q.type === 'checkbox' && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map(opt => {
                            const selectedList: string[] = Array.isArray(val) ? val : [];
                            const isChecked = selectedList.includes(opt.value);

                            return (
                              <label
                                key={opt.value}
                                onClick={() => handleCheckboxToggle(q.id, opt.value)}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                    isChecked
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </span>
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. SELECT (Dropdown) */}
                      {q.type === 'select' && q.options && (
                        <select
                          value={val || ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                            error
                              ? 'border-red-400 focus:ring-red-200'
                              : 'border-slate-300 focus:ring-emerald-200 focus:border-emerald-600'
                          }`}
                        >
                          <option value="">-- Select an option --</option>
                          {q.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* 6. BOOLEAN (Yes / No) */}
                      {q.type === 'boolean' && (
                        <div className="flex items-center gap-3">
                          <label
                            onClick={() => handleAnswerChange(q.id, true)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                              val === true
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600/30'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                val === true ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {val === true && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span>Yes</span>
                          </label>

                          <label
                            onClick={() => handleAnswerChange(q.id, false)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                              val === false
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600/30'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                val === false ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {val === false && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span>No</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Field Error */}
                    {error && (
                      <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Navigation Actions ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Position Details
        </button>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          Save &amp; Proceed to Review <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
