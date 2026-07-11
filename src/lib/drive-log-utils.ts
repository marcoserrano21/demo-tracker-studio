import { Timestamp } from 'firebase/firestore';
import type { DriveLog, Vehicle } from './types';

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
