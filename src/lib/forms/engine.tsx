/**
 * Form engine — lightweight validated form primitives.
 *
 * useFormState manages field values + errors. validate() runs a schema of
 * validators and returns whether the form is valid. Field components render
 * consistent inputs with error display. Designed to plug into any module
 * without imposing a UI framework.
 */

import { useCallback, useState, type ChangeEvent, type ReactNode } from 'react';

export type Validator = (value: string) => string | null;
export type Schema = Record<string, Validator[]>;

export function required(msg = 'This field is required'): Validator {
  return (v) => (v.trim() === '' ? msg : null);
}

export function email(msg = 'Enter a valid email'): Validator {
  return (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : msg);
}

export function minLength(n: number, msg?: string): Validator {
  return (v) => (v.length >= n ? null : msg ?? `Must be at least ${n} characters`);
}

export function maxLength(n: number, msg?: string): Validator {
  return (v) => (v.length <= n ? null : msg ?? `Must be at most ${n} characters`);
}

export interface FormState {
  values: Record<string, string>;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isValid: boolean;
  setValue: (field: string, value: string) => void;
  setFieldTouched: (field: string) => void;
  validate: () => boolean;
  reset: () => void;
}

export function useFormState(initial: Record<string, string>, schema: Schema): FormState {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const runValidators = useCallback(
    (field: string, value: string): string | null => {
      const validators = schema[field];
      if (!validators) return null;
      for (const v of validators) {
        const msg = v(value);
        if (msg) return msg;
      }
      return null;
    },
    [schema]
  );

  const setValue = useCallback(
    (field: string, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        setErrors((prev) => ({ ...prev, [field]: runValidators(field, value) }));
      }
    },
    [touched, runValidators]
  );

  const setFieldTouched = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => ({ ...prev, [field]: runValidators(field, values[field] ?? '') }));
    },
    [values, runValidators]
  );

  const validate = useCallback((): boolean => {
    const next: Record<string, string | null> = {};
    let valid = true;
    for (const field of Object.keys(schema)) {
      const msg = runValidators(field, values[field] ?? '');
      next[field] = msg;
      if (msg) valid = false;
    }
    setErrors(next);
    setTouched(Object.keys(schema).reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return valid;
  }, [schema, values, runValidators]);

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
    setTouched({});
  }, [initial]);

  return {
    values,
    errors,
    touched,
    isValid: Object.values(errors).every((e) => !e),
    setValue,
    setFieldTouched,
    validate,
    reset,
  };
}

export function FormField({
  label,
  error,
  touched,
  children,
}: {
  label: string;
  error?: string | null;
  touched?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-primary-800">{label}</label>
      {children}
      {touched && error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className="px-4 py-2.5 border border-primary-200 rounded-lg text-sm text-primary-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
    />
  );
}

export function TextArea({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      className="px-4 py-2.5 border border-primary-200 rounded-lg text-sm text-primary-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-y"
    />
  );
}
