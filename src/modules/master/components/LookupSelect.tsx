/**
 * LookupSelect Component
 * Reusable enterprise dropdown component consuming generic Lookup Engine values.
 */

import React from 'react';
import { useMasterLookups } from '../hooks/useMasterData';

interface LookupSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  categoryKey: string;
  label?: string;
  placeholder?: string;
  error?: string;
}

export const LookupSelect: React.FC<LookupSelectProps> = ({
  categoryKey,
  label,
  placeholder = 'Select option',
  error,
  className = '',
  value,
  onChange,
  ...props
}) => {
  const { items, loading } = useMasterLookups(categoryKey);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-[11px] font-semibold text-primary-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`w-full py-2.5 px-3 bg-primary-50/50 border ${
          error ? 'border-red-400 focus:ring-red-500' : 'border-primary-200 focus:ring-emerald-500 focus:border-emerald-500'
        } rounded-xl text-xs sm:text-sm text-primary-900 focus:outline-none transition-all disabled:opacity-50 ${className}`}
        {...props}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {items.map((item) => (
          <option key={item.id} value={item.lookup_key}>
            {item.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 font-medium mt-0.5">{error}</p>}
    </div>
  );
};
