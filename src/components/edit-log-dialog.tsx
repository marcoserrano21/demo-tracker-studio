
'use client';

import { useEffect, useMemo } from 'react';
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
import type { DriveLog, Advisor, Vehicle } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { dedupeAdvisors, findAdvisorBySelectValue, getAdvisorSelectValue, resolveAdvisorId } from './drive-flow-sheet-ui';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';

interface EditDriveLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: DriveLog;
  storeCode: string;
  advisors: Advisor[];
  vehicles: Vehicle[];
  onUpdateLog: (updatedLog: DriveLog) => void;
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

export function EditDriveLogDialog({ isOpen, onClose, log, storeCode, advisors, vehicles, onUpdateLog }: EditDriveLogDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const { register, handleSubmit, control, reset, setValue, formState: { isSubmitting, errors } } = useForm<Partial<DriveLog>>({
    defaultValues: {}
  });

  const sortedAdvisors = useMemo(() => {
    return dedupeAdvisors(advisors).sort((a, b) => a.name.localeCompare(b.name));
  }, [advisors]);

  useEffect(() => {
    if(log && isOpen) {
        reset({
            coPilot: log.coPilot,
            advisorIn: log.advisorIn || NA_VALUE,
            startTime: toDateTimeLocal(log.startTime),
            endTime: toDateTimeLocal(log.endTime),
            startBattery: log.startBattery,
            endBattery: log.endBattery,
            feedback: log.feedback,
            issueDetected: log.issueDetected,
        });
    }
  }, [log, isOpen, reset]);

  const handleBatteryBlur = (e: React.FocusEvent<HTMLInputElement>, fieldName: 'startBattery' | 'endBattery') => {
      let value = parseInt(e.target.value, 10);
      if (isNaN(value)) value = 1;
      if (value > 100) value = 100;
      if (value < 1) value = 1;
      setValue(fieldName, value);
  };

  const onSubmit = async (data: Partial<DriveLog>) => {
    if (!firestore) return;

    try {
      const logRef = doc(firestore, `stores/${storeCode}/demo_drives/${log.id}`);
      
      const updates: { [key: string]: any } = {};

      if(data.coPilot !== log.coPilot) updates.coPilot = data.coPilot;
      
      const advisorInValue = data.advisorIn === NA_VALUE ? null : data.advisorIn;
      if(advisorInValue !== log.advisorIn) updates.advisorIn = advisorInValue;
      
      if(data.feedback !== log.feedback) updates.feedback = data.feedback;
      if(data.issueDetected !== log.issueDetected) updates.issueDetected = data.issueDetected;

      if (data.startBattery !== log.startBattery) updates.startBattery = Number(data.startBattery);
      if (data.endBattery !== log.endBattery) updates.endBattery = Number(data.endBattery);
      
      let newStartTime: Timestamp | null = null;
      if (data.startTime && toDateTimeLocal(data.startTime) !== toDateTimeLocal(log.startTime)) {
        const startTimeValue = typeof data.startTime === 'string' ? data.startTime : data.startTime instanceof Date ? data.startTime.toISOString() : new Date().toISOString();
        newStartTime = Timestamp.fromDate(new Date(startTimeValue));
        updates.startTime = newStartTime;
      }
      
      if (data.endTime !== undefined && toDateTimeLocal(data.endTime) !== toDateTimeLocal(log.endTime)) {
        if (data.endTime && typeof data.endTime === 'string') {
            updates.endTime = Timestamp.fromDate(new Date(data.endTime));
        } else {
            updates.endTime = null;
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(logRef, updates);
      }

      const vehicleForLog = vehicles.find(v => v.currentDriveId === log.id);
      if (vehicleForLog && newStartTime) {
        const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleForLog.id}`);
        await updateDoc(vehicleRef, {
            driveStartedAt: newStartTime.toDate().getTime()
        });
      }
      
      const updatedLog = { ...log, ...updates };
      onUpdateLog(updatedLog as DriveLog);
      
          toast({ title: 'Success', description: 'Drive log updated successfully.' });
      onClose();
    } catch (error: any) {
      console.error("Update Error:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update drive log.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Drive Log</DialogTitle>
          <DialogDescription>
            Modify details for the drive with ${log.vehicleModel} (...${log.vehicleVin.slice(-6)}).
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="issueDetected">Issue Detected</Label>
          </div>
          <DialogFooter className="pt-4 sticky bottom-0 bg-background">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
