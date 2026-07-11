export interface VehicleTelemetry {
  vin: string;
  batteryLevel?: number;
  latitude?: number;
  longitude?: number;
  chargingState?: string;
  fetchedAt: number;
}

export interface TelemetryProvider {
  readonly name: 'manual' | 'fleet_api';
  isConfigured(): boolean;
  fetchVehicleTelemetry(vin: string): Promise<VehicleTelemetry | null>;
  fetchFleetTelemetry(vins: string[]): Promise<VehicleTelemetry[]>;
}
