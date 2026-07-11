import { getTeslaFleetConfig, type TeslaFleetConfig } from './config';
import { mapVehicleDataToTelemetry } from './map-telemetry';
import type { VehicleTelemetry } from './types';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: TeslaFleetConfig): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const tokenUrl = 'https://auth.tesla.com/oauth2/v3/token';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tesla OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };

  return json.access_token;
}

/**
 * Live Fleet API client. Requires TESLA_* env vars.
 * Uses vehicle_data with charge_state + drive_state (+ location_data).
 */
export class TeslaFleetClient {
  constructor(private readonly config: TeslaFleetConfig = getTeslaFleetConfig()!) {
    if (!this.config) {
      throw new Error('Tesla Fleet API is not configured');
    }
  }

  async fetchVehicleTelemetry(vin: string): Promise<VehicleTelemetry | null> {
    const token = await getAccessToken(this.config);
    const base = this.config.audience.replace(/\/$/, '');
    const url = `${base}/api/1/vehicles/${encodeURIComponent(vin)}/vehicle_data?endpoints=charge_state%3Bdrive_state&location_data=true`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 408) {
      // Vehicle asleep — caller may wake and retry later
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tesla vehicle_data failed for ${vin} (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    return mapVehicleDataToTelemetry(vin, json);
  }

  async fetchFleetTelemetry(vins: string[]): Promise<VehicleTelemetry[]> {
    const results: VehicleTelemetry[] = [];
    for (const vin of vins) {
      try {
        const telemetry = await this.fetchVehicleTelemetry(vin);
        if (telemetry) results.push(telemetry);
      } catch (err) {
        console.error(`[TeslaFleet] Failed for ${vin}:`, err);
      }
    }
    return results;
  }
}
