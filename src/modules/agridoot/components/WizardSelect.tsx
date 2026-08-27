import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface WizardSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface WizardSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: WizardSelectOption[];
  required?: boolean;
  error?: string;
  placeholder?: string;
  fieldRef?: (el: any) => void;
  fieldId?: string;
  small?: boolean;
}

const WizardSelect: React.FC<WizardSelectProps> = ({
  label, value, onChange, options, required = false,
  error, placeholder = 'Select...', fieldRef, fieldId, small = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='space-y-1.5 relative' ref={containerRef} id={fieldId}>
      {label && (
        <label className={`font-bold block ${small ? 'text-[11px] text-slate-300' : 'text-xs text-slate-200'}`}>
          {label}{required && <span className='text-rose-500 ml-0.5'>*</span>}
        </label>
      )}
      <button
        type='button'
        ref={fieldRef}
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center justify-between px-4 rounded-xl font-bold text-sm transition-all cursor-pointer border-2',
          small ? 'h-[44px]' : 'h-[52px]',
          error
            ? 'bg-rose-950/30 border-rose-500 text-white'
            : open
            ? 'bg-[#182234] border-emerald-500 text-white'
            : 'bg-[#182234] border-[#233148] text-white hover:border-slate-500',
        ].join(' ')}
      >
        <span className='flex items-center space-x-2.5'>
          {selected?.icon && <span className='text-base leading-none'>{selected.icon}</span>}
          <span className={selected ? 'text-white' : 'text-slate-500'}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div className='absolute z-[200] top-full left-0 right-0 mt-1 bg-[#0F1A2C] border border-[#2A3952] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden'>
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-left transition-all cursor-pointer',
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-900/80 to-teal-900/60 text-emerald-300 border-l-2 border-emerald-500'
                    : 'text-slate-300 hover:bg-[#182234] hover:text-white border-l-2 border-transparent',
                  idx !== 0 ? 'border-t border-[#1E293B]/60' : '',
                ].join(' ')}
              >
                <span className='flex items-center space-x-3'>
                  {opt.icon && <span className='text-base'>{opt.icon}</span>}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <Check className='w-4 h-4 text-emerald-400 stroke-[3] shrink-0' />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className='text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1'>
          <span>⚠️</span><span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default WizardSelect;