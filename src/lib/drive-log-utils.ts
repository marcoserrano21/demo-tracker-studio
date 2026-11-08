import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import type { DriveLog, Vehicle } from './types';

/**
 * Check-in battery default from checkout level by elapsed drive time:
 * - under 15 minutes → −2%
 * - 15+ minutes → −5%
 * Clamped to 0–100. Prefill only - advisors can still edit.
 */
export const DEMO_BATTERY_SHORT_DRIVE_MINUTES = 15;
export const DEMO_BATTERY_DROP_SHORT_PERCENT = 2;
export const DEMO_BATTERY_DROP_PERCENT = 5;

export function getDriveStartDate(startTime: DriveLog['startTime'] | undefined): Date | null {
  if (startTime == null) return null;
  if (startTime instanceof Timestamp) return startTime.toDate();
  if (startTime instanceof Date) return startTime;
  if (typeof startTime === 'number') return new Date(startTime);
  if (typeof startTime === 'object' && 'toDate' in startTime && typeof (startTime as Timestamp).toDate === 'function') {
    return (startTime as Timestamp).toDate();
  }
  if (typeof startTime === 'object' && 'seconds' in startTime) {
    return new Date((startTime as { seconds: number }).seconds * 1000);
  }
  return null;
}

/** Percentage-point drop for a demo given elapsed minutes since checkout/start. */
export function getDemoBatteryDropPercent(elapsedMinutes: number | null | undefined): number {
  if (elapsedMinutes == null || !Number.isFinite(elapsedMinutes)) {
    return DEMO_BATTERY_DROP_PERCENT;
  }
  return elapsedMinutes < DEMO_BATTERY_SHORT_DRIVE_MINUTES
    ? DEMO_BATTERY_DROP_SHORT_PERCENT
    : DEMO_BATTERY_DROP_PERCENT;
}

export function estimateDemoEndBattery(
  startBattery: number,
  options?: { startTime?: DriveLog['startTime']; now?: Date | number },
): number {
  const start = Number.isFinite(startBattery) ? startBattery : 0;
  const startDate = options?.startTime != null ? getDriveStartDate(options.startTime) : null;
  const nowMs =
    options?.now instanceof Date
      ? options.now.getTime()
      : typeof options?.now === 'number'
        ? options.now
        : Date.now();
  const elapsedMinutes =
    startDate != null ? Math.max(0, (nowMs - startDate.getTime()) / 60_000) : null;
  const drop = getDemoBatteryDropPercent(elapsedMinutes);
  return Math.max(0, Math.min(100, Math.round(start - drop)));
}

/** Earliest you may Start a scheduled drive (minutes before booked time). */
export const SCHEDULE_EARLY_START_MINUTES = 15;
/** Grace window after booked time before Start is considered past-due. */
export const SCHEDULE_LATE_START_GRACE_MINUTES = 15;

/**
 * Scheduled drives may only be started in the early window:
 * from 15 minutes before the booked time through 15 minutes after.
 * Outside that window → too early (or past due).
 */
export function canStartScheduledDrive(
  startTime: DriveLog['startTime'] | undefined,
  now = Date.now(),
): boolean {
  const startMs = getDriveStartDate(startTime)?.getTime();
  if (startMs == null) return false;
  const msUntil = startMs - now;
  const earlyMs = SCHEDULE_EARLY_START_MINUTES * 60_000;
  const lateMs = SCHEDULE_LATE_START_GRACE_MINUTES * 60_000;
  return msUntil <= earlyMs && msUntil >= -lateMs;
}

/** True when a booking exists but Start-from-Schedule is still locked (more than 15 min before). */
export function isScheduledDriveTooEarly(
  startTime: DriveLog['startTime'] | undefined,
  now = Date.now(),
): boolean {
  const startMs = getDriveStartDate(startTime)?.getTime();
  if (startMs == null) return false;
  return startMs - now > SCHEDULE_EARLY_START_MINUTES * 60_000;
}

/**
 * Fleet reserve window: block walk-in Start only in the 15 minutes BEFORE the booking.
 * More than 15 min out → car stays checkout-able. Inside the window → show Scheduled block.
 */
export function isWithinScheduleReserveWindow(
  startTime: DriveLog['startTime'] | undefined,
  now = Date.now(),
): boolean {
  const startMs = getDriveStartDate(startTime)?.getTime();
  if (startMs == null) return false;
  const msUntil = startMs - now;
  return msUntil > 0 && msUntil <= SCHEDULE_EARLY_START_MINUTES * 60_000;
}

export function isScheduledDrivePastDue(
  startTime: DriveLog['startTime'] | undefined,
  now = Date.now(),
): boolean {
  const startMs = getDriveStartDate(startTime)?.getTime();
  if (startMs == null) return false;
  return now - startMs > SCHEDULE_LATE_START_GRACE_MINUTES * 60_000;
}

/** Soonest upcoming scheduled drive for a vehicle (not yet ended). */
export function findUpcomingSchedule(
  vehicleId: string,
  scheduledDrives: DriveLog[] | undefined,
  now = Date.now(),
): DriveLog | undefined {
  if (!scheduledDrives?.length) return undefined;

  const future = scheduledDrives
    .filter((drive) => {
      if (drive.vehicleId !== vehicleId || drive.endTime) return false;
      const start = getDriveStartDate(drive.startTime)?.getTime();
      return start != null && start > now;
    })
    .sort((a, b) => {
      const timeA = getDriveStartDate(a.startTime)?.getTime() ?? 0;
      const timeB = getDriveStartDate(b.startTime)?.getTime() ?? 0;
      return timeA - timeB;
    });

  return future[0];
}

/** Any open schedule for a vehicle (soonest by start time) - for badge dates on Find/Start. */
export function findVehicleSchedule(
  vehicleId: string,
  scheduledDrives: DriveLog[] | undefined,
): DriveLog | undefined {
  if (!scheduledDrives?.length) return undefined;

  const open = scheduledDrives
    .filter((drive) => drive.vehicleId === vehicleId && !drive.endTime)
    .sort((a, b) => {
      const timeA = getDriveStartDate(a.startTime)?.getTime() ?? 0;
      const timeB = getDriveStartDate(b.startTime)?.getTime() ?? 0;
      return timeA - timeB;
    });

  return open[0];
}

/** Compact label for Scheduled badges: "Jul 29 · 2:00 PM". */
export function formatScheduleBadgeDetail(startTime: DriveLog['startTime'] | undefined): string | undefined {
  const date = getDriveStartDate(startTime);
  if (!date) return undefined;
  return format(date, 'MMM d · h:mm a');
}

/** Resolve the in-progress drive for a vehicle (by currentDriveId, then by active log). */
export function findActiveDriveLog(
  vehicle: Vehicle,
  driveLogs: DriveLog[] | undefined,
): DriveLog | undefined {
  if (!driveLogs?.length) return undefined;

  if (vehicle.currentDriveId) {
    const byId = driveLogs.find(
      (log) => log.id === vehicle.currentDriveId && !log.endTime,
    );
    if (byId) return byId;
  }

  return driveLogs.find(
    (log) =>
      log.vehicleId === vehicle.id &&
      !log.endTime &&
      log.purpose !== 'Scheduled',
  );
}
