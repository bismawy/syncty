import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        secondary: 'border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        outline: 'border-[var(--color-border)] text-[var(--color-foreground)]',
        success: 'border-transparent bg-[var(--color-success)] text-black',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

/** Predefined color schemes for colored status pills. */
const colorStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  accent: 'bg-[var(--color-accent)] text-[var(--color-foreground)] border-[var(--color-border)]',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Named color scheme. Overrides `variant` styling when set. */
  color?: 'emerald' | 'sky' | 'rose' | 'accent';
  /** Smaller text size for compact badges (9px). */
  compact?: boolean;
}

export function Badge({ className, variant, color, compact, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        color ? cn('inline-flex items-center rounded-full border px-2 py-0.5 font-semibold transition-colors', colorStyles[color]) : badgeVariants({ variant }),
        compact && 'text-[9px] px-2 py-0.5',
        className
      )}
      {...props}
    />
  );
}
