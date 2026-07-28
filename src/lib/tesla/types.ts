export interface VehicleTelemetry {
  vin: string;
  batteryLevel?: number;
  latitude?: number;
  longitude?: number;
  chargingState?: string;
  /** Best-effort: autopilot/FSD engaged signal from vehicle_data when present. */
  fsdActive?: boolean;
  fetchedAt: number;
}

export interface TelemetryProvider {
  readonly name: 'manual' | 'fleet_api';
  isConfigured(): boolean;
  fetchVehicleTelemetry(vin: string): Promise<VehicleTelemetry | null>;
  fetchFleetTelemetry(vins: string[]): Promise<VehicleTelemetry[]>;
}
