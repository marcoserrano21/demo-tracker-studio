'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog, VehicleStatus } from '@/lib/types';
import Image from 'next/image';
import { Button } from './ui/button';
import BatteryIndicator from './battery-indicator';
import CheckoutSheet from './checkout-sheet';
import CheckinSheet from './checkin-sheet';
import { OverdueNudgeBanner } from './overdue-nudge-banner';
import { LowBatteryQueue } from './low-battery-queue';
import { EmptyState } from './empty-state';
import { getVehicleImage, normalizeTrim } from '@/lib/data';
import { cn, formatMinutesToHoursAndMinutes } from '@/lib/utils';
import { findActiveDriveLog, findVehicleSchedule, getDriveStartDate, isWithinScheduleReserveWindow } from '@/lib/drive-log-utils';
import { isBatteryBlocked } from '@/lib/battery-thresholds';
import { subscribeCountdownTick } from '@/lib/countdown-ticker';
import { Ban, Play, CheckCircle2, Zap, AlertTriangle, Clock, Car } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_PRIORITY: Record<VehicleStatus, number> = {
  Available: 0,
  Scheduled: 1,
  'On Demo': 2,
  Charging: 3,
  'Needs Attention': 4,
  Sold: 5,
};

const STATUS_SURFACE: Record<VehicleStatus | 'Not Available', string> = {
  Available: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'On Demo': 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  Charging: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  Scheduled: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  'Needs Attention': 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  Sold: 'bg-muted text-muted-foreground border-border',
  'Not Available': 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

interface FloorModeProps {
  vehicles: Vehicle[];
  advisors: Advisor[];
  currentAdvisor: Advisor;
  storeCode: string;
  userRole: UserRole;
  driveLogs: DriveLog[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  /** When true, only show vehicles that need Finish (On Demo / Charging) */
  finishOnly?: boolean;
  onNavigateTab?: (tab: string) => void;
}

function FloorCountdown({
  startedAt,
  duration,
}: {
  startedAt: number;
  duration: number;
}) {
  const [label, setLabel] = useState('');
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    return subscribeCountdownTick((now) => {
      const endTime = startedAt + duration * 60 * 1000;
      const diff = endTime - now;
      const isOverdue = diff <= 0;
      setOverdue(isOverdue);
      const mins = Math.floor(Math.abs(diff) / (60 * 1000));
      setLabel(
        isOverdue
          ? `Overdue ${formatMinutesToHoursAndMinutes(mins)}`
          : `Returns ${formatMinutesToHoursAndMinutes(Math.ceil(Math.abs(diff) / (60 * 1000)))}`
      );
    });
  }, [startedAt, duration]);

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', overdue ? 'text-red-500' : 'text-amber-600 dark:text-amber-400')}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function FloorVehicleRow({
  vehicle,
  advisors,
  currentAdvisor,
  storeCode,
  userRole,
  driveLogs,
  scheduledDrives,
  onVehicleUpdate,
}: {
  vehicle: Vehicle;
  advisors: Advisor[];
  currentAdvisor: Advisor;
  storeCode: string;
  userRole: UserRole;
  driveLogs: DriveLog[];
  scheduledDrives: DriveLog[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);

  const activeLog = useMemo(() => findActiveDriveLog(vehicle, driveLogs), [vehicle, driveLogs]);
  const lowBattery = isBatteryBlocked(vehicle.batteryLevel);
  const needsAttention = vehicle.status === 'Needs Attention';

  const openSchedule = useMemo(
    () => findVehicleSchedule(vehicle.id, scheduledDrives),
    [scheduledDrives, vehicle.id],
  );

  /** Block walk-in Start only in the 15 min before the booking. */
  const isReservedSoon = useMemo(() => {
    if (!openSchedule) return false;
    return isWithinScheduleReserveWindow(openSchedule.startTime);
  }, [openSchedule]);

  const scheduleLabel = useMemo(() => {
    const date = getDriveStartDate(openSchedule?.startTime);
    return date ? format(date, 'MMM d · h:mm a') : undefined;
  }, [openSchedule]);

  const displayStatus: VehicleStatus | 'Not Available' =
    needsAttention
      ? 'Needs Attention'
      : vehicle.status === 'Available' && lowBattery
        ? 'Not Available'
        : vehicle.status;

  const primaryAction = useMemo(() => {
    if (needsAttention) {
      return { label: 'Needs attention', disabled: true, kind: 'blocked' as const };
    }
    if (vehicle.status === 'On Demo' || vehicle.status === 'Charging') {
      return {
        label: vehicle.status === 'Charging' ? 'Complete charging' : 'Finish',
        disabled: false,
        kind: 'finish' as const,
      };
    }
    if (vehicle.status === 'Available' || vehicle.status === 'Scheduled') {
      if (lowBattery) {
        return { label: 'Low battery', disabled: true, kind: 'start' as const };
      }
      if (isReservedSoon) {
        return { label: 'Scheduled', disabled: true, kind: 'start' as const };
      }
      return {
        label: 'Start',
        disabled: false,
        kind: 'start' as const,
      };
    }
    return { label: vehicle.status, disabled: true, kind: 'blocked' as const };
  }, [vehicle.status, needsAttention, lowBattery, isReservedSoon]);

  const onPrimary = useCallback(() => {
    if (primaryAction.disabled) return;
    if (primaryAction.kind === 'finish') setCheckinOpen(true);
    else if (primaryAction.kind === 'start') setCheckoutOpen(true);
  }, [primaryAction]);

  const advisorName = activeLog?.coPilot;
  const startedAt = vehicle.driveStartedAt ?? (activeLog ? getDriveStartDate(activeLog.startTime)?.getTime() : undefined);

  return (
    <>
      <article
        id={`vehicle-${vehicle.id}`}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm"
      >
        <div className="flex gap-3 p-3 sm:p-4">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image
              src={getVehicleImage(vehicle.model, vehicle.trim, vehicle.imageUrl)}
              alt={`${vehicle.model} ${normalizeTrim(vehicle.trim)}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold leading-tight truncate">
                  {vehicle.model}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {normalizeTrim(vehicle.trim)} · ···{vehicle.vin.slice(-6)}
                </p>
              </div>
              <BatteryIndicator
                level={vehicle.batteryLevel}
                source={vehicle.batterySource}
                syncedAt={vehicle.telemetrySyncedAt as number | undefined}
              />
            </div>

            <div
              className={cn(
                'inline-flex w-fit max-w-full items-center rounded-lg border px-2.5 py-1 text-sm sm:text-base font-bold tracking-wide uppercase',
                STATUS_SURFACE[displayStatus]
              )}
            >
              {displayStatus}
            </div>

            {(vehicle.status === 'Scheduled' || scheduleLabel) && vehicle.status !== 'On Demo' && (
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                {scheduleLabel ? `Booked for ${scheduleLabel}` : 'Scheduled'}
              </p>
            )}

            {vehicle.status === 'On Demo' && (
              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {advisorName && <span className="truncate">{advisorName}</span>}
                {startedAt && vehicle.expectedDuration && (
                  <FloorCountdown startedAt={startedAt} duration={vehicle.expectedDuration} />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border/50 px-3 py-3 sm:px-4">
          <Button
            type="button"
            size="lg"
            variant={primaryAction.kind === 'finish' ? 'secondary' : primaryAction.disabled ? 'destructive' : 'default'}
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={primaryAction.disabled}
            onClick={onPrimary}
          >
            {primaryAction.kind === 'start' && !primaryAction.disabled && (
              <Play className="mr-2 h-5 w-5" aria-hidden />
            )}
            {primaryAction.kind === 'finish' && <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden />}
            {primaryAction.disabled && primaryAction.kind === 'blocked' && (
              needsAttention ? <AlertTriangle className="mr-2 h-5 w-5" aria-hidden /> : <Ban className="mr-2 h-5 w-5" aria-hidden />
            )}
            {primaryAction.disabled && primaryAction.kind === 'start' && (
              <Ban className="mr-2 h-5 w-5" aria-hidden />
            )}
            {primaryAction.label}
          </Button>
        </div>
      </article>

      <CheckoutSheet
        isOpen={checkoutOpen}
        setIsOpen={setCheckoutOpen}
        vehicle={vehicle}
        vehicles={[]}
        advisors={advisors}
        currentAdvisor={currentAdvisor}
        storeCode={storeCode}
        userRole={userRole}
        scheduledDrives={scheduledDrives}
        onVehicleUpdate={onVehicleUpdate}
      />
      <CheckinSheet
        isOpen={checkinOpen}
        setIsOpen={setCheckinOpen}
        vehicle={vehicle}
        advisors={advisors}
        storeCode={storeCode}
        userRole={userRole}
        driveLog={activeLog}
        driveLogs={driveLogs}
        onVehicleUpdate={onVehicleUpdate}
      />
    </>
  );
}

export default function FloorMode({
  vehicles,
  advisors,
  currentAdvisor,
  storeCode,
  userRole,
  driveLogs,
  onVehicleUpdate,
  finishOnly = false,
  onNavigateTab,
}: FloorModeProps) {
  const [chargeVehicle, setChargeVehicle] = useState<Vehicle | null>(null);

  const scheduledDrives = useMemo(
    () => driveLogs.filter((log) => log.purpose === 'Scheduled' && !log.endTime),
    [driveLogs]
  );

  const sorted = useMemo(() => {
    const pool = vehicles.filter((v) => {
      if (v.sold) return false;
      if (finishOnly) return v.status === 'On Demo' || v.status === 'Charging';
      return true;
    });

    return [...pool].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.batteryLevel - a.batteryLevel;
    });
  }, [vehicles, finishOnly]);

  const counts = useMemo(() => {
    const base = vehicles.filter((v) => !v.sold);
    return {
      available: base.filter((v) => v.status === 'Available').length,
      onDemo: base.filter((v) => v.status === 'On Demo').length,
      charging: base.filter((v) => v.status === 'Charging').length,
      attention: base.filter((v) => v.status === 'Needs Attention' || v.overdue).length,
    };
  }, [vehicles]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {finishOnly ? 'Finish path' : 'Floor Mode'}
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            {finishOnly ? 'End active demos' : 'Availability'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {finishOnly
              ? 'One tap to Finish — log FSD and update the fleet.'
              : 'Available first. One action per vehicle.'}
          </p>
        </div>

        {!finishOnly && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Available', value: counts.available, icon: Play },
              { label: 'On demo', value: counts.onDemo, icon: CheckCircle2 },
              { label: 'Charging', value: counts.charging, icon: Zap },
              { label: 'Attention', value: counts.attention, icon: AlertTriangle },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <stat.icon className="h-3 w-3" aria-hidden />
                  {stat.label}
                </div>
                <p className="text-xl font-bold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {!finishOnly && (
        <>
          <OverdueNudgeBanner
            vehicles={vehicles}
            onGoFinish={onNavigateTab ? () => onNavigateTab('finish') : undefined}
          />
          <LowBatteryQueue vehicles={vehicles} onCharge={(v) => setChargeVehicle(v)} />
        </>
      )}

      {chargeVehicle && (
        <CheckoutSheet
          isOpen={!!chargeVehicle}
          setIsOpen={(open) => {
            if (!open) setChargeVehicle(null);
          }}
          vehicle={chargeVehicle}
          vehicles={vehicles}
          advisors={advisors}
          currentAdvisor={currentAdvisor}
          storeCode={storeCode}
          userRole={userRole}
          scheduledDrives={scheduledDrives}
          onVehicleUpdate={onVehicleUpdate}
          initialPurpose="Charging"
        />
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={finishOnly ? CheckCircle2 : Car}
          title={finishOnly ? 'No demos to finish' : 'No vehicles on the floor'}
          description={
            finishOnly
              ? 'When a demo is running, it shows up here to Finish. Flow: Find → Start → Finish.'
              : 'Add vehicles in Management or try Demo Store. Flow: Find an available car → Start a demo → Finish when they return.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((vehicle) => (
            <li key={vehicle.id}>
              <FloorVehicleRow
                vehicle={vehicle}
                advisors={advisors}
                currentAdvisor={currentAdvisor}
                storeCode={storeCode}
                userRole={userRole}
                driveLogs={driveLogs}
                scheduledDrives={scheduledDrives}
                onVehicleUpdate={onVehicleUpdate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
