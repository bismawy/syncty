import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'online' | 'offline' | 'warning' | 'info' | 'neutral' | 'live';
  showDot?: boolean;
  pulseDot?: boolean;
  compact?: boolean;
}

const statusStyles = {
  online: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  live: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold',
  offline: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  neutral: 'bg-[var(--color-accent)] text-[var(--color-muted-foreground)] border-[var(--color-border)]',
};

const dotStyles = {
  online: 'bg-emerald-500',
  live: 'bg-emerald-500',
  offline: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-400',
  neutral: 'bg-[var(--color-muted-foreground)]',
};

/**
 * Reusable StatusBadge component for colored status labels, status dots, and live badges.
 */
export function StatusBadge({
  status = 'neutral',
  showDot = false,
  pulseDot = false,
  compact = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none',
        compact && 'text-[10px] px-2 py-0.5',
        statusStyles[status],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {pulseDot && (
            <span
              className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotStyles[status])}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotStyles[status])} />
        </span>
      )}
      {children}
    </span>
  );
}
