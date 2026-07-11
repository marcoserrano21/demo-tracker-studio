

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Advisor, Goal, GoalMetric, DriveLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, endOfQuarter, startOfQuarter } from 'date-fns';
import { Loader2, PlusCircle, Trash2, Target, Edit, Plus } from 'lucide-react';
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { MultiSelect } from './ui/multi-select';
import { Input } from './ui/input';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { dedupeAdvisors, getAdvisorSelectValue } from './drive-flow-sheet-ui';


interface GoalsTabProps {
  advisors: Advisor[];
  storeCode: string;
  storeName: string;
  goals: Goal[];
  currentAdvisor: Advisor;
  driveLogs: DriveLog[];
}

const ITEMS_PER_PAGE = 5;

export default function GoalsTab({ advisors, storeCode, storeName, goals, currentAdvisor, driveLogs }: GoalsTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [targetType, setTargetType] = useState<'store' | 'advisor'>('store');
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([]);
  const [metric, setMetric] = useState<GoalMetric>('drives');
  const [targetValue, setTargetValue] = useState<number | ''>(50);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) });
  const [currentPage, setCurrentPage] = useState(1);


  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const goalsQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, `stores/${storeCode}/goals`)) : null), [firestore, user, storeCode]);
  const { data: liveGoals } = useCollection<Goal>(goalsQuery);
  
  const activeGoals = useMemo(() => {
    const allGoals = liveGoals || goals;
    const now = new Date();
    return allGoals.filter(goal => goal.endDate && goal.endDate.toDate() >= now);
  }, [liveGoals, goals]);
  
  const totalPages = Math.ceil(activeGoals.length / ITEMS_PER_PAGE);
  const paginatedGoals = activeGoals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const sortedAdvisors = useMemo(() => {
    return dedupeAdvisors(advisors)
      .map((a, index) => ({ value: getAdvisorSelectValue(a, index), label: a.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [advisors]);

  const resetForm = () => {
    setTargetType('store');
    setSelectedAdvisors([]);
    setMetric('drives');
    setTargetValue(50);
    setDateRange({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) });
    setEditingGoal(null);
  };
  
  useEffect(() => {
    if (editingGoal) {
      setTargetType(editingGoal.targetType);
      setMetric(editingGoal.metric);
      setTargetValue(editingGoal.targetValue);
      setDateRange({ from: editingGoal.startDate.toDate(), to: editingGoal.endDate.toDate() });
      if (editingGoal.targetType === 'advisor' && editingGoal.targetIds) {
        setSelectedAdvisors(editingGoal.targetIds);
      }
    } else {
        resetForm();
    }
  }, [editingGoal]);


  const handleTargetTypeChange = (type: 'store' | 'advisor') => {
    setTargetType(type);
    setSelectedAdvisors([]);
  }

  const handleSaveGoal = async () => {
    if (!firestore || !metric || !targetValue || !dateRange?.from || !dateRange?.to) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
      return;
    }
    if (targetType === 'advisor' && selectedAdvisors.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one advisor.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
        if (editingGoal) {
            // Update existing goal
            const goalRef = doc(firestore, `stores/${storeCode}/goals/${editingGoal.id}`);
            const updatedData = {
                metric,
                targetValue: Number(targetValue),
                startDate: Timestamp.fromDate(dateRange.from),
                endDate: Timestamp.fromDate(dateRange.to),
            };
            await updateDocumentNonBlocking(goalRef, updatedData);
            toast({ title: 'Goal Updated!', description: 'The performance goal has been updated.' });

        } else {
            // Create new goal(s)
            const batch = writeBatch(firestore);
            const goalsColRef = collection(firestore, `stores/${storeCode}/goals`);
            
            const commonGoalData = {
                storeId: storeCode,
                metric,
                targetValue: Number(targetValue),
                startDate: Timestamp.fromDate(dateRange.from),
                endDate: Timestamp.fromDate(dateRange.to),
                createdBy: currentAdvisor.name,
                createdAt: serverTimestamp(),
            };

            if (targetType === 'store') {
                const newGoalRef = doc(goalsColRef);
                batch.set(newGoalRef, { 
                    ...commonGoalData,
                    targetType: 'store',
                    targetIds: [storeCode],
                    targetNames: [storeName],
                });
            } else {
                selectedAdvisors.forEach(advisorId => {
                    const advisor = advisors.find(a => a.id === advisorId);
                    if (advisor) {
                        const newGoalRef = doc(goalsColRef);
                         batch.set(newGoalRef, { 
                            ...commonGoalData,
                            targetType: 'advisor',
                            targetIds: [advisorId],
                            targetNames: [advisor.name],
                        });
                    }
                });
            }
            await batch.commit();
            toast({ title: 'Goal Created!', description: `New performance goal(s) have been set.` });
        }
        
        resetForm();
    } catch(e) {
      console.error(e)
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the goal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!firestore) return;
    const goalRef = doc(firestore, `stores/${storeCode}/goals/${goalId}`);
    deleteDocumentNonBlocking(goalRef);
    toast({ title: 'Success', description: 'Goal has been deleted.' });
  }

  const calculateProgress = (goal: Goal) => {
    if (!driveLogs) return { current: 0, percentage: 0 };
    
    const relevantLogs = driveLogs.filter(log => {
      if (!log.startTime) return false;
      const logDate = log.startTime instanceof Timestamp ? log.startTime.toDate() : new Date(log.startTime as number | Date);
      return logDate >= goal.startDate.toDate() && logDate <= goal.endDate.toDate();
    });

    let current = 0;
    
    const targetLogs = goal.targetType === 'store' 
      ? relevantLogs 
      : relevantLogs.filter(l => goal.targetNames?.includes(l.coPilot));

    if (goal.metric === 'drives') {
        current = targetLogs.filter(l => l.purpose === 'Demo' && l.endTime).length;
    } else if (goal.metric === 'positive_feedback') {
        current = targetLogs.filter(l => l.sentimentLabel === 'positive').length;
    } else if (goal.metric === 'charging_sessions') {
        current = targetLogs.filter(l => l.purpose === 'Charging').length;
    } else if (goal.metric === 'fsd_attaches') {
        current = targetLogs.filter(l => l.fsdSubscribed).length;
    }

    const percentage = Math.min((current / goal.targetValue) * 100, 100);

    return { current, percentage };
  }

  const formTitle = editingGoal ? 'Edit Goal' : 'Set a New Goal';
  const formDescription = editingGoal ? 'Modify the details of this performance goal.' : 'Define and track performance targets.';

  const presetRanges = [
    { name: 'Today', range: { from: startOfToday(), to: endOfToday() } },
    { name: 'This Week', range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
    { name: 'This Month', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { name: 'This Quarter', range: { from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) } },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary"/>{formTitle}</CardTitle>
            <CardDescription>{formDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editingGoal && (
                <div className="space-y-2">
                    <Label>Goal Target</Label>
                    <Select value={targetType} onValueChange={(value: 'store' | 'advisor') => handleTargetTypeChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store">Entire Store</SelectItem>
                        <SelectItem value="advisor">Specific Advisors</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            )}
             {targetType === 'advisor' && !editingGoal && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Select Advisors</Label>
                        {selectedAdvisors.length > 0 && (
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedAdvisors([])}>
                                Clear
                            </Button>
                        )}
                    </div>
                    <MultiSelect
                        options={sortedAdvisors}
                        selected={selectedAdvisors}
                        onChange={setSelectedAdvisors}
                        placeholder="Select advisors..."
                        className="w-full"
                    />
                </div>
             )}
             <div className="space-y-2">
                <Label>Metric to Track</Label>
                 <Select value={metric} onValueChange={(value: GoalMetric) => setMetric(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a metric" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="drives">Drives</SelectItem>
                        <SelectItem value="positive_feedback">Positive Feedback</SelectItem>
                        <SelectItem value="charging_sessions">Charging Sessions</SelectItem>
                        <SelectItem value="fsd_attaches">FSD Attaches</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Target Value</Label>
                <div className="flex items-center gap-2 max-w-xs">
                    <Button variant="outline" onClick={() => setTargetValue(v => Number(v) > 1 ? Number(v) - 1 : 1)}>-</Button>
                    <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-center bg-transparent border rounded-md" />
                    <Button variant="outline" onClick={() => setTargetValue(v => Number(v) + 1)}>+</Button>
                </div>
             </div>
             <div className="space-y-2">
                <Label>Duration</Label>
                <div className='max-w-xs'>
                  <DateRangePicker date={dateRange} onDateChange={setDateRange} presets={presetRanges} variant="compact" />
                </div>
             </div>
             <div className="flex gap-2 pt-2">
                {editingGoal && (
                    <Button variant="outline" onClick={() => setEditingGoal(null)} className="w-full">Cancel</Button>
                )}
                 <Button onClick={handleSaveGoal} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Set Goal'}
                 </Button>
             </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
            <CardDescription>Current goals for the store and advisors.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedGoals.length > 0 ? paginatedGoals.map(goal => {
                        const { current, percentage } = calculateProgress(goal);
                        return (
                        <TableRow key={goal.id}>
                            <TableCell>{goal.targetNames?.join(', ')}</TableCell>
                            <TableCell>{goal.targetValue} {goal.metric.replace('_', ' ')}</TableCell>
                            <TableCell className="align-middle">
                                <div className="flex items-center gap-2">
                                <Progress value={percentage} className="w-24"/>
                                <span>({current}/{goal.targetValue})</span>
                                </div>
                            </TableCell>
                            <TableCell>{format(goal.endDate.toDate(), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => setEditingGoal(goal)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>This will permanently delete this goal. This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )}) : (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center py-16">
                                <div className="max-w-sm mx-auto">
                                    {/* Modern illustration */}
                                    <div className="relative mx-auto w-20 h-20 mb-6">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-full blur-xl" />
                                        <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-emerald-500/10 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                                            <Target className="h-8 w-8 text-primary/60" />
                                        </div>
                                    </div>
                                    
                                    {/* Enhanced content */}
                                    <h4 className="text-lg font-semibold mb-3">Set Your First Goal</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Goals help track progress and motivate excellence. Create performance targets to drive success.
                                    </p>
                                    
                                    {/* Action hint */}
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                                        <Plus className="h-3 w-3 text-primary" />
                                        <span className="text-xs font-medium text-primary">Click &quot;New Goal&quot; to get started</span>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {totalPages > 1 && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
