
'use client';

import { useState, useMemo, memo } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog } from '@/lib/types';
import { Button } from './ui/button';
import BatteryIndicator from './battery-indicator';
import StatusBadge from './status-badge';
import CheckoutSheet from './checkout-sheet';
import CheckinSheet from './checkin-sheet';
import { cn } from '@/lib/utils';
import {
  findActiveDriveLog,
  findUpcomingSchedule,
  findVehicleSchedule,
  isWithinScheduleReserveWindow,
} from '@/lib/drive-log-utils';
import { isBatteryBlocked } from '@/lib/battery-thresholds';

interface VehicleListItemProps extends React.HTMLAttributes<HTMLDivElement> {
    vehicle: Vehicle;
    advisors: Advisor[];
    currentAdvisor: Advisor;
    storeCode: string;
    userRole: UserRole;
    scheduledDrives: DriveLog[];
    driveLogs: DriveLog[];
    onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

function VehicleListItem({ vehicle, advisors, currentAdvisor, storeCode, userRole, scheduledDrives, driveLogs, onVehicleUpdate, className, ...props }: VehicleListItemProps) {
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);
    const [isCheckinOpen, setCheckinOpen] = useState(false);

    const isDemoDisabled = isBatteryBlocked(vehicle.batteryLevel);
    const needsAttention = vehicle.status === 'Needs Attention';

    const currentDriveLog = useMemo(
        () => findActiveDriveLog(vehicle, driveLogs),
        [driveLogs, vehicle],
    );

    const upcomingSchedule = useMemo(
        () => findUpcomingSchedule(vehicle.id, scheduledDrives),
        [scheduledDrives, vehicle.id],
    );

    const openSchedule = useMemo(
        () => findVehicleSchedule(vehicle.id, scheduledDrives),
        [scheduledDrives, vehicle.id],
    );

    /** Block walk-in Start only in the 15 min before the booking. */
    const isReservedSoon = useMemo(() => {
        const booking = upcomingSchedule ?? openSchedule;
        if (!booking) return false;
        return isWithinScheduleReserveWindow(booking.startTime);
    }, [upcomingSchedule, openSchedule]);

    const canCheckout =
        vehicle.status === 'On Demo' ||
        ((vehicle.status === 'Available' || vehicle.status === 'Scheduled') && !isReservedSoon);
    const canSchedule = vehicle.status === 'On Demo';
    const canCheckin = vehicle.status === 'On Demo' || vehicle.status === 'Charging';

    const getStatus = (): "Not Available" | Vehicle['status'] => {
        if (needsAttention) return 'Needs Attention';
        if (vehicle.status === 'Available' && isDemoDisabled) return 'Not Available';
        return vehicle.status;
    }

    const isButtonDisabled =
        needsAttention ||
        isDemoDisabled ||
        isReservedSoon;

    return (
        <>
            <div className={cn("bg-card border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", className)} {...props}>
                {/* Left Side: Vehicle Info */}
                <div className="flex-1">
                    <div className="font-medium">{vehicle.model} {vehicle.trim}</div>
                    <div className="text-sm text-muted-foreground font-mono">...{vehicle.vin.slice(-6)}</div>
                </div>

                {/* Right Side: Status, Battery, Actions */}
                <div className="w-full sm:w-auto flex items-center justify-between gap-4">
                    {/* Status Column */}
                    <div className="flex flex-col items-start gap-1 min-w-[120px]">
                        <StatusBadge status={getStatus()} />
                        {vehicle.status === 'Available' && upcomingSchedule && !isDemoDisabled && (
                            <StatusBadge status="Scheduled" />
                        )}
                    </div>
                    
                    {/* Battery & Actions Group */}
                    <div className="flex items-center gap-4">
                        <div className="min-w-[60px]">
                            <BatteryIndicator
                              level={vehicle.batteryLevel}
                              source={vehicle.batterySource}
                              syncedAt={vehicle.telemetrySyncedAt as number | undefined}
                            />
                        </div>
                        <div className="w-[120px] flex justify-end">
                            {canCheckin ? (
                                <Button variant="secondary" size="sm" onClick={() => setCheckinOpen(true)} className="w-full">
                                    {vehicle.status === 'Charging' ? 'Complete' : 'Finish'}
                                </Button>
                            ) : canCheckout ? (
                                <Button size="sm" onClick={() => setCheckoutOpen(true)} disabled={isButtonDisabled} className="w-full">
                                    {isDemoDisabled ? 'Low battery' : isReservedSoon ? 'Scheduled' : 'Start'}
                                </Button>
                            ) : canSchedule ? (
                                <Button size="sm" onClick={() => setCheckoutOpen(true)} className="w-full">
                                    Schedule
                                </Button>
                            ) : (
                                <Button size="sm" disabled variant="destructive" className="w-full">
                                    {isReservedSoon ? 'Scheduled' : vehicle.status}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CheckoutSheet
                isOpen={isCheckoutOpen}
                setIsOpen={setCheckoutOpen}
                vehicle={vehicle}
                vehicles={[]}
                advisors={advisors}
                currentAdvisor={currentAdvisor}
                storeCode={storeCode}
                userRole={userRole}
                scheduledDrives={scheduledDrives || []}
                onVehicleUpdate={onVehicleUpdate}
            />
      
            <CheckinSheet
                isOpen={isCheckinOpen}
                setIsOpen={setCheckinOpen}
                vehicle={vehicle}
                advisors={advisors}
                storeCode={storeCode}
                userRole={userRole}
                driveLog={currentDriveLog}
                driveLogs={driveLogs}
                onVehicleUpdate={onVehicleUpdate}
            />
        </>
    );
}

// Memoize for performance
export default memo(VehicleListItem, (prevProps, nextProps) => {
  const prevLog = findActiveDriveLog(prevProps.vehicle, prevProps.driveLogs);
  const nextLog = findActiveDriveLog(nextProps.vehicle, nextProps.driveLogs);
  return (
    prevProps.vehicle.id === nextProps.vehicle.id &&
    prevProps.vehicle.status === nextProps.vehicle.status &&
    prevProps.vehicle.batteryLevel === nextProps.vehicle.batteryLevel &&
    prevProps.vehicle.currentDriveId === nextProps.vehicle.currentDriveId &&
    prevLog?.id === nextLog?.id &&
    prevLog?.coPilot === nextLog?.coPilot
  );
});
