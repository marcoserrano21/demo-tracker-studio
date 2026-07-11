import { isTeslaFleetConfigured, getTeslaFleetConfig } from './config';
import { TeslaFleetClient } from './client';
import type { TelemetryProvider, VehicleTelemetry } from './types';

/** No-op provider when Fleet credentials are absent — UI stays on manual battery. */
class ManualTelemetryProvider implements TelemetryProvider {
  readonly name = 'manual' as const;

  isConfigured(): boolean {
    return false;
  }

  async fetchVehicleTelemetry(_vin: string): Promise<VehicleTelemetry | null> {
    return null;
  }

  async fetchFleetTelemetry(_vins: string[]): Promise<VehicleTelemetry[]> {
    return [];
  }
}

class FleetApiTelemetryProvider implements TelemetryProvider {
  readonly name = 'fleet_api' as const;
  private client: TeslaFleetClient;

  constructor() {
    this.client = new TeslaFleetClient(getTeslaFleetConfig()!);
  }

  isConfigured(): boolean {
    return true;
  }

  fetchVehicleTelemetry(vin: string): Promise<VehicleTelemetry | null> {
    return this.client.fetchVehicleTelemetry(vin);
  }

  fetchFleetTelemetry(vins: string[]): Promise<VehicleTelemetry[]> {
    return this.client.fetchFleetTelemetry(vins);
  }
}

export function getTelemetryProvider(): TelemetryProvider {
  if (isTeslaFleetConfigured()) {
    return new FleetApiTelemetryProvider();
  }
  return new ManualTelemetryProvider();
}

export { isTeslaFleetConfigured } from './config';
