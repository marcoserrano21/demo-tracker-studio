'use client';

import { useMemo, useState } from 'react';
import type { Advisor, DriveLog, Vehicle } from '@/lib/types';
import { getDriveStartDate } from '@/lib/drive-log-utils';
import { getOverdueVehicles } from '@/lib/overdue';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Moon, X, Sparkles } from 'lucide-react';
import { startOfDay } from 'date-fns';

interface EndOfShiftRecapProps {
  advisor: Advisor;
  driveLogs: DriveLog[];
  vehicles: Vehicle[];
  className?: string;
}

const DISMISS_KEY = 'ddhub-eos-recap';

function isTodayEnd(log: DriveLog, dayStart: number): boolean {
  if (!log.endTime) return false;
  const end =
    typeof log.endTime === 'number'
      ? log.endTime
      : log.endTime instanceof Date
        ? log.endTime.getTime()
        : (log.endTime as { toDate?: () => Date })?.toDate?.()?.getTime?.() ??
          ((log.endTime as { seconds?: number }).seconds
            ? (log.endTime as { seconds: number }).seconds * 1000
            : 0);
  return end >= dayStart;
}

/** ~20s glanceable end-of-shift recap for the signed-in advisor. */
export function EndOfShiftRecap({ advisor, driveLogs, vehicles, className }: EndOfShiftRecapProps) {
  const todayKey = startOfDay(new Date()).toISOString().slice(0, 10);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === todayKey;
  });

  const stats = useMemo(() => {
    const dayStart = startOfDay(new Date()).getTime();
    const mine = driveLogs.filter(
      (log) =>
        log.purpose === 'Demo' &&
        log.endTime &&
        (log.coPilot === advisor.name || log.advisorIn === advisor.name) &&
        isTodayEnd(log, dayStart),
    );
    const fsdSubs = mine.filter(
      (l) => l.fsdSubscriptionAttached === 'Y' || l.fsdSubscribed,
    ).length;
    const overdueCleared = mine.filter((l) => {
      const start = getDriveStartDate(l.startTime)?.getTime();
      if (start == null || !l.expectedDuration || !l.endTime) return false;
      // Cleared overdue = finished after ETA
      const eta = start + l.expectedDuration * 60 * 1000;
      const end =
        typeof l.endTime === 'number'
          ? l.endTime
          : l.endTime instanceof Date
            ? l.endTime.getTime()
            : (l.endTime as { toDate?: () => Date })?.toDate?.()?.getTime?.() ?? 0;
      return end > eta;
    }).length;
    const stillOverdue = getOverdueVehicles(vehicles).length;
    return {
      demos: mine.length,
      fsdSubs,
      overdueCleared,
      stillOverdue,
    };
  }, [advisor.name, driveLogs, vehicles]);

  if (dismissed || stats.demos === 0) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-2',
        className,
      )}
      aria-label="End of shift recap"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">End-of-shift recap</p>
            <p className="text-xs text-muted-foreground">Twenty seconds. Then you’re done.</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Dismiss recap"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, todayKey);
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Demos', value: stats.demos },
          { label: 'FSD-sub', value: stats.fsdSubs },
          { label: 'Overdue cleared', value: stats.overdueCleared },
          { label: 'Still overdue', value: stats.stillOverdue },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-background/70 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Streaks grow when you Finish on time and log FSD-sub attaches.
      </p>
    </section>
  );
}
