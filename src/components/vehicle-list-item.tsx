
'use client';

import { useState, useMemo, memo } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog } from '@/lib/types';
import { Button } from './ui/button';
import BatteryIndicator from './battery-indicator';
import StatusBadge from './status-badge';
import CheckoutSheet from './checkout-sheet';
import CheckinSheet from './checkin-sheet';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { findActiveDriveLog } from '@/lib/drive-log-utils';

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

    const isDemoDisabled = vehicle.batteryLevel < 15;
    const needsAttention = vehicle.status === 'Needs Attention';

    const currentDriveLog = useMemo(
        () => findActiveDriveLog(vehicle, driveLogs),
        [driveLogs, vehicle],
    );

    const upcomingSchedule = useMemo(() => {
        const now = Date.now();
        const futureDrives = (scheduledDrives || [])
            .filter(drive => {
                const startTime = (drive.startTime as Timestamp)?.toDate ? (drive.startTime as Timestamp).toDate().getTime() : new Date(drive.startTime as number | Date).getTime();
                return drive.vehicleId === vehicle.id && startTime > now;
            })
            .sort((a, b) => {
                const timeA = (a.startTime as Timestamp)?.toDate ? (a.startTime as Timestamp).toDate().getTime() : new Date(a.startTime as number | Date).getTime();
                const timeB = (b.startTime as Timestamp)?.toDate ? (b.startTime as Timestamp).toDate().getTime() : new Date(b.startTime as number | Date).getTime();
                return timeA - timeB;
            });
        
        return futureDrives[0];
    }, [scheduledDrives, vehicle.id]);
      
    const isScheduledForSoon = useMemo(() => {
        if (!upcomingSchedule) return false;
        const now = Date.now();
        const startTime = (upcomingSchedule.startTime as Timestamp)?.toDate ? (upcomingSchedule.startTime as Timestamp).toDate().getTime() : new Date(upcomingSchedule.startTime as number | Date).getTime();
        return startTime - now < 15 * 60 * 1000 && startTime > now;
    }, [upcomingSchedule]);

    const canCheckout = (vehicle.status === 'Available' || (vehicle.status === 'Scheduled' && !isScheduledForSoon));
    const canSchedule = vehicle.status === 'On Demo';
    const canCheckin = vehicle.status === 'On Demo' || vehicle.status === 'Charging';

    const getStatus = (): "Not Available" | Vehicle['status'] => {
        if (needsAttention) return 'Needs Attention';
        if (vehicle.status === 'Available' && isDemoDisabled && userRole === 'advisor') return 'Not Available';
        return vehicle.status;
    }

    const isButtonDisabled = (userRole === 'advisor' && vehicle.status === 'Available' && isDemoDisabled) || isScheduledForSoon || needsAttention;

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
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Scheduled</Badge>
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
                                    End Drive
                                </Button>
                            ) : canCheckout ? (
                                <Button size="sm" onClick={() => setCheckoutOpen(true)} disabled={isButtonDisabled} className="w-full">
                                    Checkout
                                </Button>
                            ) : canSchedule ? (
                                <Button size="sm" onClick={() => setCheckoutOpen(true)} className="w-full">
                                    Schedule
                                </Button>
                            ) : (
                                <Button size="sm" disabled variant="destructive" className="w-full">
                                    {vehicle.status}
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
