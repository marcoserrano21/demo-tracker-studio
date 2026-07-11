import type { VehicleTelemetry } from './types';

/**
 * Maps Tesla Fleet API vehicle_data payload to normalized telemetry.
 * Expects charge_state + drive_state (with location_data when available).
 */
export function mapVehicleDataToTelemetry(
  vin: string,
  payload: unknown,
): VehicleTelemetry | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const response = (root.response ?? root) as Record<string, unknown>;
  const chargeState = (response.charge_state ?? {}) as Record<string, unknown>;
  const driveState = (response.drive_state ?? {}) as Record<string, unknown>;

  const batteryRaw = chargeState.battery_level ?? chargeState.usable_battery_level;
  const batteryLevel =
    typeof batteryRaw === 'number'
      ? Math.round(Math.min(100, Math.max(0, batteryRaw)))
      : undefined;

  const lat =
    typeof driveState.latitude === 'number'
      ? driveState.latitude
      : typeof driveState.corrected_latitude === 'number'
        ? driveState.corrected_latitude
        : undefined;
  const lng =
    typeof driveState.longitude === 'number'
      ? driveState.longitude
      : typeof driveState.corrected_longitude === 'number'
        ? driveState.corrected_longitude
        : undefined;

  if (batteryLevel === undefined && lat === undefined && lng === undefined) {
    return null;
  }

  return {
    vin,
    batteryLevel,
    latitude: lat,
    longitude: lng,
    chargingState:
      typeof chargeState.charging_state === 'string'
        ? chargeState.charging_state
        : undefined,
    fetchedAt: Date.now(),
  };
}
