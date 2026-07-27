import * as React from 'react';
import { cn } from '@/lib/utils';

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

/**
 * Sidebar navigation button with active/inactive states. Used in SettingsModal
 * sidebar. Replaces the repeated inline pattern with consistent styling.
 */
export function NavItem({ active = false, icon, children, className, ...props }: NavItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none text-left',
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border border-[var(--color-border)]/60 shadow-xs'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/30',
        className
      )}
      {...props}
    >
      {icon && (
        <span className={cn('h-4 w-4 shrink-0 flex items-center', active ? 'text-[var(--color-primary)]' : 'opacity-70')}>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}
