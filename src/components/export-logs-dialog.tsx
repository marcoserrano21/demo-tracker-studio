
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import type { DriveLog } from '@/lib/types';

interface ExportLogsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeCode: string;
}

export function ExportLogsDialog({ isOpen, onClose, storeCode }: ExportLogsDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleExport = async () => {
    if (!firestore) return;
    
    setIsDownloading(true);
    try {
      // Fetch drive logs within date range
      const logsRef = collection(firestore, `stores/${storeCode}/demo_drives`);
      let logsQuery = query(logsRef);
      
      if (dateRange?.from) {
        logsQuery = query(logsQuery, where('startTime', '>=', Timestamp.fromDate(dateRange.from)));
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        logsQuery = query(logsQuery, where('startTime', '<=', Timestamp.fromDate(endOfDay)));
      }
      
      const snapshot = await getDocs(logsQuery);
      
      if (snapshot.empty) {
        toast({ title: 'Export Info', description: 'There are no drive logs in the selected date range to export.' });
        onClose();
        return;
      }
      
      // Convert to CSV
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriveLog));
      const csvData = convertLogsToCSV(logs);
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `drive_logs_${storeCode}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast({ title: 'Export Successful', description: 'CSV file is downloading.' });
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not generate or download the CSV file.' });
    } finally {
      setIsDownloading(false);
      onClose();
    }
  };
  
  const convertLogsToCSV = (logs: DriveLog[]): string => {
    const headers = ['Date', 'Vehicle', 'Advisor', 'Co-Pilot', 'Purpose', 'Start Battery', 'End Battery', 'Feedback', 'Issue'];
    const rows = logs.map(log => [
      log.startTime ? new Date((log.startTime as any).toDate?.() || log.startTime).toLocaleDateString() : '',
      log.vehicleId || '',
      log.advisorIn || '',
      log.coPilot || '',
      log.purpose || '',
      log.startBattery?.toString() || '',
      log.endBattery?.toString() || '',
      log.feedback || '',
      log.issueDetected ? 'Yes' : 'No'
    ]);
    
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Drive Logs</DialogTitle>
          <DialogDescription>
            Select a date range to export the drive logs for this store.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
             <p className="text-sm text-muted-foreground">
                Only drive logs within the selected date range will be included in the CSV file.
             </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDownloading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isDownloading ? 'Exporting...' : 'Confirm Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
