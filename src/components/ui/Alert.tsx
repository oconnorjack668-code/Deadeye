// src/components/ui/Alert.tsx
import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
  };

  const variants = {
    info: 'bg-blue-950/40 border-blue-800/60 text-blue-200',
    success: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    error: 'bg-red-950/40 border-red-800/60 text-red-200',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border p-4 text-sm leading-relaxed',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      {/* min-w-0 lets the text column shrink inside the flex row, and
          break-words splits strings with no spaces in them. Without both, a
          long technical message - a stack trace, a URL, a MediaPipe error -
          pushes straight through the border instead of wrapping. */}
      <div className="min-w-0 flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90 break-words">{children}</div>
      </div>
    </div>
  );
}
