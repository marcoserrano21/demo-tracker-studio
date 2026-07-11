import { NextRequest, NextResponse } from 'next/server';
import { getTelemetryProvider, isTeslaFleetConfigured } from '@/lib/tesla';

/**
 * GET /api/telemetry/sync?vins=VIN1,VIN2
 * POST /api/telemetry/sync  { vins: string[] }
 *
 * When TESLA_* env vars are unset, returns { configured: false }.
 * When configured, fetches live battery/GPS for the given VINs.
 * Client writes results to Firestore (no Admin SDK required).
 */
export async function GET(request: NextRequest) {
  if (!isTeslaFleetConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Tesla Fleet API credentials not set. Battery remains manual until partner approval.',
      results: [],
    });
  }

  const vinsParam = request.nextUrl.searchParams.get('vins') || '';
  const vins = vinsParam
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return syncTelemetry(vins);
}

export async function POST(request: NextRequest) {
  if (!isTeslaFleetConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'Tesla Fleet API credentials not set. Battery remains manual until partner approval.',
      results: [],
    });
  }

  let vins: string[] = [];
  try {
    const body = await request.json();
    vins = Array.isArray(body?.vins) ? body.vins.map(String) : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return syncTelemetry(vins);
}

async function syncTelemetry(vins: string[]) {
  if (vins.length === 0) {
    return NextResponse.json({
      configured: true,
      message: 'No VINs provided',
      results: [],
    });
  }

  const provider = getTelemetryProvider();
  try {
    const results = await provider.fetchFleetTelemetry(vins.slice(0, 25));
    return NextResponse.json({
      configured: true,
      provider: provider.name,
      results,
      syncedAt: Date.now(),
    });
  } catch (err) {
    console.error('[telemetry/sync]', err);
    return NextResponse.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : 'Telemetry sync failed',
        results: [],
      },
      { status: 502 },
    );
  }
}
