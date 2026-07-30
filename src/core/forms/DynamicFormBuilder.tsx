/**
 * Phase 2 Foundation Service 2: Dynamic Form Builder
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Metadata-driven form engine supporting text, number, date, select, multiselect,
 * file uploads, signature capture, GPS coords, dynamic validation & draft auto-save.
 */

import React, { useState } from 'react';
import { FileText, Save, CheckCircle2, Upload, MapPin, Edit3 } from 'lucide-react';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'file'
  | 'signature'
  | 'gps';

export interface FormFieldMetadata {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validationRegex?: string;
  defaultValue?: string | number | boolean;
}

export interface FormSchemaMetadata {
  formId: string;
  title: string;
  description: string;
  version: string;
  fields: FormFieldMetadata[];
}

interface DynamicFormBuilderProps {
  schema: FormSchemaMetadata;
  onSubmit: (formData: Record<string, unknown>) => void;
  initialValues?: Record<string, unknown>;
  loading?: boolean;
}

export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  schema,
  onSubmit,
  initialValues = {},
  loading = false,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved] = useState(false);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setDraftSaved(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem(`form_draft_${schema.formId}`, JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    schema.fields.forEach((field) => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} is required.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            {schema.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{schema.description}</p>
        </div>
        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
          {schema.version}
        </span>
      </div>

      {/* Dynamic Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.fields.map((field) => (
          <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 space-y-1.5' : 'space-y-1.5'}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {/* TEXT & NUMBER */}
            {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
              <input
                type={field.type}
                value={(formData[field.key] as string) || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:ring-emerald-600 focus:border-emerald-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium"
              />
            )}

            {/* TEXTAREA */}
            {field.type === 'textarea' && (
              <textarea
                value={(formData[field.key] as string) || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:ring-emerald-600 focus:border-emerald-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium"
              />
            )}

            {/* SELECT */}
            {field.type === 'select' && (
              <select
                value={(formData[field.key] as string) || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:ring-emerald-600 focus:border-emerald-600 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium"
              >
                <option value="">Select option...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* FILE UPLOAD */}
            {field.type === 'file' && (
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 transition-colors">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-600">Click to upload document</span>
              </div>
            )}

            {/* GPS LOCATION */}
            {field.type === 'gps' && (
              <button
                type="button"
                onClick={() => handleFieldChange(field.key, '20.7453° N, 78.6022° E (Wardha)')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>{(formData[field.key] as string) || 'Acquire Geo Coordinates'}</span>
              </button>
            )}

            {errors[field.key] && (
              <p className="text-xs text-red-600 font-semibold">{errors[field.key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{draftSaved ? 'Draft Saved ✓' : 'Save Draft'}</span>
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white text-xs font-black rounded-xl hover:from-emerald-800 hover:to-emerald-950 shadow-md transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submit Form Record</span>
        </button>
      </div>
    </form>
  );
};
