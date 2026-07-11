'use client';

import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';
import { Slider } from './ui/slider';

const PRESETS = [15, 50, 80, 100] as const;

interface BatteryLevelPickerProps {
  value: number | '';
  onChange: (value: number) => void;
  name?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  hint?: string;
}

function batteryFillClass(level: number): string {
  if (level >= 80) return 'bg-emerald-500';
  if (level >= 50) return 'bg-sky-500';
  if (level >= 15) return 'bg-amber-500';
  return 'bg-destructive';
}

export function BatteryLevelPicker({
  value,
  onChange,
  name = 'battery',
  min = 1,
  max = 100,
  disabled,
  className,
  hint = 'Tap a preset or use +/- to match what you see on the vehicle screen.',
}: BatteryLevelPickerProps) {
  const numValue = value === '' ? min : Math.min(max, Math.max(min, value));

  const adjust = (delta: number) => {
    onChange(Math.min(max, Math.max(min, numValue + delta)));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className="relative h-12 w-full overflow-hidden rounded-xl border-2 border-border bg-muted/30"
        role="img"
        aria-label={`Battery level ${numValue} percent`}
      >
        <div
          className={cn('h-full transition-all duration-200', batteryFillClass(numValue))}
          style={{ width: `${numValue}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-foreground drop-shadow-sm">
          {numValue}%
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={numValue === preset ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className="h-11 rounded-lg text-sm font-semibold tabular-nums"
            onClick={() => onChange(preset)}
            aria-pressed={numValue === preset}
          >
            {preset}%
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || numValue <= min}
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => adjust(-5)}
          aria-label="Decrease battery by 5 percent"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Slider
          value={[numValue]}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
          aria-label="Battery level slider"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || numValue >= max}
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => adjust(5)}
          aria-label="Increase battery by 5 percent"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}

      <input type="hidden" name={name} value={numValue} />
    </div>
  );
}
