
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
} from './ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from './ui/button';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { format, isSameDay, startOfMonth, getDay, getDaysInMonth, isToday } from 'date-fns';
import { Zap, Car, Loader2, Calendar as CalendarIcon, Clock, Battery, PlayCircle, ClipboardList, ChevronLeft, ChevronRight, Sparkles, User } from 'lucide-react';
import { BatteryLevelPicker } from './battery-level-picker';
import { Switch } from './ui/switch';
import type { Timestamp } from 'firebase/firestore';
import { Input } from './ui/input';
import { useFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AdvisorSelect,
  DriveFlowFieldHeader,
  DriveFlowFooter,
  DriveFlowHeader,
  DriveFlowOptionButton,
  DriveFlowOptionGrid,
  DriveFlowScrollBody,
  DriveFlowSection,
  DriveFlowSheetContent,
  DriveFlowVehicleHero,
  driveFlowInputClass,
  driveFlowSelectTriggerClass,
  resolveAdvisorId,
  resolveAdvisorName,
} from './drive-flow-sheet-ui';

interface CheckoutSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle | null;
  advisors: Advisor[];
  currentAdvisor: Advisor;
  storeCode: string;
  userRole: UserRole;
  scheduledDrives: DriveLog[];
  isScheduledDriveStart?: boolean;
  driveLog?: DriveLog;
  vehicles?: Vehicle[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

export default function CheckoutSheet({
  isOpen,
  setIsOpen,
  vehicle,
  advisors = [],
  currentAdvisor,
  storeCode,
  userRole,
  scheduledDrives = [],
  isScheduledDriveStart = false,
  driveLog,
  vehicles = [],
  onVehicleUpdate
}: CheckoutSheetProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [showLowBatteryWarning, setShowLowBatteryWarning] = useState(false);
  const [checkoutFormData, setCheckoutFormData] = useState<FormData | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(vehicle?.id);
  const selectedVehicle = useMemo(() => {
    // If a specific vehicle is passed (for checkout), use it.
    if (vehicle) return vehicle;
    // Otherwise (for scheduling), find the selected one from the list.
    return vehicles.find(v => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId, vehicle]);


  const [isScheduled, setIsScheduled] = useState(isScheduledDriveStart || !vehicle || vehicle?.status === 'On Demo');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number | ''>(selectedVehicle?.batteryLevel || '');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  
  const formRef = useRef<HTMLFormElement>(null);
  
  const [purpose, setPurpose] = useState('Demo');
  const [otherPurposeDescription, setOtherPurposeDescription] = useState('');
  const [customDuration, setCustomDuration] = useState<number | ''>(60);

  const [coPilot, setCoPilot] = useState<string>(currentAdvisor?.id || '');

  const durationOptions = useMemo(() => {
    if (isScheduled || isScheduledDriveStart) {
        return [
            { label: '40 min', value: 40 },
            { label: '24 hrs', value: 1440 },
            { label: '48 hrs', value: 2880 },
        ]
    }
    if (purpose === 'Demo') {
        return [
            { label: '40 min', value: 40 },
            { label: '24 hrs', value: 1440 },
            { label: '48 hrs', value: 2880 },
        ]
    }
     if (purpose === 'Charging') {
        return [
            { label: '1 hour', value: 60 },
            { label: '2 hours', value: 120 },
            { label: 'Full', value: 300 },
        ];
    }
    return [];
  }, [purpose, isScheduled, isScheduledDriveStart])

  const [duration, setDuration] = useState(40);
  
  const handleScheduledChange = (checked: boolean) => {
    setIsScheduled(checked);
    if(checked) {
        setCoPilot('');
    } else if (currentAdvisor) {
        setCoPilot(currentAdvisor.id);
    }
  };

  useEffect(() => {
    if (isOpen) {
        // This is a new scheduled drive, opened from the Schedule tab
        if (!vehicle && !isScheduledDriveStart) {
            setIsScheduled(true);
            setCoPilot('');
            setSelectedVehicleId(undefined);
            setDuration(40);
        } 
        // This is to start an already scheduled drive
        else if (isScheduledDriveStart && driveLog) {
            setIsScheduled(true); 
            setCoPilot(resolveAdvisorId(advisors, driveLog.coPilot || ''));
            setSelectedVehicleId(driveLog.vehicleId);
            setDuration(driveLog.expectedDuration || 40);
        }
        // This is an immediate checkout or scheduling from the Fleet view
        else if (vehicle) {
            const isSchedulingNextForOnDemo = vehicle.status === 'On Demo';
            setIsScheduled(isSchedulingNextForOnDemo);
            setCoPilot(isSchedulingNextForOnDemo ? '' : currentAdvisor.id);
            setSelectedVehicleId(vehicle.id);
            setDuration(40);
            setBatteryLevel(vehicle.batteryLevel);
        }

        // Reset fields
        if(userRole !== 'manager') setBatteryLevel('');
        setOtherPurposeDescription('');
        setPurpose('Demo');
        setDate(new Date());
        setSelectedTime('');
        setCalendarMonth(new Date());
    }
  }, [isOpen, vehicle, isScheduledDriveStart, driveLog, currentAdvisor, userRole, advisors]);

  useEffect(() => {
    // Reset duration when purpose changes unless it's a scheduled drive start
    if (!isScheduledDriveStart) {
      if (purpose === 'Demo') setDuration(40);
      else if (purpose === 'Charging') setDuration(60);
      else setDuration(customDuration || 60);
    }
  }, [purpose, isScheduledDriveStart, customDuration]);

  const availableTimes = useMemo(() => {
    const times = [];
    const now = new Date();
    const isTodayDate = date ? isSameDay(date, now) : false;

    const todaysScheduledTimes = scheduledDrives
      .filter(log => {
        if (!log.startTime || log.vehicleId !== selectedVehicle?.id) return false;
        const logDate = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
        return isSameDay(logDate, date || now);
      })
      .map(log => {
        const logDate = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
        return format(logDate, 'HH:mm');
      });

    for (let hour = 10; hour <= 20; hour++) {
        for (let minute of [0, 30]) {
            const time24 = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
            
            if (todaysScheduledTimes.includes(time24)) {
                continue;
            }
    
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayTime = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
            
            if (isTodayDate) {
                const nowHours = now.getHours();
                const nowMinutes = now.getMinutes();
                if (hour > nowHours || (hour === nowHours && minute > nowMinutes)) {
                    times.push({ value: time24, label: displayTime });
                }
            } else if (date && date > now) {
                times.push({ value: time24, label: displayTime });
            }
        }
    }
    return times;
  }, [date, scheduledDrives, selectedVehicle]);

  const handleBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBatteryLevel(value === '' ? '' : parseInt(value, 10));
  };
  
  const handleBatteryBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 1;
    if (value > 100) value = 100;
    if (value < 1) value = 1;
    setBatteryLevel(value);
  };

  const handleStartScheduledDrive = async (formData: FormData) => {
    if (!firestore || !driveLog || !selectedVehicle) return;
    
    setIsLoading(true);
    const advisor = resolveAdvisorName(advisors, formData.get('advisor') as string);
    const batteryValue = userRole === 'manager' ? formData.get('battery') as string : selectedVehicle.batteryLevel.toString();

    if (!advisor) {
        toast({ variant: 'destructive', title: 'Error', description: 'Co-Pilot is required to start a drive.' });
        setIsLoading(false);
        return;
    }

    if (userRole === 'manager' && batteryValue === '') {
        toast({ variant: 'destructive', title: 'Error', description: 'Current Battery Level is required.' });
        setIsLoading(false);
        return;
    }

    const action = async () => {
        setIsOpen(false);
        try {
            const batch = writeBatch(firestore);
            const driveLogRef = doc(firestore, `stores/${storeCode}/demo_drives/${driveLog.id}`);
            const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${selectedVehicle.id}`);
    
            batch.update(driveLogRef, { 
                coPilot: advisor,
                purpose: 'Demo',
                startTime: serverTimestamp(),
                startBattery: Number(batteryValue),
            });
            
            batch.update(vehicleRef, {
                status: 'On Demo',
                currentDriveId: driveLog.id,
                driveStartedAt: Date.now(),
                expectedDuration: driveLog.expectedDuration,
                batteryLevel: Number(batteryValue),
            });
            
            await batch.commit();
            toast({ title: 'Success', description: 'Scheduled drive started!' });

        } catch(error) {
            console.error("Scheduled drive start error:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to start scheduled drive.' });
        } finally {
            setIsLoading(false);
        }
    };

    action();
  }

  const handleCheckout = async (formData: FormData, bypassBatteryCheck = false) => {
    if (!firestore || !selectedVehicle) return;
  
    const advisor = resolveAdvisorName(advisors, coPilot);
    const currentPurpose = isScheduled ? 'Demo' : purpose;
    const scheduledDate = formData.get('scheduledDate') as string;
    const scheduledTime = formData.get('scheduledTime') as string;
    const batteryValue = (isScheduledDriveStart || !isScheduled) && userRole === 'manager' ? formData.get('battery') as string : selectedVehicle.batteryLevel.toString();
    const otherPurposeDesc = formData.get('otherPurposeDescription') as string;
    const customDurationValue = formData.get('customDuration') as string;

    const currentDuration = purpose === 'Other' && !isScheduled ? (Number(customDurationValue) || 60) : duration;
  
    if (!isScheduled && currentPurpose !== 'Other' && !advisor) {
        toast({ variant: 'destructive', title: 'Error', description: 'Co-Pilot is required.' });
        return;
    }

    if (currentPurpose === 'Other' && !otherPurposeDesc) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please describe the purpose.' });
        return;
    }

    if (!isScheduled && userRole === 'manager' && batteryValue === '') {
        toast({ variant: 'destructive', title: 'Error', description: 'Battery Level is required.' });
        return;
    }
    const battery = parseInt(batteryValue);
    
    // Low battery check
    if (currentPurpose === 'Demo' && battery < 15 && !isScheduled && !bypassBatteryCheck) {
        if (userRole === 'manager') {
            setCheckoutFormData(formData);
            setShowLowBatteryWarning(true);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Battery level must be at least 15% for a demo drive.' });
        }
        return;
    }
    
    setIsLoading(true);

    // --- Schedule a drive ---
    if (isScheduled) {
        try {
            if (!scheduledDate || !scheduledTime) throw new Error('Date and time are required for scheduling.');
            const scheduleTime = new Date(`${scheduledDate}T${scheduledTime}`);
            
            // Double-booking prevention: Check if this vehicle is already scheduled at this time
            const existingSchedule = scheduledDrives.find(log => {
                if (log.vehicleId !== selectedVehicle.id || log.endTime) return false;
                const logTime = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
                return Math.abs(logTime.getTime() - scheduleTime.getTime()) < 60000; // Within 1 minute
            });
            
            if (existingSchedule) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Double Booking Prevented', 
                    description: 'This vehicle is already scheduled for this time. Please choose a different time or vehicle.' 
                });
                setIsLoading(false);
                return;
            }
            
            const newLog: Omit<DriveLog, 'id'> = {
                vehicleId: selectedVehicle.id,
                vehicleModel: selectedVehicle.model,
                vehicleTrim: selectedVehicle.trim,
                vehicleVin: selectedVehicle.vin,
                vehicleSeats: selectedVehicle.seats,
                coPilot: advisor || '',
                purpose: 'Scheduled',
                startTime: scheduleTime,
                expectedDuration: currentDuration ?? 0,
                startBattery: selectedVehicle.batteryLevel,
                createdAt: serverTimestamp() as Timestamp,
                feedback: '',
            };

            const batch = writeBatch(firestore);
            const newLogRef = doc(collection(firestore, `stores/${storeCode}/demo_drives`));
            batch.set(newLogRef, newLog);
            if (selectedVehicle.status !== 'On Demo') {
                const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${selectedVehicle.id}`);
                batch.update(vehicleRef, { status: 'Scheduled' });
            }
            await batch.commit();
            toast({ title: 'Success', description: 'Vehicle scheduled for Demo.' });
            setIsOpen(false);
        } catch (error) {
            console.error("Scheduling Error:", error);
            toast({ variant: 'destructive', title: 'Scheduling Failed', description: 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // --- Perform immediate checkout using a transaction ---
    try {
        await runTransaction(firestore, async (transaction) => {
            const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${selectedVehicle.id}`);
            const vehicleSnap = await transaction.get(vehicleRef);

            if (!vehicleSnap.exists()) {
                throw new Error("Vehicle could not be found. Please refresh.");
            }

            const currentDBVehicle = vehicleSnap.data() as Vehicle;
            if (currentDBVehicle.status !== 'Available' && currentDBVehicle.status !== 'Scheduled') {
                throw new Error(`Vehicle is no longer available. Current status: ${currentDBVehicle.status}.`);
            }

            const newLogRef = doc(collection(firestore, `stores/${storeCode}/demo_drives`));
            const newLogData: Omit<DriveLog, 'id'> = {
                vehicleId: selectedVehicle.id,
                vehicleModel: selectedVehicle.model,
                vehicleTrim: selectedVehicle.trim,
                vehicleVin: selectedVehicle.vin,
                vehicleSeats: selectedVehicle.seats,
                coPilot: advisor,
                purpose: currentPurpose as 'Demo' | 'Charging' | 'Other',
                startTime: serverTimestamp() as Timestamp,
                expectedDuration: currentDuration ?? 0,
                startBattery: battery,
                feedback: currentPurpose === 'Other' ? otherPurposeDesc : '',
                createdAt: serverTimestamp() as Timestamp,
            };
            transaction.set(newLogRef, newLogData);
        
            const updatedVehicleData = {
                status: currentPurpose === 'Demo' ? 'On Demo' : currentPurpose === 'Charging' ? 'Charging' : 'On Demo',
                driveStartedAt: Date.now(),
                expectedDuration: currentDuration,
                currentDriveId: newLogRef.id,
                batteryLevel: battery,
            };
            transaction.update(vehicleRef, updatedVehicleData);
        });

        toast({ title: 'Success', description: `Vehicle checked out for ${currentPurpose}.` });
        setIsOpen(false);
    } catch (error: any) {
        console.error("Checkout Transaction Error:", error);
        toast({ variant: 'destructive', title: 'Checkout Failed', description: error.message || 'An unexpected error occurred. Please try again.' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const isDemoDisabled = (selectedVehicle && selectedVehicle.batteryLevel < 15 && userRole === 'advisor');
  const isCheckoutNowDisabled = selectedVehicle?.status === 'On Demo' && !isScheduledDriveStart;
  const needsAttention = selectedVehicle?.status === 'Needs Attention';

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      formRef.current?.reset();
      setOtherPurposeDescription('');
    }
    setIsOpen(open);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (isScheduledDriveStart) {
        handleStartScheduledDrive(formData);
    } else {
        handleCheckout(formData);
    }
  }

  const handleLowBatteryConfirm = () => {
    if (checkoutFormData) {
        handleCheckout(checkoutFormData, true);
    }
    setShowLowBatteryWarning(false);
  };

  const headerIcon = isScheduledDriveStart ? PlayCircle : isScheduled ? CalendarIcon : Car;
  const headerAccent = isScheduled && !isScheduledDriveStart ? 'bg-sky-600' : 'bg-primary';
  const sheetTitle = isScheduledDriveStart
    ? 'Start scheduled drive'
    : vehicle
      ? isScheduled
        ? `Schedule · ${vehicle.model}`
        : `Check out · ${vehicle.model}`
      : 'Schedule a drive';
  const sheetDescription = isScheduledDriveStart
    ? `Confirm details · VIN ···${selectedVehicle?.vin.slice(-6)}`
    : vehicle
      ? `Choose purpose and duration · VIN ···${vehicle.vin.slice(-6)}`
      : 'Pick a vehicle and time for the next demo.';

  return (
    <>
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <DriveFlowSheetContent>
        <DriveFlowHeader
          icon={headerIcon}
          accentClass={headerAccent}
          title={sheetTitle}
          description={sheetDescription}
        />

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {selectedVehicle && <DriveFlowVehicleHero vehicle={selectedVehicle} />}

          <DriveFlowScrollBody className={selectedVehicle ? 'pt-4' : undefined}>
          {!vehicle && (
            <DriveFlowSection>
              <DriveFlowFieldHeader icon={Car} title="Vehicle" hint="Choose from available fleet" required />
              <Select name="vehicle" required value={selectedVehicleId} onValueChange={(id) => { setSelectedVehicleId(id); setBatteryLevel(vehicles.find(v => v.id === id)?.batteryLevel || '')}}>
                <SelectTrigger className={driveFlowSelectTriggerClass}>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[min(360px,50vh)]">
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.status === 'Needs Attention'} className="h-14 cursor-pointer rounded-lg">
                      <div className="flex items-center gap-3 w-full py-0.5">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{v.model} {v.trim}</div>
                          <div className="text-xs text-muted-foreground">VIN ···{v.vin.slice(-6)} · {v.status}</div>
                        </div>
                        <div className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          v.batteryLevel >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                          v.batteryLevel >= 50 ? "bg-sky-500/10 text-sky-600" :
                          v.batteryLevel >= 15 ? "bg-amber-500/10 text-amber-600" :
                          "bg-red-500/10 text-red-600"
                        )}>
                          {v.batteryLevel}%
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DriveFlowSection>
          )}

          <DriveFlowSection>
            <DriveFlowFieldHeader
              icon={User}
              title="Co-pilot"
              hint={isScheduled ? 'Optional when scheduling ahead' : 'Advisor taking the vehicle out'}
              required={!isScheduled && purpose !== 'Other'}
            />
            <AdvisorSelect
              name="advisor"
              advisors={advisors}
              value={coPilot}
              onValueChange={setCoPilot}
              placeholder={isScheduled ? 'Optional for scheduled drives' : 'Select co-pilot'}
              required={!isScheduled && purpose !== 'Other'}
            />
          </DriveFlowSection>

          {!isScheduledDriveStart && selectedVehicle && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3.5">
              <div className="min-w-0">
                <Label htmlFor="schedule-switch" className="text-sm font-semibold cursor-pointer">
                  Schedule for later
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Book a demo instead of checking out now</p>
              </div>
              <Switch id="schedule-switch" checked={isScheduled} onCheckedChange={handleScheduledChange} disabled={selectedVehicle?.status === 'On Demo'} />
            </div>
          )}
              
          {!isScheduledDriveStart && selectedVehicle && isScheduled ? (
            <DriveFlowSection>
              <DriveFlowFieldHeader icon={CalendarIcon} title="Date & time" hint="Pick when the demo should start" required />
              <div className="space-y-3">
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={cn(driveFlowSelectTriggerClass, 'w-full justify-start font-medium')}
                  >
                    <CalendarIcon className="mr-2.5 h-4 w-4 text-primary shrink-0" />
                    {date ? format(date, 'EEE, MMM d, yyyy') : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>

                  {showCalendar && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-border/60 bg-popover p-4 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => { const d = new Date(calendarMonth); d.setMonth(d.getMonth() - 1); setCalendarMonth(d); }}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-semibold">{format(calendarMonth, 'MMMM yyyy')}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => { const d = new Date(calendarMonth); d.setMonth(d.getMonth() + 1); setCalendarMonth(d); }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">{day}</div>
                        ))}
                        {Array.from({ length: 35 }, (_, i) => {
                          const firstDay = startOfMonth(calendarMonth);
                          const startDay = getDay(firstDay);
                          const daysInMonth = getDaysInMonth(calendarMonth);
                          const dayNum = i - startDay + 1;
                          if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} className="h-9" />;
                          const dayDate = new Date(calendarMonth);
                          dayDate.setDate(dayNum);
                          const isSelected = date && isSameDay(dayDate, date);
                          const isTodayDate = isToday(dayDate);
                          const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { if (!isPast) { setDate(dayDate); setShowCalendar(false); } }}
                              disabled={isPast}
                              className={cn(
                                'h-9 rounded-lg text-sm font-medium transition-colors',
                                isSelected && 'bg-primary text-primary-foreground',
                                !isSelected && isTodayDate && 'ring-1 ring-primary/40 bg-accent',
                                !isSelected && !isTodayDate && !isPast && 'hover:bg-muted',
                                isPast && 'opacity-30 cursor-not-allowed',
                              )}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <input type="hidden" name="scheduledDate" value={date ? format(date, 'yyyy-MM-dd') : ''} />

                <Select name="scheduledTime" value={selectedTime} onValueChange={setSelectedTime} required>
                  <SelectTrigger className={driveFlowSelectTriggerClass}>
                    <Clock className="mr-2.5 h-4 w-4 text-primary shrink-0" />
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">
                    {availableTimes.length > 0 ? availableTimes.map((time) => (
                      <SelectItem key={time.value} value={time.value} className="h-11 cursor-pointer rounded-lg">{time.label}</SelectItem>
                    )) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">No times available for this date.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </DriveFlowSection>
          ) : !isScheduledDriveStart && selectedVehicle ? (
            <DriveFlowSection>
              <DriveFlowFieldHeader icon={Sparkles} title="Purpose" hint="What is the vehicle being used for?" />
              <DriveFlowOptionGrid>
                <DriveFlowOptionButton
                  selected={purpose === 'Demo'}
                  disabled={isDemoDisabled || isCheckoutNowDisabled}
                  onClick={() => !isDemoDisabled && !isCheckoutNowDisabled && setPurpose('Demo')}
                  accentSelected="text-blue-600"
                >
                  <Car className={cn('h-5 w-5', purpose === 'Demo' ? 'text-blue-600' : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-semibold', purpose === 'Demo' && 'text-blue-600')}>Demo</span>
                </DriveFlowOptionButton>
                <DriveFlowOptionButton
                  selected={purpose === 'Charging'}
                  disabled={isCheckoutNowDisabled}
                  onClick={() => !isCheckoutNowDisabled && setPurpose('Charging')}
                  accentSelected="text-amber-600"
                >
                  <Zap className={cn('h-5 w-5', purpose === 'Charging' ? 'text-amber-600' : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-semibold', purpose === 'Charging' && 'text-amber-600')}>Charging</span>
                </DriveFlowOptionButton>
                <DriveFlowOptionButton
                  selected={purpose === 'Other'}
                  disabled={isCheckoutNowDisabled}
                  onClick={() => !isCheckoutNowDisabled && setPurpose('Other')}
                  accentSelected="text-violet-600"
                >
                  <ClipboardList className={cn('h-5 w-5', purpose === 'Other' ? 'text-violet-600' : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-semibold', purpose === 'Other' && 'text-violet-600')}>Other</span>
                </DriveFlowOptionButton>
              </DriveFlowOptionGrid>
              {purpose === 'Other' && (
                <Input
                  name="otherPurposeDescription"
                  placeholder="Describe the purpose…"
                  value={otherPurposeDescription}
                  onChange={(e) => setOtherPurposeDescription(e.target.value)}
                  required
                  className={driveFlowInputClass}
                />
              )}
            </DriveFlowSection>
          ) : null}

          <DriveFlowSection>
            <DriveFlowFieldHeader icon={Clock} title="Expected duration" />
            {purpose === 'Other' && !isScheduled && !isScheduledDriveStart ? (
              <Input
                name="customDuration"
                type="number"
                inputMode="numeric"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Minutes (e.g. 90)"
                required
                className={cn(driveFlowInputClass, 'text-center text-lg font-semibold tabular-nums')}
              />
            ) : (
              <DriveFlowOptionGrid>
                {durationOptions.map((opt) => (
                  <DriveFlowOptionButton
                    key={opt.value}
                    selected={duration === opt.value}
                    disabled={isScheduledDriveStart}
                    onClick={() => !isScheduledDriveStart && setDuration(opt.value)}
                  >
                    <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
                  </DriveFlowOptionButton>
                ))}
              </DriveFlowOptionGrid>
            )}
          </DriveFlowSection>

          {userRole === 'manager' && (
            <DriveFlowSection>
              <DriveFlowFieldHeader
                icon={Battery}
                title="Battery level"
                hint="Verify charge in Vehicle Ops before sending out"
                required
              />
              <BatteryLevelPicker
                name="battery"
                value={batteryLevel}
                onChange={setBatteryLevel}
                disabled={!selectedVehicle}
                hint="Confirm the percentage on the vehicle screen before checkout."
              />
            </DriveFlowSection>
          )}
          </DriveFlowScrollBody>

          <DriveFlowFooter>
            <Button
              type="submit"
              disabled={isLoading || !selectedVehicle || needsAttention}
              className="w-full h-12 sm:h-14 rounded-xl text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                  Processing…
                </>
              ) : needsAttention ? (
                'Vehicle needs attention'
              ) : isScheduledDriveStart ? (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" aria-hidden />
                  Start scheduled drive
                </>
              ) : isScheduled ? (
                <>
                  <CalendarIcon className="mr-2 h-5 w-5" aria-hidden />
                  Schedule drive
                </>
              ) : purpose === 'Demo' ? (
                <>
                  <Car className="mr-2 h-5 w-5" aria-hidden />
                  Confirm demo
                </>
              ) : purpose === 'Charging' ? (
                <>
                  <Zap className="mr-2 h-5 w-5" aria-hidden />
                  Start charging
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-5 w-5" aria-hidden />
                  Confirm checkout
                </>
              )}
            </Button>
          </DriveFlowFooter>
        </form>
      </DriveFlowSheetContent>
    </Sheet>
    
    <AlertDialog open={showLowBatteryWarning} onOpenChange={setShowLowBatteryWarning}>
      <AlertDialogContent className="rounded-2xl border border-amber-500/30 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600">
              <Battery className="h-5 w-5 text-white" aria-hidden />
            </div>
            Low battery warning
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed pt-1">
            Battery is below 15% — the recommended minimum for demo drives. Proceed anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel className="rounded-xl h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLowBatteryConfirm} className="rounded-xl bg-amber-600 hover:bg-amber-700 h-11">
            Proceed anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
