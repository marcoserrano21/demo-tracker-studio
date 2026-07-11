'use client';

import type { Vehicle } from '@/lib/types';
import { AlertTriangle, BatteryLow, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FleetAttentionStripProps {
  vehicles: Vehicle[];
  onFilterStatus?: (status: 'low-battery' | 'overdue' | 'Needs Attention') => void;
  activeFilter?: string | null;
}

export function FleetAttentionStrip({
  vehicles,
  onFilterStatus,
  activeFilter,
}: FleetAttentionStripProps) {
  const lowBattery = vehicles.filter(
    (v) => !v.sold && v.status !== 'Sold' && v.batteryLevel < 30,
  );
  const overdue = vehicles.filter((v) => v.overdue && v.status === 'On Demo');
  const needsAttention = vehicles.filter((v) => v.status === 'Needs Attention');

  if (lowBattery.length === 0 && overdue.length === 0 && needsAttention.length === 0) {
    return null;
  }

  const chips = [
    {
      id: 'low-battery' as const,
      count: lowBattery.length,
      label: 'Low battery',
      icon: BatteryLow,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    {
      id: 'overdue' as const,
      count: overdue.length,
      label: 'Overdue',
      icon: Clock,
      className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    {
      id: 'Needs Attention' as const,
      count: needsAttention.length,
      label: 'Needs attention',
      icon: AlertTriangle,
      className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
    },
  ].filter((c) => c.count > 0);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5"
      role="status"
      aria-label="Fleet attention items"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
        Attention
      </span>
      {chips.map((chip) => {
        const Icon = chip.icon;
        const isActive = activeFilter === chip.id;
        return (
          <Button
            key={chip.id}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 rounded-lg border text-xs font-medium',
              chip.className,
              isActive && 'ring-2 ring-primary ring-offset-1',
            )}
            onClick={() => onFilterStatus?.(chip.id)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {chip.count} {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
