

'use client'

import { useState, useMemo } from 'react';
import type { DriveLog, UserRole, Advisor, Vehicle } from '@/lib/types';
import type { Timestamp } from 'firebase/firestore';
import HistoryTable from './history-table';
import { DateRangePicker } from './ui/date-range-picker';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from './ui/button';
import { addDays, startOfDay, format, subMonths } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { convertJsonToCsv } from '@/lib/utils';
import { Car } from 'lucide-react';
import { EmptyState } from './empty-state';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { HISTORY_DATE_RANGE_LIMIT } from '@/lib/firestore-query-limits';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface HistoryProps {
    driveLogs: DriveLog[];
    userRole: UserRole;
    storeCode: string;
    advisors: Advisor[];
    vehicles: Vehicle[];
    onUpdateLog: (log: DriveLog, affectedVehicleId?: string) => void;
    storeName: string;
    currentAdvisor: Advisor;
}

const ITEMS_PER_PAGE = 10;

export default function History({ driveLogs: initialDriveLogs, userRole, storeCode, advisors, vehicles, onUpdateLog, storeName, currentAdvisor }: HistoryProps) {
    const { firestore, user } = useFirebase();
    const breakpoint = useBreakpoint();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: startOfDay(new Date()),
      to: startOfDay(new Date()),
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { toast } = useToast();

    // Determine if we should show compact view based on device size
    // Always use compact view on mobile (sm) and tablet (md), regardless of user preference
    // User preference only applies on desktop (lg and above)
    const shouldUseCompactView = useMemo(() => {
        // Always use compact view on mobile and tablet
        if (breakpoint === 'sm' || breakpoint === 'md') {
            return true;
        }
        // On desktop, respect user preference if set, otherwise default to false
        return currentAdvisor.compactHistoryView ?? false;
    }, [breakpoint, currentAdvisor.compactHistoryView]);

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDateRange(newDate);
        setCurrentPage(1);
    }
    
    const moveDateRange = (days: number) => {
        setDateRange(prev => {
            const from = prev?.from ? addDays(prev.from, days) : new Date();
            const to = prev?.from ? addDays(prev.from, days) : from; 
            return { from, to };
        })
        setCurrentPage(1);
    }

    const driveLogsQuery = useMemoFirebase(() => {
        if (!firestore || !user || !dateRange?.from) return null;
        
        const from = new Date(dateRange.from);
        from.setHours(0,0,0,0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        to.setHours(23,59,59,999);

        return query(
            collection(firestore, `stores/${storeCode}/demo_drives`),
            where('startTime', '>=', from),
            where('startTime', '<=', to),
            orderBy('startTime', 'desc'),
            limit(HISTORY_DATE_RANGE_LIMIT),
        );
    }, [firestore, user, storeCode, dateRange]);

    const { data: fetchedDriveLogs, isLoading: areDriveLogsLoading } = useCollection<DriveLog>(driveLogsQuery);

    const filteredLogs = useMemo(() => {
        const logsToFilter = fetchedDriveLogs || initialDriveLogs;

        return logsToFilter
            .filter(log => {
                if (filter !== 'Scheduled' && log.purpose === 'Scheduled' && !log.endTime) {
                    return false;
                }
                const lowerSearch = searchTerm.toLowerCase();
                if (!searchTerm) return true;
                return (
                    (log.vehicleModel && log.vehicleModel.toLowerCase().includes(lowerSearch)) ||
                    (log.vehicleVin && log.vehicleVin.toLowerCase().includes(lowerSearch)) ||
                    (log.coPilot && log.coPilot.toLowerCase().includes(lowerSearch)) ||
                    (log.advisorIn && log.advisorIn.toLowerCase().includes(lowerSearch))
                );
            })
            .filter(log => {
                if (filter === 'all') return true;
                if (filter === 'issue') return log.issueDetected;
                return log.purpose === filter;
            })
            .sort((a,b) => {
              const timeA = a.startTime ? ((a.startTime as Timestamp).toDate ? (a.startTime as Timestamp).toDate().getTime() : new Date(a.startTime as number | Date).getTime()) : 0;
              const timeB = b.startTime ? ((b.startTime as Timestamp).toDate ? (b.startTime as Timestamp).toDate().getTime() : new Date(b.startTime as number | Date).getTime()) : 0;
              return timeB - timeA;
            });
    }, [fetchedDriveLogs, initialDriveLogs, searchTerm, filter]);

    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleExport = () => {
        if (filteredLogs.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Data to Export',
                description: 'There are no logs matching the current filters.',
            });
            return;
        }

        try {
            const headers = [
                'vehicleModel', 'vehicleVin', 'coPilot', 'advisorIn', 'purpose', 
                'startTime', 'endTime', 'expectedDuration', 'startBattery', 'endBattery', 
                'feedback', 'issueDetected', 'customerPurchased'
            ] as const;
            
            const dataToExport = filteredLogs.map(log => {
                const formatTimestamp = (ts: any) => {
                    if (!ts) return '';
                    const date = (ts as Timestamp)?.toDate ? (ts as Timestamp).toDate() : new Date(ts);
                    return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx");
                };

                return {
                    vehicleModel: log.vehicleModel,
                    vehicleVin: `...${log.vehicleVin.slice(-6)}`,
                    coPilot: log.coPilot,
                    advisorIn: log.advisorIn || '',
                    purpose: log.purpose,
                    startTime: formatTimestamp(log.startTime),
                    endTime: formatTimestamp(log.endTime),
                    expectedDuration: log.expectedDuration,
                    startBattery: log.startBattery,
                    endBattery: log.endBattery || '',
                    feedback: log.feedback || '',
                    issueDetected: log.issueDetected ? 'Yes' : 'No',
                    customerPurchased: log.customerPurchased ? 'Yes' : 'No',
                };
            });

            const csvData = convertJsonToCsv(dataToExport, headers as any);

            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const dateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'export';
            link.setAttribute('download', `drive_logs_${storeCode}_${dateStr}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: 'Export Successful',
                description: 'Your CSV file is downloading.',
            });
        } catch (error) {
            console.error("Export Error:", error);
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: 'An unexpected error occurred while generating the CSV.',
            });
        }
    };


    if (initialDriveLogs.length === 0 && paginatedLogs.length === 0) {
      return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-primary" />Drive History for {storeName}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Car}
                title="No demo drives yet"
                description="Check out a vehicle from Fleet, complete a drive, and your history will show up here."
                action={{ label: 'Go to Fleet', href: '/?tab=fleet' }}
              />
            </CardContent>
          </Card>
      )
    }

    const paginationControls = totalPages > 1 ? (
        <div className="flex justify-center items-center space-x-2 pt-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                Next
            </Button>
        </div>
    ) : null;

    const fourMonthsAgo = subMonths(new Date(), 4);

    return (
        <div className="space-y-4">
             <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Drive History for {storeName}</h2>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search model, VIN, co-pilot..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 w-full"
                            />
                        </div>
                        <Select value={filter} onValueChange={(value) => {
                            setFilter(value);
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="Demo">Demo</SelectItem>
                                <SelectItem value="Charging">Charging</SelectItem>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                <SelectItem value="issue">Has Issue</SelectItem>
                            </SelectContent>
                        </Select>
                        {userRole === 'manager' && (
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => moveDateRange(-1)}>{"<"}</Button>
                            <DateRangePicker 
                                date={dateRange} 
                                onDateChange={handleDateChange} 
                                disabledDays={{ before: fourMonthsAgo, after: new Date() }}
                            />
                            <Button variant="outline" onClick={() => moveDateRange(1)}>{">"}</Button>
                        </div>
                    </div>
                </div>
            </div>
            <HistoryTable 
                driveLogs={paginatedLogs} 
                userRole={userRole} 
                storeCode={storeCode} 
                paginationControls={paginationControls}
                advisors={advisors}
                vehicles={vehicles}
                onUpdateLog={onUpdateLog}
                isCompact={shouldUseCompactView}
            />
        </div>
    );
}
