import type { Vehicle } from './types';

/** True when an On Demo vehicle has passed its expected return time. */
export function isOverdueVehicle(vehicle: Vehicle, now = Date.now()): boolean {
  if (vehicle.overdue) return true;
  if (vehicle.status !== 'On Demo' || !vehicle.driveStartedAt || !vehicle.expectedDuration) {
    return false;
  }
  return now > vehicle.driveStartedAt + vehicle.expectedDuration * 60 * 1000;
}

export function getOverdueVehicles(vehicles: Vehicle[], now = Date.now()): Vehicle[] {
  return vehicles.filter((v) => !v.sold && isOverdueVehicle(v, now));
}

/** Minutes past ETA (0 if not overdue). */
export function getOverdueMinutes(vehicle: Vehicle, now = Date.now()): number {
  if (!vehicle.driveStartedAt || !vehicle.expectedDuration) return 0;
  const end = vehicle.driveStartedAt + vehicle.expectedDuration * 60 * 1000;
  if (now <= end) return 0;
  return Math.floor((now - end) / 60000);
}
