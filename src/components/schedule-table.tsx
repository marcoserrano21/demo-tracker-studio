

'use client';

import { useTransition, useMemo, useState, useEffect } from 'react';
import type { DriveLog, Vehicle, Advisor, UserRole } from '@/lib/types';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { CalendarClock, User, Info, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { formatMinutesToHoursAndMinutes, cn } from '@/lib/utils';
import { Button } from './ui/button';
import { PlayCircle, XCircle, Loader2, Calendar, Timer } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import CheckoutSheet from './checkout-sheet';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  canStartScheduledDrive,
  isScheduledDrivePastDue,
  isScheduledDriveTooEarly,
  SCHEDULE_EARLY_START_MINUTES,
} from '@/lib/drive-log-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface ScheduleTableProps {
  driveLogs: DriveLog[];
  storeCode: string;
  vehicles: Vehicle[];
  advisors: Advisor[];
  currentAdvisor: Advisor;
  userRole: UserRole;
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  searchQuery?: string;
  sortBy?: string;
}

export default function ScheduleTable({ driveLogs, storeCode, vehicles, advisors, currentAdvisor, userRole, onVehicleUpdate, searchQuery, sortBy }: ScheduleTableProps) {
  const { firestore } = useFirebase();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<DriveLog | null>(null);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'sm';
  const isTablet = breakpoint === 'md';

  const handleStartDriveClick = (log: DriveLog) => {
    setSelectedLog(log);
    setCheckoutOpen(true);
  };

  // Clean up overdue drives that are more than 1 day old
  useEffect(() => {
    const cleanupOverdueDrives = async () => {
      if (!firestore) return;
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Find drives that are more than 1 day overdue
      const overdueDrives = driveLogs.filter(log => {
        const getLogDate = (log: DriveLog) => {
          if (log.startTime) {
            return (log.startTime as any).toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
          }
          return new Date();
        };
        
        const logDate = getLogDate(log);
        return logDate < yesterday && log.purpose === 'Scheduled';
      });
      
      // Delete overdue drives
      for (const log of overdueDrives) {
        try {
          const driveLogRef = doc(firestore, `stores/${storeCode}/demo_drives/${log.id}`);
          await deleteDoc(driveLogRef);
          
          // Check if vehicle should be set back to Available
          const vehicle = vehicles.find(v => v.id === log.vehicleId);
          if (vehicle && vehicle.status === 'Scheduled') {
            const q = query(
              collection(firestore, `stores/${storeCode}/demo_drives`), 
              where('vehicleId', '==', log.vehicleId), 
              where('purpose', '==', 'Scheduled')
            );
            const remainingDrives = await getDocs(q);
            
            if (remainingDrives.empty) {
              const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${log.vehicleId}`);
              updateDocumentNonBlocking(vehicleRef, { status: 'Available' });
              onVehicleUpdate({ id: log.vehicleId, status: 'Available' });
            }
          }
        } catch (error) {
          console.error('Error deleting overdue drive:', error);
        }
      }
    };
    
    cleanupOverdueDrives();
  }, [driveLogs, firestore, storeCode, vehicles, onVehicleUpdate]);

  // Filter drives for current day only - only show scheduled drives that haven't ended
  const todaysDrives = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return driveLogs.filter(log => {
      // Only include scheduled drives that haven't ended
      if (log.purpose !== 'Scheduled' || log.endTime) return false;
      
      const getLogDate = (log: DriveLog) => {
        if (log.startTime) {
          return (log.startTime as any).toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
        }
        return new Date();
      };
      
      const logDate = getLogDate(log);
      return logDate >= todayStart && logDate <= todayEnd;
    });
  }, [driveLogs]);

  // Sort drive logs based on sortBy prop and apply pagination
  const sortedDriveLogs = useMemo(() => {
    let sorted = todaysDrives;
    
    if (sortBy) {
      sorted = [...todaysDrives].sort((a, b) => {
        switch (sortBy) {
          case 'vehicle':
            // Use vehicleModel from the log directly for consistent sorting
            const modelA = a.vehicleModel || vehicles.find(v => v.id === a.vehicleId)?.model || '';
            const modelB = b.vehicleModel || vehicles.find(v => v.id === b.vehicleId)?.model || '';
            return modelA.localeCompare(modelB);
          case 'advisor':
            // Use coPilot field for advisor sorting
            const advisorA = a.coPilot || a.advisorIn || '';
            const advisorB = b.coPilot || b.advisorIn || '';
            return advisorA.localeCompare(advisorB);
          case 'date':
          default:
            // Use startTime field for date sorting
            const getLogDate = (log: DriveLog) => {
              if (log.startTime) {
                return (log.startTime as any).toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
              }
              return new Date();
            };
            const dateA = getLogDate(a);
            const dateB = getLogDate(b);
            return dateA.getTime() - dateB.getTime();
        }
      });
    }
    
    return sorted;
  }, [todaysDrives, sortBy, vehicles]);
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedDriveLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDriveLogs = sortedDriveLogs.slice(startIndex, endIndex);

  const handleCancelDrive = (driveId: string, vehicleId: string) => {
    startTransition(async () => {
        if (!firestore) return;

        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;
        
        const driveLogRef = doc(firestore, `stores/${storeCode}/demo_drives/${driveId}`);
        await deleteDoc(driveLogRef);

        const q = query(collection(firestore, `stores/${storeCode}/demo_drives`), where('vehicleId', '==', vehicleId), where('purpose', '==', 'Scheduled'));
        const scheduledDrivesSnap = await getDocs(q);
        
        const otherScheduledDrives = scheduledDrivesSnap.docs.filter(d => d.id !== driveId);

        if (otherScheduledDrives.length === 0 && vehicle.status === 'Scheduled') {
            const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleId}`);
            updateDocumentNonBlocking(vehicleRef, { status: 'Available' });
            onVehicleUpdate({ id: vehicleId, status: 'Available' });
        }
    });
};

  const formatDateTime = (timestamp: number | Date | Timestamp) => {
    let date: Date;
    if ((timestamp as any)?.toDate) {
      date = (timestamp as any).toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as number);
    }
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const selectedVehicle = useMemo(() => {
    if (!selectedLog) return null;
    return vehicles.find(v => v.id === selectedLog.vehicleId) || null;
  }, [selectedLog, vehicles]);


  if (sortedDriveLogs.length === 0) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-muted/10 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted-foreground/20 mb-6">
            <CalendarClock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Scheduled Drives Today</h3>
          <p className="text-muted-foreground">All drives scheduled for today are displayed here</p>
        </CardContent>
      </Card>
    );
  }
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground mx-3">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  const renderLogItem = (log: DriveLog) => {
    // Get scheduled time from startTime field (main field in DriveLog)
    const getScheduledTime = () => {
      if (log.startTime) {
        return (log.startTime as any).toDate ? (log.startTime as any).toDate().getTime() : new Date(log.startTime as any).getTime();
      }
      return Date.now();
    };
    
    const scheduledTime = getScheduledTime();
    const isPastDue = isScheduledDrivePastDue(log.startTime);
    const tooEarly = isScheduledDriveTooEarly(log.startTime);
    const canStart = canStartScheduledDrive(log.startTime);
    const isStartable = canStart && !isPending;
    const startBlockedTitle = tooEarly
      ? `Can only start ${SCHEDULE_EARLY_START_MINUTES} minutes before scheduled time`
      : isPastDue
        ? 'Start window has closed'
        : '';

    if (isMobile) {
      return (
        <Card key={log.id} className={cn(
          "border-border/50 bg-gradient-to-r from-card to-card/95 shadow-sm hover:shadow-md transition-all duration-200",
          isPastDue && "border-l-4 border-l-destructive/60 opacity-75"
        )}>
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {log.vehicleModel} {log.vehicleTrim}
                </CardTitle>
                {isPastDue && (
                  <div className="px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-medium text-destructive">Overdue</p>
                  </div>
                )}
              </div>
              <CardDescription className="text-sm font-medium text-primary">
                VIN: ...{log.vehicleVin.slice(-6)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-2xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 border border-muted-foreground/20 flex-shrink-0">
                  <Image
                    src={require('@/lib/data').getVehicleImage(log.vehicleModel as any, log.vehicleTrim)}
                    alt={`${log.vehicleModel} ${log.vehicleTrim}`}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-foreground">{log.coPilot || log.advisorIn || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Advisor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{formatDateTime(log.startTime)}</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">{formatMinutesToHoursAndMinutes(log.expectedDuration)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>
             {log.createdAt && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground">Scheduled {formatDateTime(log.createdAt)}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/20 border-t border-border/30 p-4 flex justify-end gap-3">
            {!isPastDue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartDriveClick(log)}
                disabled={!isStartable}
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isStartable ? startBlockedTitle : ""}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Start
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  className="rounded-xl px-4 bg-destructive/90 hover:bg-destructive"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Scheduled Drive</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently cancel the scheduled drive for {log.coPilot || 'this drive'}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Drive</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleCancelDrive(log.id, log.vehicleId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Cancel Drive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      );
    }

    return (
      <TableRow key={log.id} className={cn(
        "hover:bg-muted/30 transition-all duration-200 border-b border-border/30",
        isPastDue && "opacity-70 bg-destructive/5"
      )}>
        <TableCell className="py-4">
          <div className="space-y-1">
            <div className="font-semibold text-foreground text-sm lg:text-base">{log.vehicleModel} {log.vehicleTrim}</div>
            <div className="text-xs lg:text-sm font-medium text-primary">VIN: ...{log.vehicleVin?.slice(-6)}</div>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 lg:h-10 lg:w-10 rounded-2xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 border border-muted-foreground/20 flex-shrink-0">
              <Image
                src={require('@/lib/data').getVehicleImage(log.vehicleModel as any, log.vehicleTrim)}
                alt={`${log.vehicleModel} ${log.vehicleTrim}`}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate text-xs lg:text-sm">{log.coPilot || log.advisorIn || 'N/A'}</p>
              <p className="text-xs text-muted-foreground hidden lg:block">Advisor</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <div className="space-y-1">
            <p className="font-medium text-foreground text-xs lg:text-sm whitespace-nowrap">{format((log.startTime as any).toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any), 'MMM d, h:mm a')}</p>
            {isPastDue && (
              <div className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive">Overdue</p>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden xl:table-cell py-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-sm">{formatMinutesToHoursAndMinutes(log.expectedDuration)}</span>
          </div>
        </TableCell>
        <TableCell className="text-right py-4">
          <div className="flex items-center justify-end gap-1.5">
            {!isPastDue && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartDriveClick(log)}
                disabled={!isStartable}
                className="border-primary/30 text-primary hover:bg-primary/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed h-8 px-2 lg:px-3"
                title={!isStartable ? startBlockedTitle : ""}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 lg:mr-1.5" />}
                <span className="hidden lg:inline text-sm">Start</span>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      className="rounded-xl bg-destructive/90 hover:bg-destructive h-8 px-2 lg:px-3"
                      >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" /> : <XCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 lg:mr-1.5" />}
                      <span className="hidden lg:inline text-sm">Cancel</span>
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Scheduled Drive</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently cancel the scheduled drive for this vehicle. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Keep Drive</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleCancelDrive(log.id, log.vehicleId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Cancel Drive
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
    {isMobile ? (
       <div className="space-y-4">
        <div className="space-y-4">
          {paginatedDriveLogs.map(renderLogItem)}
        </div>
        {renderPagination()}
      </div>
    ) : (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/95 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <List className="w-5 h-5 text-primary" />
            </div>
            Scheduled Drives Today ({sortedDriveLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40">
                <TableHead className="text-foreground font-semibold">
                  Vehicle & VIN
                </TableHead>
                <TableHead className="text-foreground font-semibold">
                  Advisor
                </TableHead>
                <TableHead className="text-foreground font-semibold">
                  Scheduled Time
                </TableHead>
                <TableHead className="hidden xl:table-cell text-foreground font-semibold">
                  Duration
                </TableHead>
                <TableHead className="text-right text-foreground font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDriveLogs.map(renderLogItem)}
            </TableBody>
          </Table>
          {renderPagination()}
        </CardContent>
      </Card>
    )}
    {isCheckoutOpen && selectedVehicle && selectedLog && (
      <CheckoutSheet
        isOpen={isCheckoutOpen}
        setIsOpen={setCheckoutOpen}
        vehicle={selectedVehicle}
        vehicles={vehicles}
        advisors={advisors}
        currentAdvisor={currentAdvisor}
        storeCode={storeCode}
        userRole={userRole}
        scheduledDrives={driveLogs}
        isScheduledDriveStart
        driveLog={selectedLog}
        onVehicleUpdate={onVehicleUpdate}
      />
    )}
    </>
  );
}
