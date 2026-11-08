import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIntervalFromMs,
  findOverlappingSchedule,
  intervalsOverlap,
} from './schedule-overlap.ts';

describe('schedule overlap', () => {
  it('detects half-open interval overlap', () => {
    const a = buildIntervalFromMs(1000, 57);
    const b = buildIntervalFromMs(1000 + 30 * 60_000, 57);
    assert.equal(intervalsOverlap(a, b), true);
  });

  it('allows back-to-back bookings', () => {
    const a = buildIntervalFromMs(1000, 57);
    const b = buildIntervalFromMs(a.endMs, 57);
    assert.equal(intervalsOverlap(a, b), false);
  });

  it('flags overlapping open schedules for the same vehicle', () => {
    const candidate = buildIntervalFromMs(Date.parse('2026-01-15T10:00:00'), 57);
    const logs = [
      {
        id: 'a',
        vehicleId: 'v1',
        vehicleModel: 'Model Y',
        vehicleTrim: 'AWD',
        vehicleVin: 'DEMO1001',
        vehicleSeats: '5-seater',
        coPilot: 'Alice',
        purpose: 'Scheduled' as const,
        startTime: new Date('2026-01-15T10:30:00'),
        expectedDuration: 57,
        startBattery: 80,
      },
    ];
    assert.ok(findOverlappingSchedule(candidate, logs, 'v1'));
  });
});
