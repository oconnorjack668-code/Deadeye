// src/components/ui/Select.tsx
import React, { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, options, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 pr-9 text-sm text-zinc-100 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-400" />
        </div>
        {error && <p className="text-sm text-red-400 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
