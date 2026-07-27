import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  id,
}: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onCheckedChange) {
      onCheckedChange(checked === false);
    }
  };

  const isChecked = checked === true;
  const isIndeterminate = checked === 'indeterminate';
  const isActive = isChecked || isIndeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={isIndeterminate ? 'mixed' : isChecked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        isActive
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border border-[var(--color-primary)] shadow-xs scale-100'
          : 'bg-[var(--color-background)]/80 hover:bg-[var(--color-accent)] border border-[var(--color-muted-foreground)]/35 text-transparent hover:border-[var(--color-primary)]/60',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isIndeterminate ? (
        <Minus className="h-3.5 w-3.5 stroke-[3] transition-transform duration-150 scale-100 opacity-100" />
      ) : (
        <Check
          className={cn(
            'h-3.5 w-3.5 stroke-[3] transition-transform duration-150',
            isChecked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        />
      )}
    </button>
  );
}
