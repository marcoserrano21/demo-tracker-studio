
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog, VehicleIssue, FsdSubscriptionAnswer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
} from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Loader2, CheckCircle, Star, Battery, User, ShoppingBag, Sparkles, Gauge } from 'lucide-react';
import { BatteryLevelPicker } from './battery-level-picker';
import { useFirebase } from '@/firebase';
import { useLocalDemoStore } from '@/local-demo/store';
import { doc, serverTimestamp, writeBatch, collection, Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { detectIssuesFromKeywords } from '@/lib/issue-keywords';
import { detectFsdSubscriptionFromKeywords } from '@/lib/fsd-keywords';
import { calculateHabitStreak, calculateDemoDayStreak } from '@/lib/habit-streak';
import {
  estimateDemoEndBattery,
  findActiveDriveLog,
  getDemoBatteryDropPercent,
  getDriveStartDate,
} from '@/lib/drive-log-utils';
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

function KpiChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              className={cn(
                'min-w-[3rem] rounded-lg font-semibold',
                selected && 'ring-2 ring-primary/30'
              )}
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function CheckinSheet({ isOpen, setIsOpen, vehicle, advisors = [], storeCode, driveLog, driveLogs = [], onVehicleUpdate }: CheckinSheetProps) {
  const { toast } = useToast();
  const { firestore, isLocalDemo } = useFirebase();
  const localCompleteCharging = useLocalDemoStore((s) => s.completeCharging);
  const localCompleteDrive = useLocalDemoStore((s) => s.completeActiveDrive);
  const [isLoading, setIsLoading] = useState(false);
  const [endBattery, setEndBattery] = useState<number | ''>(vehicle.batteryLevel);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [customerPurchased, setCustomerPurchased] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [fsdDetectedFromFeedback, setFsdDetectedFromFeedback] = useState(false);
  const [fsdSubscriptionAttached, setFsdSubscriptionAttached] = useState<FsdSubscriptionAnswer | ''>('');
  
  const formRef = useRef<HTMLFormElement>(null);

  const resolvedDriveLog = driveLog ?? findActiveDriveLog(vehicle, driveLogs);
  const isDemoCheckin = vehicle.status !== 'Charging' && resolvedDriveLog?.purpose === 'Demo';
  const checkoutBattery = resolvedDriveLog?.startBattery ?? vehicle.batteryLevel;
  const driveStartDate = getDriveStartDate(resolvedDriveLog?.startTime);
  const elapsedMinutes =
    driveStartDate != null ? Math.max(0, (Date.now() - driveStartDate.getTime()) / 60_000) : null;
  const batteryDropPercent = getDemoBatteryDropPercent(elapsedMinutes);
  const autoEndBattery = estimateDemoEndBattery(checkoutBattery, {
    startTime: resolvedDriveLog?.startTime,
  });
  const fleetFsdHint = vehicle.fsdActiveTelemetry === true;

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

  useEffect(() => {
    if (!isOpen) return;
    // Prefill from duration-based estimate; picker stays editable.
    if (vehicle.status === 'Charging') {
      setEndBattery(vehicle.batteryLevel);
    } else {
      const activeLog = driveLog ?? findActiveDriveLog(vehicle, driveLogs);
      const start = activeLog?.startBattery ?? vehicle.batteryLevel;
      setEndBattery(estimateDemoEndBattery(start, { startTime: activeLog?.startTime }));
    }
  }, [isOpen, vehicle, driveLog, driveLogs]);

  useEffect(() => {
    const detected = detectFsdSubscriptionFromKeywords(feedbackText);
    setFsdDetectedFromFeedback(detected);
    if (detected) {
      setCustomerPurchased(true);
      setFsdSubscriptionAttached('Y');
    }
  }, [feedbackText]);


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      formRef.current?.reset();
      setEndBattery(vehicle.batteryLevel);
      setRating(0);
      setHoverRating(0);
      setCustomerPurchased(false);
      setFeedbackText('');
      setFsdDetectedFromFeedback(false);
      setFsdSubscriptionAttached('');
    }
    setIsOpen(open);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLocalDemo && !firestore) {
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

      if (isLocalDemo) {
        localCompleteCharging(vehicle.id, numericEndBattery);
        toast({ title: 'Success', description: 'Charging completed successfully.' });
        onVehicleUpdate({ ...vehicle, status: 'Available', batteryLevel: numericEndBattery });
        setIsOpen(false);
        setIsLoading(false);
        return;
      }
      
      const vehicleRef = doc(firestore!, `stores/${storeCode}/vehicles/${vehicle.id}`);
      const batch = writeBatch(firestore!);
      batch.update(vehicleRef, {
        status: 'Available',
        batteryLevel: numericEndBattery,
        batterySource: 'manual',
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
    const feedback = formData.get('feedback') as string;
    
    if (!advisor) {
      toast({ variant: 'destructive', title: 'Error', description: 'Check-in advisor is required.' });
      setIsLoading(false);
      return;
    }

    // Prefill uses duration-based drop; advisors can override via the picker.
    const formBattery = formData.get('endBattery');
    const startBattery = activeDriveLog.startBattery ?? vehicle.batteryLevel;
    const numericEndBattery =
      formBattery !== null && formBattery !== ''
        ? Number(formBattery)
        : estimateDemoEndBattery(startBattery, { startTime: activeDriveLog.startTime });

    if (!Number.isFinite(numericEndBattery) || numericEndBattery < 0 || numericEndBattery > 100) {
        toast({ variant: 'destructive', title: 'Error', description: 'Enter a valid battery level (0–100).' });
        setIsLoading(false);
        return;
    }

    const startTime = activeDriveLog.startTime instanceof Timestamp ? activeDriveLog.startTime.toDate() : new Date(activeDriveLog.startTime);
    
    let issueDetected = false;
    const fsdFromKeywords = detectFsdSubscriptionFromKeywords(feedback || '');
    if (feedback) {
        issueDetected = detectIssuesFromKeywords(feedback);
    }

    const isDemoPurpose = activeDriveLog.purpose === 'Demo';
    // Sales Outcome is optional at check-in - blank purchase / FSD-sub is allowed.
    const fsdSubAnswer: FsdSubscriptionAnswer | '' = fsdSubscriptionAttached || (fsdFromKeywords ? 'Y' : '');
    const purchased = (customerPurchased || fsdSubAnswer === 'Y' || fsdFromKeywords) && isDemoPurpose;
    const fsdSubscribed = isDemoPurpose && (fsdSubAnswer === 'Y' || fsdFromKeywords);
    // FSD Supervised is always logged as activated for completed demos (no advisor Y/N).
    const fsdWasActivated = isDemoPurpose;
    const fsdActivatedSource = isDemoPurpose
      ? fleetFsdHint
        ? 'fleet_api'
        : 'advisor'
      : undefined;

    const expectedMs = (activeDriveLog.expectedDuration || vehicle.expectedDuration || 0) * 60 * 1000;
    const onTimeReturn = expectedMs > 0 ? Date.now() <= startTime.getTime() + expectedMs : false;

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

    const vehicleUpdateData: any = {
        status: newStatus,
        batteryLevel: numericEndBattery,
        batterySource: 'manual',
        currentDriveId: null,
        driveStartedAt: null,
        expectedDuration: null,
    };
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

    if (purchased) {
        driveLogUpdateData.customerPurchased = true;
        driveLogUpdateData.purchaseModel = vehicle.model;
        driveLogUpdateData.purchaseTrim = vehicle.trim;
    }

    if (isDemoPurpose) {
        driveLogUpdateData.demoCompleted = true;
        driveLogUpdateData.fsdActivated = fsdWasActivated;
        if (fsdActivatedSource) {
          driveLogUpdateData.fsdActivatedSource = fsdActivatedSource;
        }
        if (fsdSubAnswer) {
          driveLogUpdateData.fsdSubscriptionAttached = fsdSubAnswer;
        }
    }

    if (fsdSubscribed) {
      driveLogUpdateData.fsdSubscribed = true;
    }

    if (isLocalDemo) {
      localCompleteDrive({
        vehicle,
        driveLogId: activeDriveLog.id,
        vehiclePatch: {
          status: newStatus,
          batteryLevel: numericEndBattery,
          batterySource: 'manual',
          currentDriveId: undefined,
          driveStartedAt: undefined,
          expectedDuration: undefined,
        },
        drivePatch: {
          ...driveLogUpdateData,
          endTime: Timestamp.now(),
        },
      });
      setIsOpen(false);
      toast({
        title: 'Drive logged',
        description: 'Fleet updated. FSD logged.',
      });
      setIsLoading(false);
      return;
    }

    const vehicleRef = doc(firestore!, `stores/${storeCode}/vehicles/${vehicle.id}`);
    const driveLogRef = doc(firestore!, `stores/${storeCode}/demo_drives/${activeDriveLog.id}`);

    const batch = writeBatch(firestore!);

    batch.update(vehicleRef, vehicleUpdateData);

    if (fsdSubscribed) {
        const fsdOrderRef = doc(collection(firestore!, `stores/${storeCode}/fsd_orders`));
        const creditedAdvisor = advisors.find(a => a.name === (activeDriveLog.coPilot || advisor));
        batch.set(fsdOrderRef, {
            storeId: storeCode,
            customerLabel: `Demo · ${vehicle.model} ···${vehicle.vin.slice(-4)}`,
            orderedAt: Timestamp.now(),
            fsdSubscribed: true,
            source: 'demo_checkin',
            advisorId: creditedAdvisor?.id,
            advisorName: activeDriveLog.coPilot || advisor,
            driveLogId: activeDriveLog.id,
            notes: feedback || undefined,
            createdAt: serverTimestamp(),
            createdBy: advisor,
        });
    }

    // Lightweight CRM outcome (no PII) - only when purchase / FSD-sub are set at check-in.
    // FSD activated alone does not create an outcome (it is always true for demos).
    // Advisors can complete outcomes later via History → Edit; that path upserts + audits.
    if (isDemoPurpose && (purchased || fsdSubscribed)) {
        const outcomeRef = doc(collection(firestore!, `stores/${storeCode}/demo_outcomes`));
        batch.set(outcomeRef, {
            storeId: storeCode,
            driveLogId: activeDriveLog.id,
            vehicleModel: vehicle.model,
            vehicleTrim: vehicle.trim,
            vehicleVinLast6: vehicle.vin.slice(-6),
            advisorName: activeDriveLog.coPilot || advisor,
            customerPurchased: !!purchased,
            fsdSubscribed: !!fsdSubscribed,
            fsdActivated: true,
            outcomeLabel: `Demo · ${vehicle.model} ···${vehicle.vin.slice(-4)}`,
            createdAt: serverTimestamp(),
            createdBy: advisor,
        });
    }

    batch.update(driveLogRef, driveLogUpdateData);

    let newIssueRefPath: string | undefined;
    if (issueDetected) {
        const newIssueRef = doc(collection(firestore!, `stores/${storeCode}/vehicles/${vehicle.id}/vehicle_issues`));
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
        toast({
          title: 'Drive logged',
          description: 'Fleet updated · FSD logged · performance updated.',
        });

        if (activeDriveLog.purpose === 'Demo') {
          const creditedAdvisor = advisors.find(a => a.name === (activeDriveLog.coPilot || advisor));
          if (creditedAdvisor) {
            const driveDate = startTime;
            const isWeekend = driveDate.getDay() === 0 || driveDate.getDay() === 6;
            const habit = calculateHabitStreak(driveLogs, creditedAdvisor.name);
            const streakDays = Math.max(habit.current, calculateDemoDayStreak(driveLogs, creditedAdvisor.name));
            const xpCalculation = calculateDriveXP({
              rating: rating > 0 ? rating : undefined,
              reviewLength: feedback ? countParagraphs(feedback) : 0,
              issueFound: issueDetected,
              isWeekend,
              streakDays,
              customerPurchased: purchased,
              fsdSubscribed,
              fsdActivated: fsdWasActivated,
              onTimeReturn,
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
                hint={
                  vehicle.status === 'Charging'
                    ? 'Match the charge shown on the vehicle screen'
                    : `Defaults to checkout −${batteryDropPercent}% · adjust if needed`
                }
                required
              />
              <BatteryLevelPicker
                name="endBattery"
                value={endBattery}
                onChange={setEndBattery}
                min={0}
                hint={
                  vehicle.status === 'Charging'
                    ? 'Record the charge level when charging completes.'
                    : `Pre-filled at ${autoEndBattery}% (${checkoutBattery}% − ${batteryDropPercent}). Change only if the screen shows a different level.`
                }
              />
            </DriveFlowSection>

            {isDemoCheckin && (
              <>
                <DriveFlowSection>
                  <DriveFlowFieldHeader
                    icon={Star}
                    title="Feedback & issues"
                    hint="Optional but encouraged - keywords auto-flag maintenance · +XP for quality notes"
                  />
                  <Textarea
                    name="feedback"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Customer loved acceleration. Slight rattle noted…"
                    className="min-h-[108px] rounded-xl border border-border/60 bg-background/80 resize-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {fsdDetectedFromFeedback && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      FSD subscription detected from feedback - set to Y
                    </p>
                  )}
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
                    hint="Optional - purchase + FSD-sub can be filled now or later in History"
                  />
                  <div className="space-y-4">
                    {fleetFsdHint && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Fleet API suggested FSD was active during this drive
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      FSD (Supervised) is logged as activated for every completed demo.
                    </p>
                    <KpiChoiceRow
                      label="FSD subscription attached to order"
                      value={fsdSubscriptionAttached}
                      options={[
                        { value: 'Y', label: 'Y' },
                        { value: 'N', label: 'N' },
                        { value: 'NA', label: 'NA' },
                      ]}
                      onChange={(v) => setFsdSubscriptionAttached(v as FsdSubscriptionAnswer)}
                    />
                    <Button
                      type="button"
                      variant={customerPurchased ? 'default' : 'outline'}
                      className={cn(
                        'w-full h-auto min-h-12 rounded-xl justify-start gap-3 px-4 py-3 text-left whitespace-normal',
                        customerPurchased && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
                      )}
                      onClick={() => setCustomerPurchased((prev) => !prev)}
                      aria-pressed={customerPurchased}
                    >
                      <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        <span className="font-semibold text-sm">
                          {customerPurchased ? 'Purchase recorded' : 'Mark purchase / order'}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-normal whitespace-normal break-words text-wrap max-w-full',
                            customerPurchased ? 'text-emerald-50/90' : 'text-muted-foreground',
                          )}
                        >
                          {customerPurchased
                            ? 'Outcome logged · no customer PII · +50 XP'
                            : 'Optional · no name or contact stored'}
                        </span>
                      </span>
                    </Button>
                  </div>
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
