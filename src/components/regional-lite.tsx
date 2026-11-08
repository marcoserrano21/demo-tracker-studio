'use client';

import { useMemo, useState } from 'react';
import type { Advisor, DriveLog, Vehicle } from '@/lib/types';
import { getRegionalPeerStores, getRegionLabel, stores as allStores } from '@/lib/data';
import {
  buildPeerLiteKpis,
  buildStoreCompareKpis,
  type StoreCompareKpis,
} from '@/lib/ops-reports';
import { useRegionalPeers } from '@/hooks/use-regional-peers';
import { shouldUseLocalDatastore } from '@/lib/local-demo/config';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import {
  MapPinned,
  TrendingUp,
  AlertTriangle,
  Users,
  Gauge,
  Sparkles,
  Check,
  type LucideIcon,
} from 'lucide-react';

interface RegionalLiteProps {
  storeCode: string;
  storeName: string;
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  className?: string;
}

const METRICS: Array<{
  key: keyof Pick<
    StoreCompareKpis,
    'utilizationPct' | 'overdueCount' | 'demosPerAdvisor' | 'fsdActivationRate' | 'fsdSubRate'
  >;
  label: string;
  format: (n: number) => string;
  /** Higher is better for highlighting, except overdue. */
  higherIsBetter: boolean;
  icon: LucideIcon;
}> = [
  {
    key: 'utilizationPct',
    label: 'Utilization',
    format: (n) => `${n}%`,
    higherIsBetter: true,
    icon: TrendingUp,
  },
  {
    key: 'overdueCount',
    label: 'Overdue',
    format: (n) => String(n),
    higherIsBetter: false,
    icon: AlertTriangle,
  },
  {
    key: 'demosPerAdvisor',
    label: 'Demos / advisor',
    format: (n) => String(n),
    higherIsBetter: true,
    icon: Users,
  },
  {
    key: 'fsdActivationRate',
    label: 'FSD activation',
    format: (n) => `${n}%`,
    higherIsBetter: true,
    icon: Gauge,
  },
  {
    key: 'fsdSubRate',
    label: 'FSD-sub rate',
    format: (n) => `${n}%`,
    higherIsBetter: true,
    icon: Sparkles,
  },
];

function bestIndex(rows: StoreCompareKpis[], key: (typeof METRICS)[number]['key'], higherIsBetter: boolean) {
  let best = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i][key];
    const b = rows[best][key];
    if (higherIsBetter ? a > b : a < b) best = i;
  }
  return best;
}

export default function RegionalLite({
  storeCode,
  storeName,
  vehicles,
  driveLogs,
  advisors,
  className,
}: RegionalLiteProps) {
  const regionLabel = getRegionLabel(storeCode);
  const defaultPeers = useMemo(() => getRegionalPeerStores(storeCode, 2), [storeCode]);

  const peerOptions = useMemo(() => {
    const current = allStores.find((s) => s.code === storeCode);
    const pool = current
      ? allStores.filter((s) => s.region === current.region && s.code !== storeCode)
      : allStores.filter((s) => s.code !== storeCode);
    return pool.length > 0 ? pool : allStores.filter((s) => s.code !== storeCode);
  }, [storeCode]);

  const [peerA, setPeerA] = useState(defaultPeers[0]?.code ?? peerOptions[0]?.code ?? '');
  const [peerB, setPeerB] = useState(defaultPeers[1]?.code ?? peerOptions[1]?.code ?? peerOptions[0]?.code ?? '');

  const selectedPeers = useMemo(() => {
    const codes = [peerA, peerB].filter(Boolean);
    const unique = [...new Set(codes)].slice(0, 2);
    return unique
      .map((code) => allStores.find((s) => s.code === code))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ code: s.code, name: s.name }));
  }, [peerA, peerB]);

  const peerCodes = useMemo(() => selectedPeers.map((p) => p.code), [selectedPeers]);
  const skipLivePeers = shouldUseLocalDatastore();
  const { data: livePeers, loading: peersLoading } = useRegionalPeers(skipLivePeers ? [] : peerCodes);

  const rows = useMemo(() => {
    const current = buildStoreCompareKpis({
      storeCode,
      storeName,
      vehicles,
      driveLogs,
      advisors,
      isCurrent: true,
    });

    const peers = selectedPeers.map((peer) => {
      const live = livePeers[peer.code];
      if (live?.hasLiveData) {
        return buildStoreCompareKpis({
          storeCode: peer.code,
          storeName: peer.name,
          vehicles: live.vehicles,
          driveLogs: live.driveLogs,
          advisors: live.advisors.length > 0 ? live.advisors : advisors,
          isCurrent: false,
        });
      }
      return buildPeerLiteKpis(peer, current);
    });

    return [current, ...peers];
  }, [storeCode, storeName, vehicles, driveLogs, advisors, selectedPeers, livePeers]);

  const anyLivePeers = rows.some((r) => !r.isCurrent && !r.isEstimate);
  const anyEstimates = rows.some((r) => r.isEstimate);

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm',
        className
      )}
      aria-label="Regional lite store comparison"
    >
      <header className="border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Regional lite
          </p>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary shrink-0" aria-hidden />
            {regionLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare 2–3 stores: utilization, overdue, demos/advisor, FSD activation, FSD-sub.
            {peersLoading ? ' Loading peer stores…' : null}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground min-w-[10rem] flex-1">
            Peer store A
            <select
              className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground"
              value={peerA}
              onChange={(e) => setPeerA(e.target.value)}
            >
              {peerOptions.map((s) => (
                <option key={s.code} value={s.code} disabled={s.code === peerB}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground min-w-[10rem] flex-1">
            Peer store B
            <select
              className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground"
              value={peerB}
              onChange={(e) => setPeerB(e.target.value)}
            >
              {peerOptions.map((s) => (
                <option key={`b-${s.code}`} value={s.code} disabled={s.code === peerA}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-10"
            onClick={() => {
              setPeerA(defaultPeers[0]?.code ?? peerOptions[0]?.code ?? '');
              setPeerB(defaultPeers[1]?.code ?? peerOptions[1]?.code ?? '');
            }}
          >
            Reset peers
          </Button>
        </div>
      </header>

      {/* Mobile cards */}
      <div className="grid gap-3 p-4 sm:hidden">
        {rows.map((row) => (
          <div
            key={row.storeCode}
            className={cn(
              'rounded-xl border p-3 space-y-2',
              row.isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/20'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold truncate">{row.storeName}</p>
              <div className="flex gap-1 shrink-0">
                {row.isCurrent && <Badge variant="default">You</Badge>}
                {row.isEstimate ? (
                  <Badge variant="outline" className="text-[10px]">
                    Est.
                  </Badge>
                ) : !row.isCurrent ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Live
                  </Badge>
                ) : null}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {METRICS.map((m) => (
                <div key={m.key}>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</dt>
                  <dd className="font-bold tabular-nums">{m.format(row[m.key] as number)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop comparison table */}
      <div className="hidden sm:block overflow-x-auto p-4 sm:p-5">
        <table className="w-full min-w-[520px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="py-2 pr-3 font-medium text-muted-foreground">Metric</th>
              {rows.map((row) => (
                <th key={row.storeCode} className="py-2 px-2 font-semibold">
                  <div className="flex flex-col gap-1">
                    <span className={cn(row.isCurrent && 'text-primary')}>{row.storeName}</span>
                    <span className="flex flex-wrap gap-1">
                      {row.isCurrent && (
                        <Badge variant="default" className="text-[10px] w-fit">
                          You
                        </Badge>
                      )}
                      {row.isEstimate ? (
                        <Badge variant="outline" className="text-[10px] w-fit">
                          Regional est.
                        </Badge>
                      ) : !row.isCurrent ? (
                        <Badge variant="secondary" className="text-[10px] w-fit">
                          Live data
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const winner = bestIndex(rows, metric.key, metric.higherIsBetter);
              const Icon = metric.icon;
              return (
                <tr key={metric.key} className="border-b border-border/30 last:border-0">
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {metric.label}
                    </span>
                  </td>
                  {rows.map((row, idx) => {
                    const value = row[metric.key] as number;
                    const isBest = idx === winner && rows.length > 1;
                    return (
                      <td
                        key={`${row.storeCode}-${metric.key}`}
                        className={cn(
                          'py-3 px-2 tabular-nums font-semibold',
                          isBest && 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {metric.format(value)}
                          {isBest && <Check className="h-3.5 w-3.5" aria-hidden />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Your store uses live data.
          {anyLivePeers
            ? ' Peer stores marked Live were loaded from Firestore (capped query).'
            : null}
          {anyEstimates
            ? ' Peer stores marked Regional est. use lite estimates until multi-store sync returns data.'
            : null}
        </p>
      </div>
    </section>
  );
}
