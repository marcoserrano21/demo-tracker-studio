import { getDriveStartDate } from './drive-log-utils';
import type { DriveLog } from './types';

export type IntervalMs = { startMs: number; endMs: number };

export function normalizeDriveInterval(
  startTime: DriveLog['startTime'],
  durationMinutes: number,
): IntervalMs | null {
  const start = getDriveStartDate(startTime);
  if (!start || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  const startMs = start.getTime();
  const endMs = startMs + durationMinutes * 60_000;
  return { startMs, endMs };
}

export function buildIntervalFromMs(startMs: number, durationMinutes: number): IntervalMs {
  return { startMs, endMs: startMs + durationMinutes * 60_000 };
}

/** Half-open overlap: [a.start, a.end) intersects [b.start, b.end). */
export function intervalsOverlap(a: IntervalMs, b: IntervalMs): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function findOverlappingSchedule(
  candidate: IntervalMs,
  openSchedules: DriveLog[],
  vehicleId: string,
  excludeLogId?: string,
): DriveLog | undefined {
  return openSchedules.find((log) => {
    if (log.vehicleId !== vehicleId || log.endTime) return false;
    if (excludeLogId && log.id === excludeLogId) return false;
  if (log.purpose !== 'Scheduled') return false;
    const existing = normalizeDriveInterval(log.startTime, log.expectedDuration ?? 0);
    if (!existing) return false;
    return intervalsOverlap(candidate, existing);
  });
}
