
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog, VehicleIssue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Loader2, CheckCircle, Star, Battery, User, ShoppingBag } from 'lucide-react';
import { BatteryLevelPicker } from './battery-level-picker';
import { useFirebase } from '@/firebase';
import { doc, serverTimestamp, writeBatch, collection, Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { detectIssuesFromKeywords } from '@/lib/issue-keywords';
import { findActiveDriveLog } from '@/lib/drive-log-utils';
import { cn } from '@/lib/utils';
import { awardXP } from '@/lib/xp-client';
import { calculateDriveXP, countParagraphs } from '@/lib/xp-system';
import { showXPGainToast } from '@/components/xp-toast';
import {
  AdvisorSelect,
  DriveFlowFieldHeader,
  DriveFlowFooter,
  DriveFlowHeader,
  DriveFlowScrollBody,
  DriveFlowSection,
  DriveFlowSheetContent,
  DriveFlowVehicleHero,
  driveFlowInputClass,
  resolveAdvisorId,
  resolveAdvisorName,
} from './drive-flow-sheet-ui';

interface CheckinSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle;
  advisors: Advisor[];
  storeCode: string;
  userRole: UserRole;
  driveLog: DriveLog | undefined;
  driveLogs?: DriveLog[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

export default function CheckinSheet({ isOpen, setIsOpen, vehicle, advisors = [], storeCode, userRole, driveLog, driveLogs = [], onVehicleUpdate }: CheckinSheetProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [endBattery, setEndBattery] = useState<number | ''>(vehicle.batteryLevel);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [customerPurchased, setCustomerPurchased] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const activeLog = driveLog ?? findActiveDriveLog(vehicle, driveLogs);
    if (activeLog?.coPilot) {
        const checkoutAdvisorId = resolveAdvisorId(advisors, activeLog.coPilot);
        if (checkoutAdvisorId) {
            setSelectedAdvisor(checkoutAdvisorId);
            return;
        }
    }
    setSelectedAdvisor('');
  }, [isOpen, driveLog, driveLogs, vehicle, advisors]);


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      formRef.current?.reset();
      setEndBattery(vehicle.batteryLevel);
      setRating(0);
      setHoverRating(0);
      setCustomerPurchased(false);
    }
    setIsOpen(open);
  };

  const handleBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndBattery(value === '' ? '' : parseInt(value, 10));
  };
  
  const handleBatteryBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
     if (isNaN(value)) value = 1;
    if (value > 100) value = 100;
    if (value < 1) value = 1;
    setEndBattery(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Unable to connect. Please refresh and try again.' });
      return;
    }

    // Handle charging completion (no driveLog required)
    if (vehicle.status === 'Charging' && !driveLog) {
      setIsLoading(true);
      const formData = new FormData(event.currentTarget);
      const currentEndBattery = formData.get('endBattery');
      if (currentEndBattery === null || currentEndBattery === '') {
        toast({ variant: 'destructive', title: 'Error', description: 'Current battery level is required.' });
        setIsLoading(false);
        return;
      }
      const numericEndBattery = Number(currentEndBattery);
      
      const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicle.id}`);
      const batch = writeBatch(firestore);
      batch.update(vehicleRef, {
        status: 'Available',
        batteryLevel: numericEndBattery,
      });
      
      batch.commit()
        .then(() => {
          toast({ title: 'Success', description: 'Charging completed successfully.' });
          onVehicleUpdate({ ...vehicle, status: 'Available', batteryLevel: numericEndBattery });
          setIsOpen(false);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Charging completion error:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete charging.' });
          setIsLoading(false);
        });
      
      return;
    }

    const activeDriveLog = driveLog ?? findActiveDriveLog(vehicle, driveLogs);
    if (!activeDriveLog) {
      toast({
        variant: 'destructive',
        title: 'Drive record not found',
        description: 'Could not find an active drive for this vehicle. Refresh the page and try again.',
      });
      return;
    }

    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const advisor = resolveAdvisorName(advisors, selectedAdvisor);
    const currentEndBattery = formData.get('endBattery');
    const feedback = formData.get('feedback') as string;
    
    if (!advisor) {
      toast({ variant: 'destructive', title: 'Error', description: 'Check-in advisor is required.' });
      setIsLoading(false);
      return;
    }
    
    if (currentEndBattery === null || currentEndBattery === '') {
        toast({ variant: 'destructive', title: 'Error', description: 'Current battery level is required.' });
        setIsLoading(false);
        return;
    }

    const numericEndBattery = Number(currentEndBattery);

    const startTime = activeDriveLog.startTime instanceof Timestamp ? activeDriveLog.startTime.toDate() : new Date(activeDriveLog.startTime);
    const driveDurationSeconds = (new Date().getTime() - startTime.getTime()) / 1000;

    if (activeDriveLog.startBattery === numericEndBattery && driveDurationSeconds > 60) {
        toast({ variant: 'destructive', title: 'Error', description: 'Battery level cannot be the same as check-out unless the drive is less than 1 minute.' });
        setIsLoading(false);
        return;
    }
    
    let issueDetected = false;
    if (feedback) {
        issueDetected = detectIssuesFromKeywords(feedback);
    }

    const newStatus = issueDetected ? 'Needs Attention' : 'Available';

    const optimisticVehicleUpdate: Partial<Vehicle> & { id: string } = {
        id: vehicle.id,
        status: newStatus,
        batteryLevel: numericEndBattery,
        currentDriveId: undefined,
        driveStartedAt: undefined,
        expectedDuration: undefined,
    };
    onVehicleUpdate(optimisticVehicleUpdate);
    
    const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicle.id}`);
    const driveLogRef = doc(firestore, `stores/${storeCode}/demo_drives/${activeDriveLog.id}`);

    const batch = writeBatch(firestore);

    const vehicleUpdateData: any = {
        status: newStatus,
        batteryLevel: numericEndBattery,
        currentDriveId: null,
        driveStartedAt: null,
        expectedDuration: null,
    };
    batch.update(vehicleRef, vehicleUpdateData);

    const driveLogUpdateData: any = {
        endTime: serverTimestamp(),
        endBattery: numericEndBattery,
        advisorIn: advisor,
        feedback: feedback || '',
        issueDetected,
    };

    if (rating > 0) {
        driveLogUpdateData.rating = rating;
    }

    if (customerPurchased && activeDriveLog.purpose === 'Demo') {
        driveLogUpdateData.customerPurchased = true;
        driveLogUpdateData.purchaseModel = vehicle.model;
        driveLogUpdateData.purchaseTrim = vehicle.trim;
    }

    batch.update(driveLogRef, driveLogUpdateData);

    let newIssueRefPath: string | undefined;
    if (issueDetected) {
        const newIssueRef = doc(collection(firestore, `stores/${storeCode}/vehicles/${vehicle.id}/vehicle_issues`));
        newIssueRefPath = newIssueRef.path;
        const newIssue: Omit<VehicleIssue, 'id' | 'resolutionNotes' | 'resolutionDate'> = {
            description: feedback,
            dateReported: serverTimestamp(),
            status: 'Open',
            vehicleId: vehicle.id,
            storeId: storeCode,
            vehicleModel: vehicle.model,
            vehicleVin: vehicle.vin,
        };
        batch.set(newIssueRef, newIssue);
    }

    batch.commit()
      .then(async () => {
        setIsOpen(false);
        const description = customerPurchased
          ? `Vehicle checked in successfully. Customer purchase of ${vehicle.model} ${vehicle.trim} recorded.`
          : `Vehicle checked in ${issueDetected ? 'with an issue' : 'successfully'}.`;
        toast({ title: 'Success', description });

        if (activeDriveLog.purpose === 'Demo') {
          const creditedAdvisor = advisors.find(a => a.name === (activeDriveLog.coPilot || advisor));
          if (creditedAdvisor) {
            const driveDate = startTime;
            const isWeekend = driveDate.getDay() === 0 || driveDate.getDay() === 6;
            const xpCalculation = calculateDriveXP({
              rating: rating > 0 ? rating : undefined,
              reviewLength: feedback ? countParagraphs(feedback) : 0,
              issueFound: issueDetected,
              isWeekend,
              customerPurchased,
            });
            const xpResult = await awardXP(firestore, storeCode, creditedAdvisor.id, xpCalculation.totalXP);
            if (xpResult.success && xpCalculation.totalXP > 0) {
              showXPGainToast({ xpGained: xpCalculation.totalXP, bonuses: xpCalculation.bonuses, onMyHubPage: false });
            }
          }
        }

        setIsLoading(false);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: newIssueRefPath || vehicleRef.path,
            operation: 'write',
            requestResourceData: { vehicleUpdateData, driveLogUpdateData }
        });
        errorEmitter.emit('permission-error', permissionError);
        onVehicleUpdate({ ...vehicle }); // Revert optimistic update on error
        setIsLoading(false);
      });
  };


  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <DriveFlowSheetContent>
        <DriveFlowHeader
          icon={CheckCircle}
          accentClass="bg-emerald-600"
          title={vehicle.status === 'Charging' ? 'Complete Charging' : `End drive · ${vehicle.model}`}
          description={
            vehicle.status === 'Charging'
              ? `Record final battery for VIN ···${vehicle.vin.slice(-6)}`
              : `Wrap up the demo and log feedback · VIN ···${vehicle.vin.slice(-6)}`
          }
        />

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {vehicle.status !== 'Charging' && <DriveFlowVehicleHero vehicle={vehicle} />}

          <DriveFlowScrollBody className={vehicle.status === 'Charging' ? 'pt-2' : 'pt-4'}>
            {vehicle.status !== 'Charging' && (
              <DriveFlowSection>
                <DriveFlowFieldHeader
                  icon={User}
                  title="Check-in advisor"
                  hint="Who is completing this check-in"
                  required
                />
                <AdvisorSelect
                  advisors={advisors}
                  value={selectedAdvisor}
                  onValueChange={setSelectedAdvisor}
                  placeholder="Select advisor"
                  required
                />
              </DriveFlowSection>
            )}

            <DriveFlowSection>
              <DriveFlowFieldHeader
                icon={Battery}
                title="Battery level"
                hint="Match the charge shown on the vehicle screen"
                required
              />
              <BatteryLevelPicker
                name="endBattery"
                value={endBattery}
                onChange={setEndBattery}
                hint="Most advisors tap 80% or 100% after a short demo. Adjust if the screen shows something different."
              />
            </DriveFlowSection>

            {vehicle.status !== 'Charging' && driveLog?.purpose === 'Demo' && (
              <>
                <DriveFlowSection>
                  <DriveFlowFieldHeader
                    icon={Star}
                    title="Feedback & issues"
                    hint="Optional notes from the demo — keywords auto-flag maintenance items"
                  />
                  <Textarea
                    name="feedback"
                    placeholder="Customer loved the acceleration. Noted a slight rattle in the passenger door…"
                    className="min-h-[108px] rounded-xl border border-border/60 bg-background/80 resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </DriveFlowSection>

                <DriveFlowSection>
                  <DriveFlowFieldHeader
                    title="Experience rating"
                    hint="Optional · How was the demo?"
                  />
                  <div
                    className="flex items-center justify-center gap-1 sm:gap-2 py-2"
                    role="group"
                    aria-label="Rate the demo experience from 1 to 5 stars"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        aria-pressed={rating === star}
                        className="rounded-lg p-1.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <Star
                          className={cn(
                            'h-8 w-8 sm:h-9 sm:w-9 transition-colors duration-150',
                            (hoverRating || rating) >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/50',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-center text-sm font-medium text-muted-foreground">
                      {rating === 5
                        ? 'Excellent experience'
                        : rating === 4
                          ? 'Great experience'
                          : rating === 3
                            ? 'Good experience'
                            : rating === 2
                              ? 'Fair experience'
                              : 'Needs improvement'}
                    </p>
                  )}
                </DriveFlowSection>

                <DriveFlowSection>
                  <DriveFlowFieldHeader
                    icon={ShoppingBag}
                    title="Sales outcome"
                    hint="Did the customer purchase or order after the demo?"
                  />
                  <Button
                    type="button"
                    variant={customerPurchased ? 'default' : 'outline'}
                    className={cn(
                      'w-full h-auto min-h-12 rounded-xl justify-start gap-3 px-4 py-3 text-left',
                      customerPurchased && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
                    )}
                    onClick={() => setCustomerPurchased((prev) => !prev)}
                    aria-pressed={customerPurchased}
                  >
                    <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="font-semibold text-sm">
                        {customerPurchased ? 'Purchase recorded' : 'Mark customer purchase'}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-normal',
                          customerPurchased ? 'text-emerald-50/90' : 'text-muted-foreground',
                        )}
                      >
                        {customerPurchased
                          ? `${vehicle.model} ${vehicle.trim} · +50 XP to My Hub`
                          : `Tap if they bought or ordered the ${vehicle.model} ${vehicle.trim}`}
                      </span>
                    </span>
                  </Button>
                </DriveFlowSection>
              </>
            )}
          </DriveFlowScrollBody>

          <DriveFlowFooter>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 sm:h-14 rounded-xl text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" aria-hidden />
                  {vehicle.status === 'Charging' ? 'Complete charging' : 'Confirm & end drive'}
                </>
              )}
            </Button>
          </DriveFlowFooter>
        </form>
      </DriveFlowSheetContent>
    </Sheet>
  );
}
