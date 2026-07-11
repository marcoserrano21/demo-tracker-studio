

'use client';
import { useState, ReactNode } from 'react';
import type { DriveLog, UserRole, Advisor, Vehicle } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { format, intervalToDuration } from 'date-fns';
import { formatMinutesToHoursAndMinutes } from '@/lib/utils';
import { Badge } from './ui/badge';
import { ArrowDown, ArrowUp, Car, User, Calendar, Clock, Battery, Trash2, UserCheck, Timer, MessageSquare, AlertCircle, CheckCircle, Edit, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { EditDriveLogDialog } from './edit-log-dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { cn } from '@/lib/utils';

function getNameInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatVinSuffix(vin?: string | null): string {
  if (!vin) return 'N/A';
  return `...${vin.slice(-6)}`;
}

interface HistoryTableProps {
  driveLogs: DriveLog[];
  userRole: UserRole;
  storeCode: string;
  paginationControls: ReactNode;
  advisors: Advisor[];
  vehicles: Vehicle[];
  onUpdateLog: (log: DriveLog) => void;
  isCompact?: boolean;
}

export default function HistoryTable({ driveLogs, userRole, storeCode, paginationControls, advisors, vehicles, onUpdateLog, isCompact = false }: HistoryTableProps) {
    const { firestore } = useFirebase();
    const [confirmName, setConfirmName] = useState('');
    const [logToDelete, setLogToDelete] = useState<string | null>(null);
    const breakpoint = useBreakpoint();
    const isMobile = breakpoint === 'sm';
    const [editingLog, setEditingLog] = useState<DriveLog | null>(null);

    const formatDateTime = (timestamp: number | Date | Timestamp | undefined) => {
        if (!timestamp) return 'N/A';
        const date = (timestamp as Timestamp).toDate ? (timestamp as Timestamp).toDate() : new Date(timestamp as number | Date);
        return format(date, 'MMM d, h:mm a');
    };

    const getDuration = (log: DriveLog) => {
        if (log.purpose === 'Scheduled' && !log.endTime) return formatMinutesToHoursAndMinutes(log.expectedDuration);
        if (!log.startTime || !log.endTime) {
            if(log.purpose === 'Charging') return 'Charging';
            return 'In Progress';
        }
        const startTime = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate().getTime() : new Date(log.startTime as number | Date).getTime();
        const endTime = (log.endTime as Timestamp)?.toDate ? (log.endTime as Timestamp).toDate().getTime() : new Date(log.endTime as number | Date).getTime();
        
        const duration = intervalToDuration({ start: startTime, end: endTime });

        const hours = duration.hours ?? 0;
        const minutes = duration.minutes ?? 0;
        
        let result = '';
        if (hours > 0) {
            result += `${hours}h`;
        }
        if (minutes > 0 || hours === 0) {
            if (hours > 0) result += ' ';
            result += `${minutes}m`;
        }
        
        return result.trim() === '' ? '0m' : result;
    };
  
    const handleDeleteLog = async (logId: string) => {
        if (!firestore) return;
        const logRef = doc(firestore, `stores/${storeCode}/demo_drives/${logId}`);
        await deleteDoc(logRef);
        setLogToDelete(null);
        setConfirmName('');
    };

    const openDeleteDialog = (logId: string) => {
        setLogToDelete(logId);
    };

    const closeDeleteDialog = () => {
        setLogToDelete(null);
        setConfirmName('');
    };

    const renderBatteryChange = (start: number, end?: number) => {
        if (typeof end !== 'number' || !start) {
            return <div className="flex items-center">{start ? `${start}%` : 'N/A'}</div>;
        }
        const diff = end - start;
        const color = diff < 0 ? 'text-red-500' : 'text-green-500';
        const Icon = diff < 0 ? ArrowDown : ArrowUp;
        return (
        <div className="flex items-center">
            <span>{start}% → {end}%</span>
            <span className={`ml-2 flex items-center ${color}`}>
            <Icon className="h-4 w-4" />
            {Math.abs(diff)}%
            </span>
        </div>
        );
    };

    if (driveLogs.length === 0) {
        return (
            <Card className="border-border/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Car className="w-5 h-5 text-primary" />
                        Drive History
                    </CardTitle>
                    <CardDescription>Your team's demo drive activity and performance</CardDescription>
                </CardHeader>
                <CardContent className="py-16">
                    <div className="text-center max-w-md mx-auto">
                        {/* Modern illustration */}
                        <div className="relative mx-auto w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                                <Car className="h-10 w-10 text-primary/60" />
                            </div>
                        </div>
                        
                        {/* Engaging content hierarchy */}
                        <h3 className="text-xl font-semibold mb-3">Ready to Make History?</h3>
                        <p className="text-muted-foreground leading-relaxed mb-6">
                            Your demo drive history will appear here. Start your first drive to begin building your track record of customer experiences.
                        </p>
                        
                        {/* Motivational element */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Every great journey starts with one drive</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const renderCompactView = () => (
      <>
        <Accordion type="multiple" className="space-y-3">
          {driveLogs.map(log => (
            <AccordionItem key={log.id} value={log.id} className="border bg-card rounded-lg overflow-hidden">
              <AccordionTrigger className="p-4 hover:no-underline flex justify-between items-center w-full gap-4">
                  <div className="flex items-center gap-4 text-left flex-1 min-w-0">
                     <Avatar className="flex-shrink-0">
                        <AvatarImage src={advisors.find(a => a.name === log.coPilot)?.avatarUrl} />
                        <AvatarFallback>{getNameInitials(log.coPilot)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{log.vehicleModel} {log.vehicleTrim}</p>
                        <p className="text-sm text-muted-foreground truncate">with {log.coPilot ?? 'Unknown'} on {formatDateTime(log.startTime)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1.5 w-[90px] flex-shrink-0">
                    {log.issueDetected && <Badge variant="destructive" className="whitespace-nowrap flex items-center justify-center h-7 px-3"><AlertCircle className="mr-1 h-3 w-3" />Issue</Badge>}
                    <Badge variant="outline" className="whitespace-nowrap flex items-center justify-center h-7 px-3">{getDuration(log)}</Badge>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border-t bg-muted/50">
                  <div className="space-y-3 text-sm">
                      <div className="flex items-center"><Car className="w-4 h-4 mr-2 text-muted-foreground" /> <strong>VIN:</strong> <span className="ml-1 font-mono">{formatVinSuffix(log.vehicleVin)}</span></div>
                      <div className="flex items-center"><UserCheck className="w-4 h-4 mr-2 text-muted-foreground" /> <strong>Check-in by:</strong> <span className="ml-1">{log.advisorIn || 'N/A'}</span></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-muted-foreground" /> <strong>Time Out:</strong> <span className="ml-1">{formatDateTime(log.startTime)}</span></div>
                          <div className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-muted-foreground" /> <strong>Time In:</strong> <span className="ml-1">{formatDateTime(log.endTime)}</span></div>
                      </div>
                      {userRole === 'manager' && <div className="flex items-center"><Battery className="w-4 h-4 mr-2 text-muted-foreground" /> <strong>Battery:</strong> <span className="ml-1">{renderBatteryChange(log.startBattery, log.endBattery)}</span></div>}
                      {log.feedback && <div className="flex items-start"><MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" /> <strong>Feedback:</strong> <p className="ml-1 break-words leading-relaxed">{log.feedback}</p></div>}
                  </div>
                   {userRole === 'manager' && (
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setEditingLog(log)}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(log.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                        </Button>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {paginationControls}
      </>
    )

  return (
    <>
      {isMobile || isCompact ? renderCompactView() : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Drive History
          </CardTitle>
          <CardDescription>
            A log of all demo drives and charging sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px] sticky left-0 bg-card z-10">Vehicle</TableHead>
                  <TableHead className="min-w-[80px]">VIN</TableHead>
                  {userRole === 'manager' && <TableHead className="min-w-[150px]">Battery %</TableHead>}
                  <TableHead className="min-w-[150px] text-center">Co-Pilot</TableHead>
                  <TableHead className="min-w-[150px]">Time Out</TableHead>
                  <TableHead className="min-w-[150px] text-center">Check-in Co-Pilot</TableHead>
                  <TableHead className="min-w-[150px]">Time In</TableHead>
                  <TableHead className="min-w-[100px]">Duration</TableHead>
                  <TableHead className="min-w-[200px]">Feedback/Issues</TableHead>
                  {userRole === 'manager' && (
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {driveLogs.map((log) => {
                  const coPilot = advisors.find(a => a.name === log.coPilot);
                  const checkinAdvisor = advisors.find(a => a.name === log.advisorIn);
                  return (
                  <TableRow key={log.id} className="even:bg-muted/50">
                    <TableCell className="font-medium sticky left-0 bg-card even:bg-muted/50 z-10">
                      <div>{log.vehicleModel}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.vehicleTrim}
                      </div>
                    </TableCell>
                    <TableCell>{formatVinSuffix(log.vehicleVin)}</TableCell>
                    {userRole === 'manager' && (
                      <TableCell>
                        {renderBatteryChange(log.startBattery, log.endBattery)}
                      </TableCell>
                    )}
                    <TableCell className="flex items-center justify-center gap-2">
                        {coPilot && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={coPilot.avatarUrl} />
                            <AvatarFallback>{getNameInitials(coPilot.name)}</AvatarFallback>
                          </Avatar>
                        )}
                        {log.coPilot}
                    </TableCell>
                    <TableCell>{formatDateTime(log.startTime)}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                            {checkinAdvisor && (
                                <Avatar className="h-6 w-6">
                                <AvatarImage src={checkinAdvisor.avatarUrl} />
                                <AvatarFallback>{getNameInitials(checkinAdvisor.name)}</AvatarFallback>
                                </Avatar>
                            )}
                            {log.advisorIn || 'N/A'}
                        </div>
                    </TableCell>
                    <TableCell>{formatDateTime(log.endTime)}</TableCell>
                    <TableCell>{getDuration(log)}</TableCell>
                    <TableCell className="max-w-xs">
                        <div className="truncate whitespace-normal">
                            {log.issueDetected ? (
                                <Badge variant="destructive">Issue</Badge>
                            ) : log.feedback ? (
                                <span title={log.feedback}>{log.feedback}</span>
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </TableCell>
                    {userRole === 'manager' && (
                      <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingLog(log)}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => openDeleteDialog(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
            {paginationControls}
        </CardFooter>
      </Card>
      )}

      <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this drive log. Please type your name to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label htmlFor="confirm-name" className="sr-only">Confirm Name</Label>
                <Input 
                    id="confirm-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder="Enter your name to confirm"
                />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => logToDelete && handleDeleteLog(logToDelete)}
                disabled={!confirmName}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {editingLog && (
        <EditDriveLogDialog 
            isOpen={!!editingLog}
            onClose={() => setEditingLog(null)}
            log={editingLog}
            storeCode={storeCode}
            advisors={advisors}
            vehicles={vehicles}
            onUpdateLog={onUpdateLog}
        />
      )}
    </>
  );
}
