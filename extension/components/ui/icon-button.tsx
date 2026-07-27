import * as React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'accent' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  outline: 'border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-accent)] text-[var(--color-foreground)] shadow-xs',
  ghost: 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50',
  accent: 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/50 hover:bg-[var(--color-accent)]/80 shadow-xs',
  destructive: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20',
};

const sizeStyles = {
  sm: 'h-7 w-7 rounded-lg text-xs',
  md: 'h-9 w-9 rounded-xl text-sm',
  lg: 'h-10 w-10 rounded-xl text-base',
};

/**
 * Reusable IconButton component for icon action triggers with consistent sizing, rounded corners, and micro-animations.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'outline', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex items-center justify-center shrink-0 transition-all cursor-pointer select-none active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
