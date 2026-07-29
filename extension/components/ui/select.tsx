import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih opsi…',
  className,
}: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="appearance-none flex h-9 w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] outline-none transition-all hover:bg-[var(--color-accent)]/30 focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer select-none pr-8"
      >
        {!value && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-70" />
    </div>
  );
}
