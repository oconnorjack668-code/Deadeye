// src/components/ui/Input.tsx
import React, { forwardRef, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Field and label styles shared with Select. The border is `zinc-500/70`: a
 * control's edge needs 3:1 against the card to be found (WCAG 1.4.11), and the
 * old `zinc-700/80` measured about 1.5:1. Labels are plain sentence case at
 * 14px; the all-caps label is for section headings only (docs/design.md).
 */
export const FIELD_BORDER = 'border-zinc-500/70';
export const FIELD_LABEL = 'block text-sm font-medium text-zinc-200';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  /** A short rule shown under the field and read with it (e.g. the password rule). */
  hint?: string;
  /** A small icon inside the field, on the left. */
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, hint, icon: Icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hintId = hint && inputId ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className={FIELD_LABEL}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-describedby={hintId}
            aria-invalid={error ? true : undefined}
            className={cn(
              'flex h-11 w-full rounded-xl border bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50',
              FIELD_BORDER,
              Icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {hint && (
          <p id={hintId} className="text-sm text-zinc-400">
            {hint}
          </p>
        )}
        {error && <p className="text-sm text-red-400 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
