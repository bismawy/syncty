import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number; // 0 to 1
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
  className,
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={cn('relative flex w-full touch-none select-none items-center py-1 cursor-pointer', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      {/* Track */}
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--color-accent)] border border-[var(--color-border)]/40">
        {/* Filled Portion */}
        <div
          className="h-full bg-[var(--color-foreground)] transition-all duration-75 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Thumb */}
      <div
        className="absolute h-3.5 w-3.5 rounded-full border border-[var(--color-border)] bg-[var(--color-foreground)] shadow-xs transition-transform duration-75 pointer-events-none -ml-1.75"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}
