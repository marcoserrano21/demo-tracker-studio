'use client';

import { useMemo } from 'react';
import type { Advisor, DriveLog, Vehicle } from '@/lib/types';
import { buildMorningBrief } from '@/lib/ops-reports';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  Car,
  Play,
  AlertTriangle,
  Clock,
  Gauge,
  Sparkles,
  ArrowRight,
  Users,
} from 'lucide-react';

interface MorningBriefProps {
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  storeName: string;
  onNavigate?: (tab: string) => void;
  className?: string;
}

export default function MorningBrief({
  vehicles,
  driveLogs,
  advisors,
  storeName,
  onNavigate,
  className,
}: MorningBriefProps) {
  const brief = useMemo(
    () => buildMorningBrief({ vehicles, driveLogs, advisors }),
    [vehicles, driveLogs, advisors]
  );

  const stats = [
    { label: 'Available', value: brief.available, icon: Car, tone: 'text-emerald-500' },
    { label: 'On demo', value: brief.onDemo, icon: Play, tone: 'text-sky-500' },
    { label: 'Overdue', value: brief.overdue, icon: Clock, tone: 'text-red-500' },
    { label: 'Needs attention', value: brief.needsAttention, icon: AlertTriangle, tone: 'text-amber-500' },
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm',
        className
      )}
      aria-label="Manager morning brief"
    >
      <header className="border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Manager Morning Brief
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight">{storeName}</h2>
        <p className="text-sm text-muted-foreground">One screen to open the day.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:gap-3 sm:p-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/50 bg-background/80 px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <stat.icon className={cn('h-3.5 w-3.5', stat.tone)} aria-hidden />
              {stat.label}
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-t border-border/50 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            Today · FSD
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">{brief.fsdActivationRate}%</p>
              <p className="text-xs text-muted-foreground">Activation rate · {brief.demosToday} demos</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{brief.fsdSubRate}%</p>
              <p className="text-xs text-muted-foreground">FSD-sub attach</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Top advisors today
          </div>
          {brief.topAdvisors.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No demos logged yet today.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {brief.topAdvisors.map((row, i) => (
                <li key={row.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">
                    <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                    {row.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {row.demos} · {row.fsdSubs} FSD-sub
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-border/50 bg-primary/5 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              One action
            </p>
            <p className="mt-1 text-sm sm:text-base font-medium leading-snug">{brief.action}</p>
          </div>
          {onNavigate && (
            <Button
              type="button"
              className="shrink-0 rounded-xl"
              onClick={() => onNavigate('fleet')}
            >
              Go
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
