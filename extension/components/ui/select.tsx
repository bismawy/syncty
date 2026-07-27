import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] outline-none transition-all hover:bg-[var(--color-accent)]/30 focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer select-none',
            className
          )}
        >
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-sm w-auto max-h-60 overflow-y-auto bg-[var(--color-card)] border-[var(--color-border)] rounded-xl p-1 shadow-xl z-[100]"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onValueChange(opt.value)}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors select-none',
                isSelected
                  ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] font-semibold'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/50'
              )}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0 ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
