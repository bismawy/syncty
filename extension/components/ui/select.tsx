import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih opsi…',
  className,
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-foreground)] outline-none transition-all hover:bg-[var(--color-accent)]/30 focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none',
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-[var(--color-muted-foreground)]">{placeholder}</span>}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] opacity-70 shrink-0 ml-1.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[160px] p-0 overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-xl z-[100]"
      >
        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onValueChange(opt.value)}
                className={cn(
                  'flex items-center justify-between text-xs rounded-xl px-2.5 py-2 cursor-pointer transition-colors focus:bg-[var(--color-accent)] focus:text-[var(--color-accent-foreground)]',
                  isSelected && 'font-semibold text-[var(--color-primary)] bg-[var(--color-accent)]/50'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

