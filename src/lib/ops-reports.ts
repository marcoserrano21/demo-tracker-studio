import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import type { Advisor, DriveLog, Vehicle } from './types';
import { getDriveStartDate } from './drive-log-utils';
import { isOverdueVehicle } from './overdue';

export interface MorningBriefAdvisorRow {
  id: string;
  name: string;
  demos: number;
  fsdSubs: number;
}

export interface MorningBriefData {
  available: number;
  onDemo: number;
  overdue: number;
  needsAttention: number;
  /** Completed demos today */
  demosToday: number;
  /** FSD activation rate today (0–100). Auto-logged demos count as activated. */
  fsdActivationRate: number;
  /** FSD subscription attach rate today among demos with Y/N answer (0–100). */
  fsdSubRate: number;
  topAdvisors: MorningBriefAdvisorRow[];
  /** Single recommended action for the manager. */
  action: string;
  actionTab?: 'fleet' | 'finish' | 'schedule' | 'analytics';
}

export function buildMorningBrief(params: {
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  now?: Date;
}): MorningBriefData {
  const now = params.now ?? new Date();
  const dayStart = startOfDay(now).getTime();
  const dayEnd = endOfDay(now).getTime();

  const fleet = params.vehicles.filter((v) => !v.sold);
  const available = fleet.filter((v) => v.status === 'Available').length;
  const onDemo = fleet.filter((v) => v.status === 'On Demo').length;
  const overdue = fleet.filter((v) => isOverdueVehicle(v, now.getTime())).length;
  const needsAttention = fleet.filter(
    (v) => v.status === 'Needs Attention' || isOverdueVehicle(v, now.getTime())
  ).length;

  const todayDemos = params.driveLogs.filter((log) => {
    if (log.purpose !== 'Demo' || !log.endTime) return false;
    const end =
      log.endTime instanceof Date
        ? log.endTime.getTime()
        : typeof log.endTime === 'number'
          ? log.endTime
          : (log.endTime as { toDate?: () => Date; seconds?: number })?.toDate?.()?.getTime?.() ??
            ((log.endTime as { seconds?: number }).seconds
              ? (log.endTime as { seconds: number }).seconds * 1000
              : getDriveStartDate(log.startTime)?.getTime());
    return end != null && end >= dayStart && end <= dayEnd;
  });

  const demosToday = todayDemos.length;
  const fsdActivatedCount = todayDemos.filter((log) => log.fsdActivated === true).length;
  const fsdActivationRate =
    demosToday > 0 ? Math.round((fsdActivatedCount / demosToday) * 100) : 0;

  const subAnswered = todayDemos.filter(
    (log) => log.fsdSubscriptionAttached === 'Y' || log.fsdSubscribed || log.fsdSubscriptionAttached === 'N'
  );
  const subYes = todayDemos.filter(
    (log) => log.fsdSubscriptionAttached === 'Y' || log.fsdSubscribed
  ).length;
  const fsdSubRate =
    subAnswered.length > 0 ? Math.round((subYes / Math.max(1, demosToday)) * 100) : 0;

  const byAdvisor = new Map<string, MorningBriefAdvisorRow>();
  for (const log of todayDemos) {
    const name = log.coPilot || log.advisorIn || 'Unknown';
    const advisor = params.advisors.find((a) => a.name === name);
    const id = advisor?.id ?? name;
    const row = byAdvisor.get(id) ?? { id, name, demos: 0, fsdSubs: 0 };
    row.demos += 1;
    if (log.fsdSubscriptionAttached === 'Y' || log.fsdSubscribed) row.fsdSubs += 1;
    byAdvisor.set(id, row);
  }

  const topAdvisors = [...byAdvisor.values()]
    .sort((a, b) => b.demos - a.demos || b.fsdSubs - a.fsdSubs || a.name.localeCompare(b.name))
    .slice(0, 3);

  let action = 'Floor looks calm — keep Find → Start → Finish humming.';
  let actionTab: MorningBriefData['actionTab'] = 'fleet';

  if (overdue > 0) {
    action = `${overdue} vehicle${overdue === 1 ? '' : 's'} overdue — open Finish and check them in now.`;
    actionTab = 'finish';
  } else if (needsAttention > 0) {
    action = `${needsAttention} need${needsAttention === 1 ? 's' : ''} attention — resolve issues before the next rush.`;
    actionTab = 'fleet';
  } else if (available === 0 && onDemo > 0) {
    action = 'No cars available — watch returns and prep the next Start.';
    actionTab = 'finish';
  } else if (demosToday > 0 && fsdSubRate < 20) {
    action = `FSD-sub attach is ${fsdSubRate}% today — coach the floor on Sales outcome logging.`;
    actionTab = 'analytics';
  } else if (available > 0 && demosToday === 0) {
    action = `${available} available — get the first demo of the day on the board.`;
    actionTab = 'fleet';
  }

  return {
    available,
    onDemo,
    overdue,
    needsAttention,
    demosToday,
    fsdActivationRate,
    fsdSubRate,
    topAdvisors,
    action,
    actionTab,
  };
}

export interface WeeklyStoreReportData {
  weekLabel: string;
  periodStart: Date;
  periodEnd: Date;
  demosCompleted: number;
  avgDurationMin: number;
  utilizationPct: number;
  overdueCount: number;
  demosPerAdvisor: number;
  fsdActivationRate: number;
  fsdSubRate: number;
  purchaseCount: number;
  topAdvisors: MorningBriefAdvisorRow[];
  feedbackCount: number;
}

export function buildWeeklyStoreReport(params: {
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  now?: Date;
}): WeeklyStoreReportData {
  const now = params.now ?? new Date();
  const periodStart = startOfWeek(now, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(now, { weekStartsOn: 1 });
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();

  const weekDemos = params.driveLogs.filter((log) => {
    if (log.purpose !== 'Demo' || !log.endTime) return false;
    const end =
      log.endTime instanceof Date
        ? log.endTime.getTime()
        : typeof log.endTime === 'number'
          ? log.endTime
          : (log.endTime as { toDate?: () => Date })?.toDate?.()?.getTime?.() ??
            ((log.endTime as { seconds?: number }).seconds
              ? (log.endTime as { seconds: number }).seconds * 1000
              : null);
    return end != null && end >= startMs && end <= endMs;
  });

  const demosCompleted = weekDemos.length;
  let durationSum = 0;
  let durationCount = 0;
  for (const log of weekDemos) {
    const start = getDriveStartDate(log.startTime)?.getTime();
    const end =
      log.endTime instanceof Date
        ? log.endTime.getTime()
        : typeof log.endTime === 'number'
          ? log.endTime
          : (log.endTime as { toDate?: () => Date })?.toDate?.()?.getTime?.();
    if (start != null && end != null && end > start) {
      durationSum += (end - start) / 60000;
      durationCount += 1;
    }
  }

  const fleetSize = Math.max(1, params.vehicles.filter((v) => !v.sold).length);
  // Rough utilization: demo-hours / (fleet * week business hours ~ 60h)
  const demoHours = durationSum / 60;
  const utilizationPct = Math.min(100, Math.round((demoHours / (fleetSize * 60)) * 100));

  const overdueCount = params.vehicles.filter((v) => isOverdueVehicle(v)).length;
  const advisorCount = Math.max(1, params.advisors.length);
  const demosPerAdvisor = Math.round((demosCompleted / advisorCount) * 10) / 10;

  const fsdActivated = weekDemos.filter((l) => l.fsdActivated === true).length;
  const fsdActivationRate =
    demosCompleted > 0 ? Math.round((fsdActivated / demosCompleted) * 100) : 0;
  const fsdSubs = weekDemos.filter(
    (l) => l.fsdSubscriptionAttached === 'Y' || l.fsdSubscribed
  ).length;
  const fsdSubRate = demosCompleted > 0 ? Math.round((fsdSubs / demosCompleted) * 100) : 0;
  const purchaseCount = weekDemos.filter((l) => l.customerPurchased).length;
  const feedbackCount = weekDemos.filter((l) => (l.feedback || '').trim().length > 0).length;

  const byAdvisor = new Map<string, MorningBriefAdvisorRow>();
  for (const log of weekDemos) {
    const name = log.coPilot || log.advisorIn || 'Unknown';
    const advisor = params.advisors.find((a) => a.name === name);
    const id = advisor?.id ?? name;
    const row = byAdvisor.get(id) ?? { id, name, demos: 0, fsdSubs: 0 };
    row.demos += 1;
    if (log.fsdSubscriptionAttached === 'Y' || log.fsdSubscribed) row.fsdSubs += 1;
    byAdvisor.set(id, row);
  }

  const topAdvisors = [...byAdvisor.values()]
    .sort((a, b) => b.demos - a.demos || b.fsdSubs - a.fsdSubs)
    .slice(0, 5);

  return {
    weekLabel: `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`,
    periodStart,
    periodEnd,
    demosCompleted,
    avgDurationMin: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    utilizationPct,
    overdueCount,
    demosPerAdvisor,
    fsdActivationRate,
    fsdSubRate,
    purchaseCount,
    topAdvisors,
    feedbackCount,
  };
}

export interface StoreCompareKpis {
  storeCode: string;
  storeName: string;
  isCurrent: boolean;
  /** Peer rows may be regional lite estimates when live data isn't loaded. */
  isEstimate: boolean;
  utilizationPct: number;
  overdueCount: number;
  demosPerAdvisor: number;
  fsdActivationRate: number;
  fsdSubRate: number;
  demosCompleted: number;
}

/** Stable 0–1 hash from store code (for deterministic peer lite estimates). */
function storeCodeUnit(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

export function buildStoreCompareKpis(params: {
  storeCode: string;
  storeName: string;
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  isCurrent?: boolean;
  now?: Date;
}): StoreCompareKpis {
  const weekly = buildWeeklyStoreReport({
    vehicles: params.vehicles,
    driveLogs: params.driveLogs,
    advisors: params.advisors,
    now: params.now,
  });

  return {
    storeCode: params.storeCode,
    storeName: params.storeName,
    isCurrent: params.isCurrent ?? false,
    isEstimate: false,
    utilizationPct: weekly.utilizationPct,
    overdueCount: weekly.overdueCount,
    demosPerAdvisor: weekly.demosPerAdvisor,
    fsdActivationRate: weekly.fsdActivationRate,
    fsdSubRate: weekly.fsdSubRate,
    demosCompleted: weekly.demosCompleted,
  };
}

/**
 * Deterministic peer snapshot for Regional lite when other stores aren't loaded.
 * Anchored to the current store's KPIs so the comparison stays realistic.
 */
export function buildPeerLiteKpis(
  peer: { code: string; name: string },
  baseline: StoreCompareKpis,
): StoreCompareKpis {
  const u = storeCodeUnit(peer.code);
  const utilDelta = Math.round((u - 0.5) * 16);
  const overdueDelta = Math.round((u - 0.4) * 4);
  const demosDelta = Math.round((u - 0.5) * 4 * 10) / 10;
  const fsdActDelta = Math.round((u - 0.45) * 20);
  const fsdSubDelta = Math.round((u - 0.55) * 18);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  return {
    storeCode: peer.code,
    storeName: peer.name,
    isCurrent: false,
    isEstimate: true,
    utilizationPct: clamp(baseline.utilizationPct + utilDelta, 5, 95),
    overdueCount: clamp(baseline.overdueCount + overdueDelta, 0, 12),
    demosPerAdvisor: clamp(
      Math.round((baseline.demosPerAdvisor + demosDelta) * 10) / 10,
      0.5,
      40,
    ),
    fsdActivationRate: clamp(baseline.fsdActivationRate + fsdActDelta, 0, 100),
    fsdSubRate: clamp(baseline.fsdSubRate + fsdSubDelta, 0, 100),
    demosCompleted: clamp(
      Math.round(baseline.demosCompleted * (0.75 + u * 0.5)),
      0,
      999,
    ),
  };
}

export function buildRegionalLiteRows(params: {
  storeCode: string;
  storeName: string;
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  peers: Array<{ code: string; name: string }>;
  now?: Date;
}): StoreCompareKpis[] {
  const current = buildStoreCompareKpis({
    storeCode: params.storeCode,
    storeName: params.storeName,
    vehicles: params.vehicles,
    driveLogs: params.driveLogs,
    advisors: params.advisors,
    isCurrent: true,
    now: params.now,
  });

  const peers = params.peers.slice(0, 2).map((peer) => buildPeerLiteKpis(peer, current));
  return [current, ...peers];
}
