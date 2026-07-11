import { Timestamp } from 'firebase/firestore';
import type { FsdOrderRecord, FsdOrderSource } from './types';

function toDate(value: FsdOrderRecord['orderedAt']): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

export function filterFsdOrdersByDateRange(
  records: FsdOrderRecord[],
  start: Date,
  end: Date,
): FsdOrderRecord[] {
  return records.filter((r) => {
    const d = toDate(r.orderedAt);
    return d >= start && d <= end;
  });
}

export function getFsdTakeRate(records: FsdOrderRecord[]): number {
  if (records.length === 0) return 0;
  const subscribed = records.filter((r) => r.fsdSubscribed).length;
  return parseFloat(((subscribed / records.length) * 100).toFixed(1));
}

export function getFsdSubscribedCount(records: FsdOrderRecord[]): number {
  return records.filter((r) => r.fsdSubscribed).length;
}

export interface FsdWeeklyTakeRateRow {
  week: string;
  takeRate: number;
  total: number;
  subscribed: number;
}

/** Weekly take-rate bars for the selected period (ISO week label). */
export function getFsdWeeklyTakeRateChartData(records: FsdOrderRecord[]): FsdWeeklyTakeRateRow[] {
  const buckets = new Map<string, { total: number; subscribed: number; sortKey: number }>();

  records.forEach((r) => {
    const d = toDate(r.orderedAt);
    const weekStart = new Date(d);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = buckets.get(key) ?? { total: 0, subscribed: 0, sortKey: weekStart.getTime() };
    existing.total += 1;
    if (r.fsdSubscribed) existing.subscribed += 1;
    buckets.set(key, existing);
  });

  return Array.from(buckets.entries())
    .map(([week, v]) => ({
      week,
      total: v.total,
      subscribed: v.subscribed,
      takeRate: v.total > 0 ? parseFloat(((v.subscribed / v.total) * 100).toFixed(1)) : 0,
      sortKey: v.sortKey,
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _s, ...row }) => row);
}

export interface FsdSourceBreakdownRow {
  source: FsdOrderSource;
  label: string;
  total: number;
  subscribed: number;
  takeRate: number;
}

const SOURCE_LABELS: Record<FsdOrderSource, string> = {
  order_placement: 'Order placement',
  follow_up_call: 'Follow-up call',
  demo_checkin: 'Demo check-in',
};

export function getFsdSourceBreakdown(records: FsdOrderRecord[]): FsdSourceBreakdownRow[] {
  const sources: FsdOrderSource[] = ['order_placement', 'follow_up_call', 'demo_checkin'];
  return sources
    .map((source) => {
      const subset = records.filter((r) => r.source === source);
      const subscribed = subset.filter((r) => r.fsdSubscribed).length;
      return {
        source,
        label: SOURCE_LABELS[source],
        total: subset.length,
        subscribed,
        takeRate: subset.length > 0 ? parseFloat(((subscribed / subset.length) * 100).toFixed(1)) : 0,
      };
    })
    .filter((row) => row.total > 0);
}

export interface FsdAdvisorAttachRow {
  advisor: string;
  total: number;
  subscribed: number;
  takeRate: number;
}

export function getFsdAdvisorAttachChartData(records: FsdOrderRecord[]): FsdAdvisorAttachRow[] {
  const byAdvisor = new Map<string, { total: number; subscribed: number }>();
  records.forEach((r) => {
    const name = r.advisorName || 'Unassigned';
    const existing = byAdvisor.get(name) ?? { total: 0, subscribed: 0 };
    existing.total += 1;
    if (r.fsdSubscribed) existing.subscribed += 1;
    byAdvisor.set(name, existing);
  });

  return Array.from(byAdvisor.entries())
    .map(([advisor, v]) => ({
      advisor,
      total: v.total,
      subscribed: v.subscribed,
      takeRate: v.total > 0 ? parseFloat(((v.subscribed / v.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.subscribed - a.subscribed || b.takeRate - a.takeRate)
    .slice(0, 12);
}

/** Coach moment copy for Analytics. */
export function getFsdCoachMoment(records: FsdOrderRecord[]): string | null {
  if (records.length === 0) return null;

  const followUps = records.filter((r) => r.source === 'follow_up_call');
  const followUpConverted = followUps.filter((r) => r.fsdSubscribed).length;
  const checkinAttaches = records.filter(
    (r) => r.source === 'demo_checkin' && r.fsdSubscribed,
  ).length;

  const parts: string[] = [];
  if (followUps.length > 0) {
    const rate = Math.round((followUpConverted / followUps.length) * 100);
    parts.push(`Follow-up calls converted ${rate}%`);
  }
  if (checkinAttaches > 0) {
    parts.push(`check-in keywords caught ${checkinAttaches} attach${checkinAttaches === 1 ? '' : 'es'}`);
  }
  if (parts.length === 0) {
    const rate = getFsdTakeRate(records);
    return `FSD take rate is ${rate}% across ${records.length} tracked order${records.length === 1 ? '' : 's'}.`;
  }
  return parts.join(' · ') + '.';
}
