

'use client';

import { useState, useTransition, useMemo } from 'react';
import type { DriveLog, Vehicle, Advisor, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, isToday, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, getDaysInMonth, getDay } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { cn, formatMinutesToHoursAndMinutes } from '@/lib/utils';
import { Button } from './ui/button';
import { PlayCircle, XCircle, Loader2, CalendarDays, User, Clock, MapPin, Car, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { useFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import CheckoutSheet from './checkout-sheet';
import { VehiclePhoto } from './vehicle-photo';
import { getVehicleImage } from '@/lib/data';
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

interface ScheduleCalendarProps {
  driveLogs: DriveLog[];
  storeCode: string;
  vehicles: Vehicle[];
  advisors: Advisor[];
  currentAdvisor: Advisor;
  userRole: UserRole;
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

export default function ScheduleCalendar({ driveLogs, storeCode, vehicles, advisors, currentAdvisor, userRole, onVehicleUpdate }: ScheduleCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { firestore } = useFirebase();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<DriveLog | null>(null);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DriveLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleStartDriveClick = (log: DriveLog) => {
    setSelectedLog(log);
    setCheckoutOpen(true);
  };

  const handleEditDrive = (log: DriveLog) => {
    setEditingLog(log);
    setIsEditDialogOpen(true);
  };

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

  const selectedVehicle = useMemo(() => {
    if (!selectedLog) return null;
    return vehicles.find(v => v.id === selectedLog.vehicleId) || null;
  }, [selectedLog, vehicles]);

  // Group drives by date for calendar display
  const drivesByDate = useMemo(() => {
    const grouped: Record<string, DriveLog[]> = {};
    
    // Only include scheduled drives that haven't ended
    const scheduledDrives = driveLogs.filter(log => 
      log.purpose === 'Scheduled' && !log.endTime
    );
    
    scheduledDrives.forEach(log => {
      const getLogDate = () => {
        // For DriveLog interface, we only have startTime
        if (log.startTime) {
          return (log.startTime as any)?.toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
        }
        return new Date();
      };
      
      const logDate = getLogDate();
      const dateKey = format(logDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    
    return grouped;
  }, [driveLogs]);

  // Get drives for selected date
  const selectedDateDrives = useMemo(() => {
    if (!date) return [];
    const dateKey = format(date, 'yyyy-MM-dd');
    const drivesForDate = drivesByDate[dateKey] || [];
    
    // Reset to first page when date changes
    setCurrentPage(1);
    
    // Sort by scheduled time
    return drivesForDate.sort((a, b) => {
      const timeA = (a.startTime as any)?.toDate ? (a.startTime as any).toDate().getTime() : new Date(a.startTime as any).getTime();
      const timeB = (b.startTime as any)?.toDate ? (b.startTime as any).toDate().getTime() : new Date(b.startTime as any).getTime();
      return timeA - timeB;
    });
  }, [date, drivesByDate]);

  // Get all dates that have scheduled drives
  const scheduledDates = useMemo(() => {
    return driveLogs
      .filter(log => log.purpose === 'Scheduled' && !log.endTime)
      .map(log => {
      // For DriveLog interface, we only have startTime
      if (log.startTime) {
        return (log.startTime as any)?.toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
      }
      return new Date();
    });
  }, [driveLogs]);

  // Pagination calculations
  const totalPages = Math.ceil(selectedDateDrives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDrives = selectedDateDrives.slice(startIndex, endIndex);

  const formatDateTime = (timestamp: Timestamp | Date | number | any) => {
    let date: Date;
    
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else {
      return 'Invalid date';
    }
    
    return format(date, 'MMM dd, yyyy h:mm a');
  };

  // Custom Calendar Component with guaranteed grid layout
  const CustomCalendar = () => {
    const [currentMonth, setCurrentMonth] = useState(date || new Date());
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfDay(monthStart);
    const endDate = endOfDay(monthEnd);
    
    // Get first day of the week for the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = getDay(monthStart);
    const daysInMonth = getDaysInMonth(currentMonth);
    
    // Calculate previous month's trailing days
    const prevMonthDays = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = new Date(monthStart);
      day.setDate(day.getDate() - (i + 1));
      prevMonthDays.push(day);
    }
    
    // Calculate current month days
    const currentMonthDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(monthStart);
      dayDate.setDate(day);
      currentMonthDays.push(dayDate);
    }
    
    // Calculate next month's leading days to fill the grid
    const totalCells = 42; // 6 rows × 7 days
    const remainingCells = totalCells - (prevMonthDays.length + currentMonthDays.length);
    const nextMonthDays = [];
    for (let day = 1; day <= remainingCells; day++) {
      const dayDate = new Date(monthEnd);
      dayDate.setDate(dayDate.getDate() + day);
      nextMonthDays.push(dayDate);
    }
    
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    
    const goToPreviousMonth = () => {
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentMonth(prevMonth);
    };
    
    const goToNextMonth = () => {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentMonth(nextMonth);
    };
    
    const handleDateClick = (clickedDate: Date) => {
      setDate(clickedDate);
    };
    
    // Keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent, day: Date) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleDateClick(day);
      }
    };
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="w-full">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-10 w-10 bg-gradient-to-br from-background/80 to-background/60 hover:from-primary/20 hover:to-primary/10 rounded-xl transition-all duration-300 border border-border/40 shadow-md hover:shadow-lg backdrop-blur-sm hover:scale-105 p-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  setDate(today);
                }}
                title="Click to go to today"
            >
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
              Click a date to view scheduled drives
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className="h-10 w-10 bg-gradient-to-br from-background/80 to-background/60 hover:from-primary/20 hover:to-primary/10 rounded-xl transition-all duration-300 border border-border/40 shadow-md hover:shadow-lg backdrop-blur-sm hover:scale-105 p-0"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="w-full">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {dayNames.map((dayName) => (
              <div
                key={dayName}
                className="h-8 flex items-center justify-center text-muted-foreground font-semibold text-xs sm:text-sm tracking-wider uppercase"
              >
                <span className="hidden sm:inline">{dayName}</span>
                <span className="sm:hidden">{dayName.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {allDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = date && isSameDay(day, date);
              const isTodayDate = isToday(day);
              const hasScheduledDrives = scheduledDates.some(scheduledDate => isSameDay(day, scheduledDate));
              
              return (
                <div
                  key={index}
                  className={cn(
                    "h-8 sm:h-10 md:h-12 w-full flex items-center justify-center relative cursor-pointer rounded-lg sm:rounded-xl transition-all duration-300 border border-transparent hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    !isCurrentMonth && "text-muted-foreground/30 opacity-30 hover:opacity-50",
                    isSelected && "bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground hover:from-primary hover:to-primary/90 shadow-lg border-2 border-primary/40 font-bold scale-105 z-10",
                    isTodayDate && !isSelected && "bg-gradient-to-br from-accent/70 via-accent/50 to-accent/30 text-accent-foreground font-bold ring-2 ring-primary/30 shadow-md scale-105",
                    isCurrentMonth && !isSelected && !isTodayDate && "hover:scale-105"
                  )}
                  onClick={() => handleDateClick(day)}
                  onKeyDown={(e) => handleKeyDown(e, day)}
                  tabIndex={isCurrentMonth ? 0 : -1}
                  role="button"
                  aria-label={`Select ${format(day, 'MMMM d, yyyy')}${hasScheduledDrives ? ' (has scheduled drives)' : ''}`}
                  aria-selected={isSelected}
                >
                  <span className={cn(
                    "font-semibold text-xs sm:text-sm md:text-base transition-all duration-300 select-none",
                    isSelected || isTodayDate ? "font-bold" : ""
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Scheduled Drives Indicator */}
                  {hasScheduledDrives && isCurrentMonth && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full shadow-sm ring-1 ring-background animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 p-1 sm:p-2">
      {/* Calendar Section */}
      <div className="xl:col-span-2 order-2 xl:order-1">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/85 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 backdrop-blur-xl">
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-60" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-[4rem] opacity-40" />
          
          <CardHeader className="relative pb-6 sm:pb-8 pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3 sm:gap-4">
                <div className="relative p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-lg">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-primary drop-shadow-sm" />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-primary/5 to-transparent" />
                </div>
                <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Schedule Calendar
                </span>
              </CardTitle>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  {selectedDateDrives.length} {selectedDateDrives.length === 1 ? 'Event' : 'Events'}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative px-4 sm:px-6 pb-6 sm:pb-8">
            <div className="relative p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-background/60 to-background/40 border border-border/30 backdrop-blur-sm shadow-inner">
              <CustomCalendar />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Details */}
      <div className="xl:col-span-1 order-1 xl:order-2">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/85 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 backdrop-blur-xl h-fit">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-primary/5 opacity-60" />
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-accent/15 to-transparent rounded-br-[3rem] opacity-50" />
          
          <CardHeader className="relative pb-4 sm:pb-6 pt-6 sm:pt-8">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                <div className="relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 shadow-md">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground drop-shadow-sm" />
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-t from-accent/5 to-transparent" />
                </div>
                <div className="flex flex-col">
                  <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {date ? format(date, 'EEEE') : 'Select Date'}
                  </span>
                  {date && (
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {format(date, 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              </CardTitle>
            </div>
            
            {selectedDateDrives.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/25 rounded-full shadow-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm" />
                  <span className="text-xs font-semibold text-primary">
                    {selectedDateDrives.length} {selectedDateDrives.length === 1 ? 'Drive' : 'Drives'}
                  </span>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground px-1.5">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="relative space-y-4 max-h-[24rem] sm:max-h-[28rem] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30 hover:scrollbar-thumb-border/50 pb-4 sm:pb-6">
            {selectedDateDrives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-6">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-muted/40 to-muted/20 border border-muted-foreground/10 shadow-inner">
                    <CalendarDays className="w-12 h-12 text-muted-foreground/60" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-accent/40 to-accent/20 rounded-full border-2 border-background animate-pulse" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-muted-foreground">No drives scheduled</p>
                  <p className="text-sm text-muted-foreground/80 max-w-xs leading-relaxed">
                    {date && isToday(date) 
                      ? "Your schedule is clear for today. Perfect time to plan ahead!" 
                      : "No drives scheduled for this date. Select another date to view events."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedDrives.map((log, index) => {
                // Get scheduled time from startTime field
                const getScheduledTime = () => {
                  if (log.startTime) {
                    return (log.startTime as any).toDate ? (log.startTime as any).toDate().getTime() : new Date(log.startTime as any).getTime();
                  }
                  return Date.now();
                };
                
                const scheduledTime = getScheduledTime();
                const logDate = new Date(scheduledTime);
                const isPastDue = isScheduledDrivePastDue(log.startTime);
                const tooEarly = isScheduledDriveTooEarly(log.startTime);
                const canStart = canStartScheduledDrive(log.startTime);
                const isStartable = canStart && !isPending;
                const startBlockedTitle = tooEarly
                  ? `Can only start ${SCHEDULE_EARLY_START_MINUTES} minutes before scheduled time`
                  : isPastDue
                    ? 'Start window has closed'
                    : '';

                return (
                  <div key={log.id} className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/20 transition-all duration-500 hover:shadow-2xl backdrop-blur-sm",
                    isPastDue 
                      ? "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent border-destructive/30 hover:border-destructive/40" 
                      : "bg-gradient-to-br from-background/60 via-background/40 to-background/20 hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/5 hover:via-primary/3 hover:to-transparent"
                  )}>
                    
                    {/* Enhanced Status Bar with Glow Effect */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1 transition-all duration-500",
                      isPastDue 
                        ? "bg-gradient-to-r from-destructive via-destructive/80 to-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        : "bg-gradient-to-r from-primary via-primary/80 to-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                    )} />
                    
                    <div className="space-y-4 p-5">
                      {/* Enhanced Header with Vehicle Image */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="relative flex-shrink-0">
                            <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-background via-background/90 to-background/80 border-2 border-border/30 shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <VehiclePhoto
                                src={getVehicleImage(log.vehicleModel as any, log.vehicleTrim)}
                                alt={`${log.vehicleModel} ${log.vehicleTrim}`}
                                fill
                                variant="thumb"
                                className="transition-transform duration-300 group-hover:scale-110"
                              />
                            </div>
                            {/* Status Indicator Dot */}
                            <div className={cn(
                              "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background shadow-md transition-all duration-300",
                              isPastDue 
                                ? "bg-gradient-to-br from-destructive to-destructive/80 animate-pulse" 
                                : "bg-gradient-to-br from-emerald-400 to-emerald-500"
                            )} />
                          </div>
                          
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground text-base truncate">
                                {log.coPilot ? `${log.coPilot}'s Drive` : 'Scheduled Drive'}
                              </h4>
                              {isPastDue && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/15 border border-destructive/25 rounded-full">
                                  <div className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                                  <span className="text-xs font-semibold text-destructive">OVERDUE</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                              {log.vehicleModel} {log.vehicleTrim}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-foreground">
                              {format(logDate, 'h:mm a')}
                            </p>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 border border-accent/30 rounded-full">
                              <Clock className="w-3 h-3 text-accent-foreground/70" />
                              <span className="text-xs font-medium text-accent-foreground">
                                {formatMinutesToHoursAndMinutes(log.expectedDuration)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Details Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/25">
                              <User className="w-3.5 h-3.5 text-accent-foreground/80" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                              {log.coPilot || log.advisorIn || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/25">
                              <Car className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border">
                              ...{log.vehicleVin?.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Action Buttons */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {!isPastDue && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDrive(log)}
                              disabled={isPending}
                              className={cn(
                                "flex-1 min-w-[80px] h-10 text-sm font-semibold border-2 rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm",
                                "border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 hover:from-blue-500/20 hover:to-blue-500/10 hover:border-blue-500/40 hover:shadow-blue-500/20 hover:scale-[1.02]"
                              )}
                              title="Edit scheduled drive date and time"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Edit className="h-4 w-4 mr-2" />
                              )}
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartDriveClick(log)}
                              disabled={!isStartable}
                              className={cn(
                                "flex-1 min-w-[100px] h-10 text-sm font-semibold border-2 rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm",
                                isStartable
                                  ? "border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 text-primary hover:from-primary/20 hover:to-primary/10 hover:border-primary/40 hover:shadow-primary/20 hover:scale-[1.02]"
                                  : "border-border/30 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60"
                              )}
                              title={!isStartable ? startBlockedTitle : ""}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <PlayCircle className="h-4 w-4 mr-2" />
                              )}
                              Start
                            </Button>
                          </>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isPending}
                              className="flex-1 min-w-[90px] h-10 text-sm font-semibold rounded-xl bg-gradient-to-r from-destructive/90 via-destructive to-destructive/90 hover:from-destructive hover:to-destructive border-2 border-destructive/40 hover:border-destructive/60 shadow-sm hover:shadow-lg hover:shadow-destructive/20 transition-all duration-300 hover:scale-[1.02]"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl">
                            <AlertDialogHeader className="space-y-4">
                              <AlertDialogTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                                Cancel Scheduled Drive
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
                                This will permanently cancel the scheduled drive for{' '}
                                <span className="font-semibold text-foreground">{log.coPilot || 'this customer'}</span>.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3">
                              <AlertDialogCancel className="rounded-xl border-2 border-border/30 bg-background/60 hover:bg-background/80 backdrop-blur-sm">
                                Keep Drive
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelDrive(log.id, log.vehicleId)}
                                className="rounded-xl bg-gradient-to-r from-destructive via-destructive/90 to-destructive hover:from-destructive hover:to-destructive border-2 border-destructive/40 shadow-lg"
                              >
                                Cancel Drive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    {/* Subtle Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
                  </div>
                );
              })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Sheet */}
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
          onVehicleUpdate={onVehicleUpdate}
          isScheduledDriveStart={true}
          driveLog={selectedLog}
        />
      )}

      {/* Edit Scheduled Drive Dialog */}
      {editingLog && (
        <EditScheduledDriveDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingLog(null);
          }}
          driveLog={editingLog}
          storeCode={storeCode}
        />
      )}
    </div>
  );
}

// Edit Scheduled Drive Dialog Component
function EditScheduledDriveDialog({
  isOpen,
  onClose,
  driveLog,
  storeCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  driveLog: DriveLog;
  storeCode: string;
}) {
  const { firestore } = useFirebase();
  const [editDate, setEditDate] = useState<Date | undefined>(() => {
    if (driveLog.startTime) {
      return (driveLog.startTime as any)?.toDate 
        ? (driveLog.startTime as any).toDate() 
        : new Date(driveLog.startTime as any);
    }
    return new Date();
  });
  const [editTime, setEditTime] = useState(() => {
    const date = editDate || new Date();
    return format(date, 'HH:mm');
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSave = async () => {
    if (!editDate || !editTime || !firestore) return;

    setIsSaving(true);
    try {
      // Combine date and time
      const [hours, minutes] = editTime.split(':').map(Number);
      const newDateTime = new Date(editDate);
      newDateTime.setHours(hours, minutes, 0, 0);

      // Update in Firestore
      const driveRef = doc(firestore, `stores/${storeCode}/demo_drives/${driveLog.id}`);
      await updateDocumentNonBlocking(driveRef, {
        startTime: newDateTime,
        updatedAt: serverTimestamp(),
      });

      onClose();
    } catch (error) {
      console.error('Error updating scheduled drive:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-3xl border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-4">
          <AlertDialogTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-500" />
            Edit Scheduled Drive
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
            Update the date and time for{' '}
            <span className="font-semibold text-foreground">{driveLog.coPilot || 'this'}</span>
            's scheduled drive.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Date</label>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full justify-start text-left font-normal border-border/60 hover:border-primary/50 transition-all rounded-xl h-12"
              >
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                {editDate ? format(editDate, 'PPP') : <span>Pick a date</span>}
              </Button>
              
              {showCalendar && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-background border border-border/60 rounded-2xl shadow-2xl p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDate = new Date(editDate || new Date());
                          newDate.setMonth(newDate.getMonth() - 1);
                          setEditDate(newDate);
                        }}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="text-sm font-bold">
                        {format(editDate || new Date(), 'MMMM yyyy')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDate = new Date(editDate || new Date());
                          newDate.setMonth(newDate.getMonth() + 1);
                          setEditDate(newDate);
                        }}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: 35 }, (_, i) => {
                        const currentDate = editDate || new Date();
                        const firstDay = startOfMonth(currentDate);
                        const startDay = getDay(firstDay);
                        const daysInMonth = getDaysInMonth(currentDate);
                        const dayNum = i - startDay + 1;
                        
                        if (dayNum < 1 || dayNum > daysInMonth) {
                          return <div key={i} className="h-8" />;
                        }
                        
                        const dayDate = new Date(currentDate);
                        dayDate.setDate(dayNum);
                        const isSelected = editDate && isSameDay(dayDate, editDate);
                        const isTodayDate = isToday(dayDate);
                        
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setEditDate(dayDate);
                              setShowCalendar(false);
                            }}
                            className={cn(
                              "h-8 w-full rounded-lg text-sm font-medium transition-all",
                              isSelected && "bg-primary text-primary-foreground font-bold",
                              !isSelected && isTodayDate && "bg-accent text-accent-foreground",
                              !isSelected && !isTodayDate && "hover:bg-muted"
                            )}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border/60 bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">New scheduled time:</div>
            <div className="text-lg font-bold text-foreground">
              {editDate && editTime && format(
                new Date(`${format(editDate, 'yyyy-MM-dd')}T${editTime}`),
                'EEEE, MMMM d, yyyy \'at\' h:mm a'
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border-2 border-border/30 bg-background/60 hover:bg-background/80 backdrop-blur-sm"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleSave}
            disabled={isSaving || !editDate || !editTime}
            className="rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 hover:from-blue-600 hover:to-blue-600 border-2 border-blue-400/40 shadow-lg text-white font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

