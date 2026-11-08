'use client';

import { useMemo } from 'react';
import type { Advisor, DriveLog } from '@/lib/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getDriveStartDate } from '@/lib/drive-log-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachingQueueProps {
  advisors: Advisor[];
  driveLogs: DriveLog[];
  className?: string;
}

interface CoachRow {
  id: string;
  name: string;
  demos: number;
  fsdSubRate: number;
  feedbackRate: number;
  reason: string;
}

function weekBounds(now = new Date()) {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }).getTime(),
    end: endOfWeek(now, { weekStartsOn: 1 }).getTime(),
  };
}

function logEndMs(log: DriveLog): number | null {
  if (!log.endTime) return null;
  if (typeof log.endTime === 'number') return log.endTime;
  if (log.endTime instanceof Date) return log.endTime.getTime();
  if (typeof log.endTime === 'object' && 'toDate' in log.endTime) {
    return (log.endTime as { toDate: () => Date }).toDate().getTime();
  }
  return getDriveStartDate(log.startTime)?.getTime() ?? null;
}

/** Advisors with low FSD-sub or missing feedback this week. */
export function CoachingQueue({ advisors, driveLogs, className }: CoachingQueueProps) {
  const rows = useMemo(() => {
    const { start, end } = weekBounds();
    const result: CoachRow[] = [];

    for (const adv of advisors) {
      const demos = driveLogs.filter((log) => {
        if (log.purpose !== 'Demo' || !log.endTime) return false;
        if (log.coPilot !== adv.name && log.advisorIn !== adv.name) return false;
        const t = logEndMs(log);
        return t != null && t >= start && t <= end;
      });
      if (demos.length < 2) continue;

      const fsdSubs = demos.filter(
        (l) => l.fsdSubscriptionAttached === 'Y' || l.fsdSubscribed,
      ).length;
      const withFeedback = demos.filter((l) => (l.feedback || '').trim().length > 0).length;
      const fsdSubRate = Math.round((fsdSubs / demos.length) * 100);
      const feedbackRate = Math.round((withFeedback / demos.length) * 100);

      const reasons: string[] = [];
      if (fsdSubRate < 25) reasons.push(`FSD-sub ${fsdSubRate}%`);
      if (feedbackRate < 40) reasons.push(`Feedback ${feedbackRate}%`);
      if (reasons.length === 0) continue;

      result.push({
        id: adv.id,
        name: adv.name,
        demos: demos.length,
        fsdSubRate,
        feedbackRate,
        reason: reasons.join(' · '),
      });
    }

    return result.sort((a, b) => a.fsdSubRate - b.fsdSubRate || a.feedbackRate - b.feedbackRate);
  }, [advisors, driveLogs]);

  if (rows.length === 0) return null;

  return (
    <Card className={cn('border-border/60', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
          Coaching queue
        </CardTitle>
        <CardDescription>
          This week - low FSD-sub attach or missing feedback. Coach before the weekend rush.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rows.slice(0, 8).map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.demos} demos · {row.reason}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Coach
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
