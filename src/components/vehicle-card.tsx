
'use client';

import { useState, useMemo, useEffect, useRef, memo } from 'react';
import type { Vehicle, Advisor, UserRole, VehicleModel, DriveLog, CardHoverEffect, ButtonHoverEffect } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Car, Palette, Armchair, ChevronRight, Clock, Ban, Disc, Search, CalendarDays, User, Timer } from 'lucide-react';
import BatteryIndicator from './battery-indicator';
import StatusBadge from './status-badge';
import CheckoutSheet from './checkout-sheet';
import CheckinSheet from './checkin-sheet';
import { formatMinutesToHoursAndMinutes } from '@/lib/utils';
import { getVehicleImage, normalizeTrim, getSeatDisplayLabel } from '@/lib/data';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getDriveStartDate, findActiveDriveLog } from '@/lib/drive-log-utils';
import { subscribeCountdownTick } from '@/lib/countdown-ticker';


interface VehicleCardItemProps {
    vehicle: Vehicle;
    advisors: Advisor[];
    currentAdvisor: Advisor;
    storeCode: string;
    userRole: UserRole;
    scheduledDrives: DriveLog[];
    driveLogs: DriveLog[];
    priority?: boolean;
    onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
    isCompact?: boolean;
    isCarousel?: boolean;
    showCarouselDetails?: boolean;
}

const Countdown = ({ startedAt, duration, onOverdueChange }: { startedAt: number; duration: number, onOverdueChange: (isOverdue: boolean) => void }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        return subscribeCountdownTick((now) => {
            const endTime = startedAt + duration * 60 * 1000;
            const diff = endTime - now;
            const newIsOverdue = diff <= 0;

            setIsOverdue(newIsOverdue);

            if (diff <= 0) {
                setTimeLeft(formatMinutesToHoursAndMinutes(Math.floor(Math.abs(diff) / (60 * 1000))));
            } else {
                setTimeLeft(formatMinutesToHoursAndMinutes(Math.ceil(diff / (60 * 1000))));
            }
        });
    }, [startedAt, duration]);

    useEffect(() => {
        onOverdueChange(isOverdue);
    }, [isOverdue, onOverdueChange]);

    return (
        <div className={`flex items-center text-sm ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
            <Clock className="mr-2 h-4 w-4" />
            <span>{isOverdue ? `Overdue by ${timeLeft}` : `Returns in ${timeLeft}`}</span>
        </div>
    );
};

function VehicleCardItem({ vehicle, advisors, currentAdvisor, storeCode, userRole, scheduledDrives, driveLogs, priority = false, onVehicleUpdate, isCompact = false, isCarousel = false, showCarouselDetails = true }: VehicleCardItemProps) {
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);
    const [isCheckinOpen, setCheckinOpen] = useState(false);
    const [isOverdue, setIsOverdue] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const isDemoDisabled = vehicle.batteryLevel < 15;
    const needsAttention = vehicle.status === 'Needs Attention';
    
    const reduceMotion = currentAdvisor.reduceMotion === true;
    const cardHoverEffect = reduceMotion ? 'blur' : (currentAdvisor.cardHoverEffect || 'holographic');
    const buttonHoverEffect = reduceMotion ? 'default' : (currentAdvisor.buttonHoverEffect || 'default');

    const currentDriveLog = useMemo(
        () => findActiveDriveLog(vehicle, driveLogs),
        [driveLogs, vehicle],
    );

    const checkoutStartedAt = useMemo(() => {
        if (currentDriveLog?.startTime) {
            return getDriveStartDate(currentDriveLog.startTime);
        }
        if (vehicle.driveStartedAt) {
            return new Date(vehicle.driveStartedAt);
        }
        return null;
    }, [currentDriveLog, vehicle.driveStartedAt]);

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
        
        return futureDrives[0]; // Return the soonest future drive
    }, [scheduledDrives, vehicle.id]);
      
      const isScheduledForSoon = useMemo(() => {
        if (!upcomingSchedule) return false;
        const now = Date.now();
        const startTime = (upcomingSchedule.startTime as Timestamp)?.toDate ? (upcomingSchedule.startTime as Timestamp).toDate().getTime() : new Date(upcomingSchedule.startTime as number | Date).getTime();
        // Block checkout if it's within 15 minutes of the start time and hasn't passed
        return startTime - now < 15 * 60 * 1000 && startTime > now;
      }, [upcomingSchedule]);

      const canCheckout = (vehicle.status === 'Available' || (vehicle.status === 'Scheduled' && !isScheduledForSoon) || vehicle.status === 'On Demo');
      const canCheckin = vehicle.status === 'On Demo' || vehicle.status === 'Charging';
      
      const getStatus = (): "Not Available" | Vehicle['status'] => {
          if (needsAttention) {
            return 'Needs Attention';
          }
          if (vehicle.status === 'Available' && isDemoDisabled && userRole === 'advisor') {
              return 'Not Available';
          }
          return vehicle.status;
      }

    const isButtonDisabled = (userRole === 'advisor' && vehicle.status === 'Available' && isDemoDisabled) || isScheduledForSoon || needsAttention;

    useEffect(() => {
        if (vehicle.status === 'On Demo' && vehicle.driveStartedAt && vehicle.expectedDuration) {
            const endTime = vehicle.driveStartedAt + vehicle.expectedDuration * 60 * 1000;
            const newIsOverdue = Date.now() > endTime;
            if (isOverdue !== newIsOverdue) {
                setIsOverdue(newIsOverdue);
            }
        } else {
            setIsOverdue(false);
        }
    }, [vehicle, isOverdue]);
    

    const cardClasses = cn(
        "grid grid-rows-[auto_1fr_auto] h-full overflow-hidden select-none",
        !reduceMotion && "transition-all duration-350 ease-out",
        isOverdue && 'glow-overdue',
        {
            'holographic-card': !reduceMotion && cardHoverEffect === 'holographic',
        }
    );

    const CheckoutButton = () => {
        const commonProps = {
            className: cn("flex-1", isButtonDisabled && "cursor-not-allowed"),
            size: "sm" as "sm",
            onClick: () => setCheckoutOpen(true),
            disabled: isButtonDisabled,
        };

        if(buttonHoverEffect === 'arrow' && canCheckout && !reduceMotion) {
            return (
                <button {...commonProps} className={cn(commonProps.className, "btn-arrow-hover h-8")}>
                    <span className="circle" aria-hidden="true">
                        <span className="icon arrow"></span>
                    </span>
                    <span className="button-text">
                        {needsAttention ? 'Needs Attention' : isScheduledForSoon ? 'Scheduled Soon' : (isDemoDisabled && userRole === 'advisor' && vehicle.status === 'Available') ? 'Low Battery' : vehicle.status === 'On Demo' ? 'Schedule' : 'Checkout'}
                    </span>
                </button>
            )
        }

        return (
            <Button {...commonProps} variant={needsAttention ? "destructive" as "destructive" : "default" as "default"} className={cn(commonProps.className, !reduceMotion && 'glow-on-hover')}>
                 {isButtonDisabled ? <Ban className="mr-2 h-4 w-4" /> : vehicle.status === 'On Demo' ? <CalendarDays className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                {needsAttention ? 'Needs Attention' : isScheduledForSoon ? 'Scheduled Soon' : (isDemoDisabled && userRole === 'advisor' && vehicle.status === 'Available') ? 'Low Battery' : vehicle.status === 'On Demo' ? 'Schedule Next' : 'Checkout'}
            </Button>
        )
    }

    if (isCompact) {
        return (
          <>
            <Card ref={cardRef} id={`vehicle-${vehicle.id}`} className={cn(cardClasses, "flex flex-row items-center p-2 select-none")}>
                <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden">
                    <Image
                        src={getVehicleImage(vehicle.model, vehicle.trim)}
                        alt={`${vehicle.model} ${vehicle.trim}`}
                        fill
                        sizes="100px"
                        className="object-cover"
                    />
                </div>
                <div className="flex-grow p-3 space-y-1">
                    <CardTitle className="text-base font-bold">{vehicle.model}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">{normalizeTrim(vehicle.trim)}</p>
                    <p className="text-sm font-bold font-mono text-muted-foreground">VIN ...{vehicle.vin.slice(-6)}</p>
                    <StatusBadge status={getStatus()} />
                </div>
                <div className="flex flex-col items-end justify-center gap-2 p-2 min-w-[120px]">
                    <BatteryIndicator level={vehicle.batteryLevel} />
                    {canCheckin ? (
                        <div className="group checkout-button-pop w-full flex justify-end items-center gap-2 cursor-pointer" onClick={() => setCheckinOpen(true)}>
                            <span className="text-sm font-medium">End Drive</span>
                            <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                                <ChevronRight className="h-5 w-5 checkout-button-icon" />
                            </div>
                        </div>
                    ) : canCheckout ? (
                        <div className="group checkout-button-pop w-full flex justify-end items-center gap-2 cursor-pointer" onClick={() => setCheckoutOpen(true)}>
                            <span className="text-sm font-medium">{vehicle.status === 'On Demo' ? 'Schedule' : 'Checkout'}</span>
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <ChevronRight className="h-5 w-5 checkout-button-icon" />
                            </div>
                        </div>
                    ) : (
                         <Button className="w-full h-8" disabled variant="destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            {vehicle.status}
                        </Button>
                    )}
                </div>
            </Card>

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
        )
    }

    return (
        <>
            <Card ref={cardRef} id={`vehicle-${vehicle.id}`} className={cardClasses}>
                <CardHeader className="relative p-0 h-48 sm:h-56 w-full">
                    <Image
                        src={getVehicleImage(vehicle.model, vehicle.trim)}
                        alt={`${vehicle.model} ${vehicle.trim}`}
                        fill
                        sizes={isCarousel ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
                        className="object-cover"
                        priority={priority}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-white">{vehicle.model}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-gray-300">{normalizeTrim(vehicle.trim)}</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={getStatus()} />
                            {vehicle.status === 'Available' && upcomingSchedule && !isDemoDisabled && (
                                 <StatusBadge status='Scheduled' />
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 grid grid-rows-[auto_1fr_auto] gap-3 sm:gap-4 flex-grow">
                     <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-start">
                            <div className={cn(
                                "flex-1 flex transition-all duration-500 ease-out",
                                isCarousel && !showCarouselDetails ? "justify-center items-center" : "justify-start items-center"
                            )}>
                                <span className={cn(
                                    "font-bold font-mono text-foreground transition-all duration-500 ease-out",
                                    isCarousel && !showCarouselDetails ? "text-2xl sm:text-3xl" : "text-base"
                                )}>
                                    VIN ...{vehicle.vin.slice(-6)}
                                </span>
                            </div>
                            <BatteryIndicator level={vehicle.batteryLevel} />
                        </div>
                         <div className={cn(
                            "grid grid-cols-1 gap-y-2 transition-all duration-500 ease-out origin-top",
                            (!isCarousel || (isCarousel && showCarouselDetails)) 
                                ? "opacity-100 scale-100 max-h-[500px]" 
                                : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                         )}>
                            <div className="flex items-center text-foreground">
                                <Car className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>{vehicle.exteriorColor}</span>
                            </div>
                            <div className="flex items-center text-foreground">
                                <Palette className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>{vehicle.interiorColor}</span>
                            </div>
                            <div className="flex items-center text-foreground">
                                <Disc className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>{vehicle.wheelSize}</span>
                            </div>
                            <div className="flex items-center text-foreground">
                                <Armchair className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>{getSeatDisplayLabel(vehicle.seats)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="min-h-[66px] flex flex-col justify-center space-y-2 text-xs sm:text-sm">
                        {vehicle.status === 'On Demo' && (currentDriveLog?.coPilot || checkoutStartedAt) && (
                            <>
                                {currentDriveLog?.coPilot && (
                                    <div className="flex items-center text-foreground">
                                        <User className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{currentDriveLog.coPilot}</span>
                                    </div>
                                )}
                                {checkoutStartedAt && (
                                    <div className="flex items-center text-foreground">
                                        <Timer className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>Checked out at {format(checkoutStartedAt, 'h:mm a')}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {vehicle.status === 'On Demo' && vehicle.driveStartedAt && vehicle.expectedDuration && (
                            <Countdown startedAt={vehicle.driveStartedAt} duration={vehicle.expectedDuration} onOverdueChange={setIsOverdue}/>
                        )}
                        {upcomingSchedule && (
                            <div className="flex items-center text-sm text-blue-400">
                                <CalendarDays className="mr-2 h-4 w-4" />
                                <span>Next drive at {format(new Date((upcomingSchedule.startTime as Timestamp).seconds * 1000), 'h:mm a, MMM d')}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-2 sm:p-4 mt-auto flex flex-wrap items-center gap-2">
                    {canCheckout && <CheckoutButton />}
                    {canCheckin && (
                        <Button variant="secondary" size="sm" className={cn("flex-1", buttonHoverEffect !== 'arrow' && 'glow-on-hover secondary')} onClick={() => setCheckinOpen(true)}>
                           {vehicle.status === 'Charging' ? 'Complete Charging' : 'End Drive'}
                        </Button>
                    )}
                    {!canCheckout && !canCheckin && (
                         <Button className="w-full" disabled variant="destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            {vehicle.status}
                        </Button>
                    )}
                </CardFooter>
            </Card>

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

// Memoize component — re-render when drive logs or active checkout state changes.
export default memo(VehicleCardItem, (prevProps, nextProps) => {
  const prevActiveLog = findActiveDriveLog(prevProps.vehicle, prevProps.driveLogs);
  const nextActiveLog = findActiveDriveLog(nextProps.vehicle, nextProps.driveLogs);

  return (
    prevProps.vehicle.id === nextProps.vehicle.id &&
    prevProps.vehicle.status === nextProps.vehicle.status &&
    prevProps.vehicle.batteryLevel === nextProps.vehicle.batteryLevel &&
    prevProps.vehicle.currentDriveId === nextProps.vehicle.currentDriveId &&
    prevProps.vehicle.driveStartedAt === nextProps.vehicle.driveStartedAt &&
    prevProps.vehicle.expectedDuration === nextProps.vehicle.expectedDuration &&
    prevProps.vehicle.overdue === nextProps.vehicle.overdue &&
    prevProps.currentAdvisor.id === nextProps.currentAdvisor.id &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.isCarousel === nextProps.isCarousel &&
    prevProps.showCarouselDetails === nextProps.showCarouselDetails &&
    prevProps.scheduledDrives.length === nextProps.scheduledDrives.length &&
    prevActiveLog?.id === nextActiveLog?.id &&
    prevActiveLog?.coPilot === nextActiveLog?.coPilot &&
    prevActiveLog?.startTime === nextActiveLog?.startTime
  );
});
