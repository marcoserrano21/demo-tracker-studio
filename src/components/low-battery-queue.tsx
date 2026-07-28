'use client';

import { useMemo } from 'react';
import type { Vehicle } from '@/lib/types';
import { BATTERY_QUEUE_PERCENT, isLowBatteryQueue } from '@/lib/battery-thresholds';
import { Button } from './ui/button';
import { BatteryLow, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeTrim } from '@/lib/data';

interface LowBatteryQueueProps {
  vehicles: Vehicle[];
  onCharge?: (vehicle: Vehicle) => void;
  className?: string;
}

/** Available cars under 20% — Charge CTA queue. */
export function LowBatteryQueue({ vehicles, onCharge, className }: LowBatteryQueueProps) {
  const queue = useMemo(
    () =>
      vehicles
        .filter((v) => !v.sold && v.status === 'Available' && isLowBatteryQueue(v.batteryLevel))
        .sort((a, b) => a.batteryLevel - b.batteryLevel),
    [vehicles],
  );

  if (queue.length === 0) return null;

  return (
    <section
      className={cn(
        'rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 space-y-2',
        className,
      )}
      aria-label="Low battery queue"
    >
      <div className="flex items-center gap-2">
        <BatteryLow className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Low battery queue</p>
          <p className="text-xs text-muted-foreground">
            Available under {BATTERY_QUEUE_PERCENT}% — charge before the next rush.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {queue.slice(0, 5).map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2.5 py-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium">
              {v.model} · {normalizeTrim(v.trim)} · {v.batteryLevel}%
            </span>
            {onCharge && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 rounded-lg h-8"
                onClick={() => onCharge(v)}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Charge
              </Button>
            )}
          </li>
        ))}
      </ul>
      {queue.length > 5 && (
        <p className="text-xs text-muted-foreground">+{queue.length - 5} more</p>
      )}
    </section>
  );
}
