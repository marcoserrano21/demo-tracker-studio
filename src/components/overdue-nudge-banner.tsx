'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Vehicle } from '@/lib/types';
import { getOverdueMinutes, getOverdueVehicles } from '@/lib/overdue';
import { subscribeCountdownTick } from '@/lib/countdown-ticker';
import { Button } from './ui/button';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverdueNudgeBannerProps {
  vehicles: Vehicle[];
  onGoFinish?: () => void;
  className?: string;
}

const DISMISS_KEY = 'ddhub-overdue-nudge-dismissed';

export function OverdueNudgeBanner({ vehicles, onGoFinish, className }: OverdueNudgeBannerProps) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]') as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    return subscribeCountdownTick((t) => setNow(t));
  }, []);

  const overdue = useMemo(() => getOverdueVehicles(vehicles, now), [vehicles, now]);
  const visible = overdue.filter((v) => !dismissedIds.includes(v.id));

  if (visible.length === 0) return null;

  const top = visible[0];
  const mins = getOverdueMinutes(top, now);

  const dismiss = () => {
    const next = [...new Set([...dismissedIds, ...visible.map((v) => v.id)])];
    setDismissedIds(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {visible.length === 1
              ? `${top.model} is overdue${mins > 0 ? ` by ${mins} min` : ''}`
              : `${visible.length} demos are overdue`}
          </p>
          <p className="text-xs text-muted-foreground">
            Finish them now so the floor stays accurate.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onGoFinish && (
          <Button type="button" size="sm" className="rounded-lg" onClick={onGoFinish}>
            Go to Finish
          </Button>
        )}
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
