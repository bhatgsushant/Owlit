import React from 'react';

const options = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function BasketGranularitySelector({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 p-1 text-xs font-semibold text-slate-200 shadow-inner shadow-black/10">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              `px-3 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ` +
              (isActive
                ? 'bg-white text-slate-900 shadow-sm shadow-white/20'
                : 'text-slate-200/80 hover:text-slate-100 hover:bg-white/10')
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
