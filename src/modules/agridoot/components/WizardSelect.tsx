import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface WizardSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface WizardSelectProps {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: (string | WizardSelectOption)[];
  required?: boolean;
  error?: string;
  placeholder?: string;
  fieldRef?: (el: any) => void;
  fieldId?: string;
  small?: boolean;
  className?: string;
}

const WizardSelect: React.FC<WizardSelectProps> = ({
  label, value, onChange, options, required = false,
  error, placeholder = 'Select...', fieldRef, fieldId, small = false, className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to WizardSelectOption format
  const normalizedOptions: WizardSelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selected = normalizedOptions.find(o => o.value === value);

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
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef} id={fieldId}>
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
          small ? 'min-h-[44px] py-1.5' : selected?.sublabel ? 'min-h-[56px] py-1.5' : 'h-[52px]',
          error
            ? 'bg-rose-950/30 border-rose-500 text-white'
            : open
            ? 'bg-[#182234] border-emerald-500 text-white shadow-lg ring-2 ring-emerald-500/20'
            : 'bg-[#182234] border-[#233148] text-white hover:border-slate-500',
        ].join(' ')}
      >
        <span className='flex items-center space-x-2.5 overflow-hidden text-ellipsis whitespace-nowrap min-w-0'>
          {selected?.icon && <span className='shrink-0 flex items-center justify-center'>{selected.icon}</span>}
          <div className="flex flex-col text-left truncate min-w-0">
            <span className={selected ? 'text-white text-sm font-bold truncate leading-tight' : 'text-slate-500 text-sm font-bold truncate'}>
              {selected ? selected.label : placeholder}
            </span>
            {selected?.sublabel && (
              <span className="text-[10.5px] text-slate-400 font-normal truncate leading-tight mt-0.5">
                {selected.sublabel}
              </span>
            )}
          </div>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div className='absolute z-[250] top-full left-0 right-0 mt-1 bg-[#0F1A2C] border border-[#2A3952] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700'>
          {normalizedOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={[
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-left transition-all cursor-pointer',
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-900/90 to-teal-900/70 text-emerald-300 border-l-4 border-emerald-500 shadow-inner'
                    : 'text-slate-300 hover:bg-[#182234] hover:text-white border-l-4 border-transparent',
                  idx !== 0 ? 'border-t border-[#1E293B]/60' : '',
                ].join(' ')}
              >
                <div className='flex items-center space-x-3 min-w-0'>
                  {opt.icon && <span className='shrink-0 flex items-center justify-center'>{opt.icon}</span>}
                  <div className="flex flex-col text-left min-w-0">
                    <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>{opt.label}</span>
                    {opt.sublabel && (
                      <span className={`text-[11px] font-normal leading-tight mt-0.5 ${isSelected ? 'text-emerald-400/90' : 'text-slate-400'}`}>{opt.sublabel}</span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className='w-4 h-4 text-emerald-400 stroke-[3] shrink-0 ml-2' />}
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