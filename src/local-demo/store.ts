'use client';

import { create } from 'zustand';
import type { Advisor, DriveLog, FsdOrderRecord, StoreSettings, Vehicle } from '@/lib/types';
import { DEFAULT_STORE_SETTINGS } from '@/lib/types';
import { DEMO_STORE_CODE } from '@/lib/demo-store';
import { buildLocalDemoFixture } from '@/lib/demo-fixture';
import {
  buildIntervalFromMs,
  findOverlappingSchedule,
  normalizeDriveInterval,
} from '@/lib/schedule-overlap';
import { getDriveStartDate } from '@/lib/drive-log-utils';
import { Timestamp } from 'firebase/firestore';

type LocalDemoState = {
  storeCode: string;
  advisors: Advisor[];
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  fsdOrders: FsdOrderRecord[];
  settings: StoreSettings;
  resetFixture: () => void;
  setAdvisors: (advisors: Advisor[]) => void;
  patchAdvisor: (advisorId: string, patch: Partial<Advisor>) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  patchVehicle: (update: Partial<Vehicle> & { id: string }) => void;
  openSchedulesForVehicle: (vehicleId: string) => DriveLog[];
  assertNoScheduleOverlap: (
    vehicleId: string,
    startMs: number,
    durationMinutes: number,
    excludeLogId?: string,
  ) => void;
  scheduleDrive: (payload: {
    vehicle: Vehicle;
    scheduleTime: Date;
    durationMinutes: number;
    coPilot: string;
    startBattery: number;
  }) => string;
  checkoutNow: (payload: {
    vehicle: Vehicle;
    coPilot: string;
    purpose: 'Demo' | 'Charging' | 'Other';
    durationMinutes: number;
    battery: number;
    feedback?: string;
  }) => string;
  completeCharging: (vehicleId: string, endBattery: number) => void;
  completeActiveDrive: (payload: {
    vehicle: Vehicle;
    driveLogId: string;
    vehiclePatch: Partial<Vehicle>;
    drivePatch: Partial<DriveLog>;
    newFsdOrder?: FsdOrderRecord;
  }) => void;
  getSettings: () => StoreSettings;
};

function nextLocalId(prefix: string, logs: DriveLog[]): string {
  return `${prefix}-${Date.now()}-${logs.length}`;
}

const seed = buildLocalDemoFixture(DEMO_STORE_CODE);

export const useLocalDemoStore = create<LocalDemoState>((set, get) => ({
  storeCode: seed.storeCode,
  advisors: seed.advisors,
  vehicles: seed.vehicles,
  driveLogs: seed.driveLogs,
  fsdOrders: seed.fsdOrders,
  settings: DEFAULT_STORE_SETTINGS,

  resetFixture: () => {
    const fresh = buildLocalDemoFixture(DEMO_STORE_CODE);
    set({
      storeCode: fresh.storeCode,
      advisors: fresh.advisors,
      vehicles: fresh.vehicles,
      driveLogs: fresh.driveLogs,
      fsdOrders: fresh.fsdOrders,
      settings: DEFAULT_STORE_SETTINGS,
    });
  },

  setAdvisors: (advisors) => set({ advisors }),

  patchAdvisor: (advisorId, patch) =>
    set((state) => ({
      advisors: state.advisors.map((a) => (a.id === advisorId ? { ...a, ...patch } : a)),
    })),

  setVehicles: (vehicles) => set({ vehicles }),

  patchVehicle: (update) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === update.id ? { ...v, ...update } : v)),
    })),

  openSchedulesForVehicle: (vehicleId) =>
    get().driveLogs.filter(
      (log) => log.vehicleId === vehicleId && log.purpose === 'Scheduled' && !log.endTime,
    ),

  assertNoScheduleOverlap: (vehicleId, startMs, durationMinutes, excludeLogId) => {
    const candidate = buildIntervalFromMs(startMs, durationMinutes);
    const overlap = findOverlappingSchedule(
      candidate,
      get().driveLogs,
      vehicleId,
      excludeLogId,
    );
    if (overlap) {
      throw new Error(
        'This vehicle already has a scheduled drive overlapping that time. Pick another slot.',
      );
    }
  },

  scheduleDrive: ({ vehicle, scheduleTime, durationMinutes, coPilot, startBattery }) => {
    get().assertNoScheduleOverlap(vehicle.id, scheduleTime.getTime(), durationMinutes);
    const id = nextLocalId('demo-log-sched', get().driveLogs);
    const newLog: DriveLog = {
      id,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      vehicleTrim: vehicle.trim,
      vehicleVin: vehicle.vin,
      vehicleSeats: vehicle.seats,
      coPilot,
      purpose: 'Scheduled',
      startTime: Timestamp.fromDate(scheduleTime),
      expectedDuration: durationMinutes,
      startBattery,
      feedback: '',
    };

    set((state) => {
      const vehicles =
        vehicle.status !== 'On Demo'
          ? state.vehicles.map((v) =>
              v.id === vehicle.id ? { ...v, status: 'Scheduled' as const } : v,
            )
          : state.vehicles;
      return { driveLogs: [...state.driveLogs, newLog], vehicles };
    });
    return id;
  },

  checkoutNow: ({ vehicle, coPilot, purpose, durationMinutes, battery, feedback }) => {
    if (vehicle.status !== 'Available' && vehicle.status !== 'Scheduled') {
      throw new Error(`Vehicle is no longer available. Current status: ${vehicle.status}.`);
    }

    const id = nextLocalId('demo-log', get().driveLogs);
    const now = Date.now();
    const newLog: DriveLog = {
      id,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      vehicleTrim: vehicle.trim,
      vehicleVin: vehicle.vin,
      vehicleSeats: vehicle.seats,
      coPilot,
      purpose,
      startTime: Timestamp.fromDate(new Date(now)),
      expectedDuration: durationMinutes,
      startBattery: battery,
      feedback: purpose === 'Other' ? feedback ?? '' : '',
    };

    const status =
      purpose === 'Demo' ? 'On Demo' : purpose === 'Charging' ? 'Charging' : 'On Demo';

    set((state) => ({
      driveLogs: [...state.driveLogs, newLog],
      vehicles: state.vehicles.map((v) =>
        v.id === vehicle.id
          ? {
              ...v,
              status,
              driveStartedAt: now,
              expectedDuration: durationMinutes,
              currentDriveId: id,
              batteryLevel: battery,
            }
          : v,
      ),
    }));
    return id;
  },

  completeCharging: (vehicleId, endBattery) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              status: 'Available',
              batteryLevel: endBattery,
              batterySource: 'manual',
              currentDriveId: undefined,
              driveStartedAt: undefined,
              expectedDuration: undefined,
            }
          : v,
      ),
    }));
  },

  completeActiveDrive: ({ vehicle, driveLogId, vehiclePatch, drivePatch, newFsdOrder }) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicle.id ? { ...v, ...vehiclePatch, id: vehicle.id } : v,
      ),
      driveLogs: state.driveLogs.map((log) =>
        log.id === driveLogId ? { ...log, ...drivePatch, id: driveLogId } : log,
      ),
      fsdOrders: newFsdOrder ? [...state.fsdOrders, newFsdOrder] : state.fsdOrders,
    }));
  },

  getSettings: () => get().settings,
}));

export function filterDriveLogsForDashboard(logs: DriveLog[]): DriveLog[] {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return logs
    .filter((log) => {
      const start = getDriveStartDate(log.startTime);
      return start ? start.getTime() >= thirtyDaysAgo : false;
    })
    .sort((a, b) => {
      const at = getDriveStartDate(a.startTime)?.getTime() ?? 0;
      const bt = getDriveStartDate(b.startTime)?.getTime() ?? 0;
      return bt - at;
    })
    .slice(0, 500);
}

export function intervalsOverlapFromLog(
  aStart: DriveLog['startTime'],
  aDuration: number,
  bStart: DriveLog['startTime'],
  bDuration: number,
): boolean {
  const a = normalizeDriveInterval(aStart, aDuration);
  const b = normalizeDriveInterval(bStart, bDuration);
  if (!a || !b) return false;
  return a.startMs < b.endMs && b.startMs < a.endMs;
}
