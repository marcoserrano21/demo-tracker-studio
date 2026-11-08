
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { DriveLog, Advisor, Vehicle, FsdSubscriptionAnswer } from '@/lib/types';
import { useFirebase } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { dedupeAdvisors, findAdvisorBySelectValue, getAdvisorSelectValue, resolveAdvisorId } from './drive-flow-sheet-ui';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { formatAuditChangeSummary, writeAuditLog, type AuditChange } from '@/lib/audit-log';
import { estimateDemoEndBattery, getDriveStartDate } from '@/lib/drive-log-utils';

interface EditDriveLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: DriveLog;
  storeCode: string;
  advisors: Advisor[];
  vehicles: Vehicle[];
  onUpdateLog: (updatedLog: DriveLog) => void;
  /** Who is performing the edit - used for audit_logs.userName */
  editorName: string;
}

const toDateTimeLocal = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      if (typeof timestamp === 'string' && timestamp.includes('T')) {
          const d = new Date(timestamp);
          if (!isNaN(d.getTime())) {
            return timestamp.slice(0, 16);
          }
      }
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
};

const NA_VALUE = "N/A";
const FSD_SUB_UNSET = '__unset__';

type EditFormValues = Omit<Partial<DriveLog>, 'fsdSubscriptionAttached' | 'fsdActivated' | 'customerPurchased'> & {
  fsdSubscriptionAttached?: FsdSubscriptionAnswer | typeof FSD_SUB_UNSET | '';
  customerPurchased?: boolean;
  fsdActivated?: boolean;
};

const SALES_OUTCOME_FIELDS = new Set([
  'customerPurchased',
  'fsdSubscriptionAttached',
  'fsdSubscribed',
  'fsdActivated',
  'purchaseModel',
  'purchaseTrim',
]);

function salesOutcomeLabel(value: unknown): string {
  if (value === undefined || value === null || value === '' || value === FSD_SUB_UNSET) return '(unset)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function EditDriveLogDialog({
  isOpen,
  onClose,
  log,
  storeCode,
  advisors,
  vehicles,
  onUpdateLog,
  editorName,
}: EditDriveLogDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { isSubmitting } } = useForm<EditFormValues>({
    defaultValues: {}
  });

  const sortedAdvisors = useMemo(() => {
    return dedupeAdvisors(advisors).sort((a, b) => a.name.localeCompare(b.name));
  }, [advisors]);

  const isDemoLog = log.purpose === 'Demo';
  const customerPurchasedWatch = watch('customerPurchased');
  const fsdSubWatch = watch('fsdSubscriptionAttached');

  useEffect(() => {
    if (log && isOpen) {
        const startLocal = toDateTimeLocal(log.startTime);
        // Check-in advisor defaults to checkout advisor when unset
        const checkInAdvisor =
          log.advisorIn && log.advisorIn !== NA_VALUE
            ? log.advisorIn
            : log.coPilot || NA_VALUE;

        // Time In: keep existing, else estimate from start + expected duration, else now
        let endLocal = toDateTimeLocal(log.endTime);
        if (!endLocal) {
          const startDate = getDriveStartDate(log.startTime);
          if (startDate) {
            const durationMin = log.expectedDuration && log.expectedDuration > 0 ? log.expectedDuration : 40;
            endLocal = format(
              new Date(startDate.getTime() + durationMin * 60_000),
              "yyyy-MM-dd'T'HH:mm",
            );
          } else {
            endLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");
          }
        }

        // End battery: keep existing, else estimate from start battery + elapsed drive time
        const endBatteryDefault =
          log.endBattery != null && Number.isFinite(Number(log.endBattery))
            ? Number(log.endBattery)
            : estimateDemoEndBattery(Number(log.startBattery) || 0, { startTime: log.startTime });

        reset({
            coPilot: log.coPilot,
            advisorIn: checkInAdvisor,
            startTime: startLocal,
            endTime: endLocal,
            startBattery: log.startBattery,
            endBattery: endBatteryDefault,
            feedback: log.feedback,
            issueDetected: log.issueDetected,
            customerPurchased: !!log.customerPurchased,
            fsdSubscriptionAttached: log.fsdSubscriptionAttached || FSD_SUB_UNSET,
            fsdActivated: log.fsdActivated !== false,
        });
    }
  }, [log, isOpen, reset]);

  const handleBatteryBlur = (e: React.FocusEvent<HTMLInputElement>, fieldName: 'startBattery' | 'endBattery') => {
      let value = parseInt(e.target.value, 10);
      if (isNaN(value)) value = 0;
      if (value > 100) value = 100;
      if (value < 0) value = 0;
      setValue(fieldName, value);
  };

  const onSubmit = async (data: EditFormValues) => {
    if (!firestore) return;
    setIsSaving(true);

    try {
      const logRef = doc(firestore, `stores/${storeCode}/demo_drives/${log.id}`);
      
      const updates: { [key: string]: any } = {};
      const changes: AuditChange[] = [];

      const trackChange = (field: string, previous: unknown, next: unknown) => {
        if (previous === next) return;
        // Treat undefined vs null as equivalent for "cleared" comparisons where needed
        if (previous == null && next == null) return;
        updates[field] = next;
        changes.push({ field, previous, next });
      };

      if (data.coPilot !== log.coPilot) {
        trackChange('coPilot', log.coPilot, data.coPilot);
      }
      
      const advisorInValue = data.advisorIn === NA_VALUE ? null : data.advisorIn;
      if (advisorInValue !== (log.advisorIn ?? null)) {
        trackChange('advisorIn', log.advisorIn ?? null, advisorInValue);
      }
      
      if (data.feedback !== log.feedback) {
        trackChange('feedback', log.feedback ?? '', data.feedback ?? '');
      }
      if (data.issueDetected !== log.issueDetected) {
        trackChange('issueDetected', log.issueDetected ?? false, !!data.issueDetected);
      }

      if (Number(data.startBattery) !== log.startBattery) {
        trackChange('startBattery', log.startBattery, Number(data.startBattery));
      }
      if (data.endBattery !== undefined && Number(data.endBattery) !== log.endBattery) {
        trackChange('endBattery', log.endBattery, Number(data.endBattery));
      }
      
      let newStartTime: Timestamp | null = null;
      if (data.startTime && toDateTimeLocal(data.startTime) !== toDateTimeLocal(log.startTime)) {
        const startTimeValue = typeof data.startTime === 'string' ? data.startTime : data.startTime instanceof Date ? data.startTime.toISOString() : new Date().toISOString();
        newStartTime = Timestamp.fromDate(new Date(startTimeValue));
        trackChange('startTime', toDateTimeLocal(log.startTime), toDateTimeLocal(data.startTime));
        updates.startTime = newStartTime;
      }
      
      if (data.endTime !== undefined && toDateTimeLocal(data.endTime) !== toDateTimeLocal(log.endTime)) {
        if (data.endTime && typeof data.endTime === 'string') {
            const nextEnd = Timestamp.fromDate(new Date(data.endTime));
            trackChange('endTime', toDateTimeLocal(log.endTime), toDateTimeLocal(data.endTime));
            updates.endTime = nextEnd;
        } else {
            trackChange('endTime', toDateTimeLocal(log.endTime), null);
            updates.endTime = null;
        }
      }

      // Sales Outcome (editable after the fact for anyone who can edit history)
      if (isDemoLog) {
        const nextPurchased = !!data.customerPurchased;
        if (nextPurchased !== !!log.customerPurchased) {
          trackChange('customerPurchased', !!log.customerPurchased, nextPurchased);
        }
        if (nextPurchased && (nextPurchased !== !!log.customerPurchased || !log.purchaseModel || !log.purchaseTrim)) {
          if (log.purchaseModel !== log.vehicleModel) {
            trackChange('purchaseModel', log.purchaseModel, log.vehicleModel);
          }
          if (log.purchaseTrim !== log.vehicleTrim) {
            trackChange('purchaseTrim', log.purchaseTrim, log.vehicleTrim);
          }
          updates.purchaseModel = log.vehicleModel;
          updates.purchaseTrim = log.vehicleTrim;
        } else if (!nextPurchased && log.customerPurchased) {
          trackChange('purchaseModel', log.purchaseModel, null);
          trackChange('purchaseTrim', log.purchaseTrim, null);
        }

        const rawFsdSub = data.fsdSubscriptionAttached;
        const nextFsdSub: FsdSubscriptionAnswer | null =
          !rawFsdSub || rawFsdSub === FSD_SUB_UNSET
            ? null
            : (rawFsdSub as FsdSubscriptionAnswer);
        const prevFsdSub = log.fsdSubscriptionAttached ?? null;
        if (nextFsdSub !== prevFsdSub) {
          trackChange('fsdSubscriptionAttached', prevFsdSub, nextFsdSub);
        }

        const nextFsdSubscribed = nextFsdSub === 'Y';
        if (nextFsdSubscribed !== !!log.fsdSubscribed) {
          trackChange('fsdSubscribed', !!log.fsdSubscribed, nextFsdSubscribed);
        }

        const nextFsdActivated = !!data.fsdActivated;
        if (nextFsdActivated !== !!log.fsdActivated) {
          trackChange('fsdActivated', !!log.fsdActivated, nextFsdActivated);
        }
      }

      if (Object.keys(updates).length === 0) {
        toast({ title: 'No changes', description: 'Nothing to save.' });
        setIsSaving(false);
        onClose();
        return;
      }

      const batch = writeBatch(firestore);
      batch.update(logRef, updates);

      const vehicleForLog = vehicles.find(v => v.currentDriveId === log.id);
      if (vehicleForLog && newStartTime) {
        const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleForLog.id}`);
        batch.update(vehicleRef, {
            driveStartedAt: newStartTime.toDate().getTime()
        });
      }

      // Upsert CRM demo_outcomes when Sales Outcome fields changed (or were completed later)
      const salesChanges = changes.filter((c) => SALES_OUTCOME_FIELDS.has(c.field));
      if (isDemoLog && salesChanges.length > 0) {
        const merged = { ...log, ...updates } as DriveLog;
        const purchased = !!merged.customerPurchased;
        const fsdSubscribed = merged.fsdSubscriptionAttached === 'Y' || !!merged.fsdSubscribed;
        const fsdActivated = !!merged.fsdActivated;

        const outcomesQuery = query(
          collection(firestore, `stores/${storeCode}/demo_outcomes`),
          where('driveLogId', '==', log.id),
          limit(1),
        );
        const existing = await getDocs(outcomesQuery);
        const outcomePayload = {
          storeId: storeCode,
          driveLogId: log.id,
          vehicleModel: log.vehicleModel,
          vehicleTrim: log.vehicleTrim,
          vehicleVinLast6: log.vehicleVin.slice(-6),
          advisorName: merged.coPilot || merged.advisorIn || editorName,
          customerPurchased: purchased,
          fsdSubscribed,
          fsdActivated,
          outcomeLabel: `Demo · ${log.vehicleModel} ···${log.vehicleVin.slice(-4)}`,
          updatedAt: serverTimestamp(),
          updatedBy: editorName,
        };

        if (!existing.empty) {
          const existingDoc = existing.docs[0];
          batch.update(existingDoc.ref, outcomePayload);
        } else if (purchased || fsdSubscribed) {
          // Don't create CRM rows for FSD-activated alone (always true on demos).
          const outcomeRef = doc(collection(firestore, `stores/${storeCode}/demo_outcomes`));
          batch.set(outcomeRef, {
            ...outcomePayload,
            createdAt: serverTimestamp(),
            createdBy: editorName,
          });
        }
      }

      const salesSummary = salesChanges.length > 0
        ? `Sales Outcome: ${salesChanges.map((c) => `${c.field} ${salesOutcomeLabel(c.previous)}→${salesOutcomeLabel(c.next)}`).join(', ')}`
        : '';
      const description =
        salesSummary ||
        `Edited drive log ${log.vehicleModel} (...${log.vehicleVin.slice(-6)}): ${formatAuditChangeSummary(changes)}`;

      await writeAuditLog({
        firestore,
        storeId: storeCode,
        userName: editorName || 'Unknown',
        action: 'edit_log',
        targetId: log.id,
        targetType: 'DriveLog',
        description,
        changes,
        batch,
      });

      await batch.commit();
      
      const updatedLog = { ...log, ...updates };
      onUpdateLog(updatedLog as DriveLog);
      
      toast({ title: 'Success', description: 'Drive log updated successfully.' });
      onClose();
    } catch (error: any) {
      console.error("Update Error:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update drive log.' });
    } finally {
      setIsSaving(false);
    }
  };

  const busy = isSubmitting || isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit History Log</DialogTitle>
          <DialogDescription>
            Modify details for the drive with {log.vehicleModel} (...{log.vehicleVin.slice(-6)}).
            Check-in advisor, time in, and end battery are prefilled when missing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto space-y-4 py-4 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Checkout Advisor</Label>
                <Controller
                    name="coPilot"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onValueChange={(selectValue) => field.onChange(findAdvisorBySelectValue(sortedAdvisors, selectValue)?.name ?? '')}
                            value={resolveAdvisorId(sortedAdvisors, field.value ?? '') || undefined}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {sortedAdvisors.map((a, index) => (
                                  <SelectItem key={getAdvisorSelectValue(a, index)} value={getAdvisorSelectValue(a, index)}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            <div className="space-y-2">
                <Label>Check-in Advisor</Label>
                <Controller
                    name="advisorIn"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onValueChange={(selectValue) => {
                              if (selectValue === NA_VALUE) field.onChange(NA_VALUE);
                              else field.onChange(findAdvisorBySelectValue(sortedAdvisors, selectValue)?.name ?? '');
                            }}
                            value={
                              field.value === NA_VALUE || !field.value
                                ? NA_VALUE
                                : resolveAdvisorId(sortedAdvisors, field.value) || NA_VALUE
                            }
                        >
                            <SelectTrigger><SelectValue placeholder="Select advisor" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NA_VALUE}>N/A</SelectItem>
                                {sortedAdvisors.map((a, index) => (
                                  <SelectItem key={getAdvisorSelectValue(a, index)} value={getAdvisorSelectValue(a, index)}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Time Out</Label>
              <Input
                id="start-time"
                type="datetime-local"
                {...register('startTime')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Time In</Label>
              <Input
                id="end-time"
                type="datetime-local"
                {...register('endTime')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Start Battery %</Label>
                <Input type="number" {...register('startBattery')} onBlur={(e) => handleBatteryBlur(e, 'startBattery')} />
            </div>
            <div className="space-y-2">
                <Label>End Battery %</Label>
                <Input type="number" {...register('endBattery')} onBlur={(e) => handleBatteryBlur(e, 'endBattery')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Feedback</Label>
            <Textarea {...register('feedback')} />
          </div>
           <div className="flex items-center space-x-2">
             <Controller
                name="issueDetected"
                control={control}
                render={({ field }) => (
                    <Switch
                        id="issueDetected"
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="issueDetected">Issue Detected</Label>
          </div>

          {isDemoLog && (
            <div className="space-y-4 rounded-lg border border-border/60 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Sales Outcome</p>
                <p className="text-xs text-muted-foreground">
                  Optional at check-in - complete or correct here. Changes are audited.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="customerPurchased"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="customerPurchased"
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="customerPurchased">Purchase / order placed (no customer PII)</Label>
              </div>
              <div className="space-y-2">
                <Label>FSD subscription attached</Label>
                <Controller
                  name="fsdSubscriptionAttached"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || FSD_SUB_UNSET}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FSD_SUB_UNSET}>Unset</SelectItem>
                        <SelectItem value="Y">Y</SelectItem>
                        <SelectItem value="N">N</SelectItem>
                        <SelectItem value="NA">NA</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="fsdActivated"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="fsdActivated"
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="fsdActivated">FSD (Supervised) activated</Label>
              </div>
              {(customerPurchasedWatch || fsdSubWatch === 'Y') && (
                <p className={cn('text-xs text-muted-foreground')}>
                  CRM outcome will be created or updated when you save.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 sticky bottom-0 bg-background">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
