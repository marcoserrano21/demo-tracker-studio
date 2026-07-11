/**
 * Tesla Fleet API env config.
 * Leave unset until partner approval — the app falls back to manual battery entry.
 */

export interface TeslaFleetConfig {
  clientId: string;
  clientSecret: string;
  audience: string;
  refreshToken: string;
}

export function getTeslaFleetConfig(): TeslaFleetConfig | null {
  const clientId = process.env.TESLA_CLIENT_ID?.trim();
  const clientSecret = process.env.TESLA_CLIENT_SECRET?.trim();
  const refreshToken = process.env.TESLA_REFRESH_TOKEN?.trim();
  const audience =
    process.env.TESLA_AUDIENCE?.trim() ||
    'https://fleet-api.prd.na.vn.cloud.tesla.com';

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, audience, refreshToken };
}

export function isTeslaFleetConfigured(): boolean {
  return getTeslaFleetConfig() !== null;
}
