

'use client';

import React, { useState, useTransition, useEffect, useMemo, useCallback, lazy } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, CheckCircle, Loader2, RefreshCw, Trash, Users, UserCheck, Car, ArrowUpDown, ArrowUp, ArrowDown, Award, MoreVertical, Shield, GoalIcon, Search, Download } from 'lucide-react';
import type { Advisor, Vehicle, VehicleIssue, VehicleStatus, ManualAward, UserRole, Goal, DriveLog } from '@/lib/types';
import { VehicleForm } from './vehicle-form';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ResolveIssueDialog } from './resolve-issue-dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { getStoreData } from '@/lib/data';
import { convertJsonToCsv, stripUndefined } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { StoreOperationsSettings } from './management/store-operations-settings';


const AwardsTab = lazy(() => import('./awards-tab'));
const GoalsTab = lazy(() => import('./goals-tab'));

type AdvisorSortKey = 'name' | 'email';
type VehicleSortKey = 'model' | 'vin' | 'status';
type SortDirection = 'asc' | 'desc';

interface ManagementTabsProps {
  advisors: Advisor[];
  vehicles: Vehicle[];
  storeCode: string;
  vehicleIssues: VehicleIssue[];
  storeName: string;
  onAdvisorsUpdate: (advisors: Advisor[]) => void;
  onVehiclesUpdate: (vehicles: Vehicle[]) => void;
  currentAdvisor: Advisor;
  manualAwards: ManualAward[];
  goals: Goal[];
  driveLogs: DriveLog[];
}

const ITEMS_PER_PAGE = 5;

type ResetOptions = {
    advisors: boolean;
    vehicles: boolean;
    logs: boolean;
}

const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
        case 'moderator': return 'destructive';
        case 'manager': return 'default';
        default: return 'secondary';
    }
}

export default function ManagementTabs({
  advisors,
  vehicles,
  storeCode,
  vehicleIssues,
  storeName,
  onAdvisorsUpdate,
  onVehiclesUpdate,
  currentAdvisor,
  manualAwards,
  goals,
  driveLogs
}: ManagementTabsProps) {
  const { firestore } = useFirebase();
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [isAdvisorDialogOpen, setAdvisorDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);
  const [advisorToDelete, setAdvisorToDelete] = useState<Advisor | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'sm';
  const [activeTab, setActiveTab] = useState('vehicles');
  const [advisorSearchTerm, setAdvisorSearchTerm] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');

  const { toast } = useToast();

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isVehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const [resolvingIssue, setResolvingIssue] = useState<VehicleIssue | null>(null);
  
  const [selectedAdvisors, setSelectedAdvisors] = useState<Set<string>>(new Set());
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());

  const [advisorPage, setAdvisorPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  
  const [resetOptions, setResetOptions] = useState<ResetOptions>({ advisors: false, vehicles: false, logs: false });
  const isResetDisabled = !resetOptions.advisors && !resetOptions.vehicles && !resetOptions.logs;

  const [advisorSortKey, setAdvisorSortKey] = useState<AdvisorSortKey>('name');
  const [advisorSortDirection, setAdvisorSortDirection] = useState<SortDirection>('asc');
  const [vehicleSortKey, setVehicleSortKey] = useState<VehicleSortKey>('model');
  const [vehicleSortDirection, setVehicleSortDirection] = useState<SortDirection>('asc');
  
  const isSuperAdmin = currentAdvisor.name === 'Marco Serrano' || currentAdvisor.email === 'serranoma@tesla.com';
  const isManager = currentAdvisor.role === 'manager';
  const isModerator = currentAdvisor.role === 'moderator';
  const canChangeRoles = isManager || isSuperAdmin;

  useEffect(() => {
    setSelectedAdvisors(new Set());
  }, [advisors]);
  
  useEffect(() => {
    setSelectedVehicles(new Set());
  }, [vehicles]);
  
  const openIssues = useMemo(() => {
    return vehicleIssues.filter(issue => issue.status === 'Open');
  }, [vehicleIssues]);


  const sortedAdvisors = useMemo(() => {
    return [...advisors]
      .filter(a => a.name.toLowerCase().includes(advisorSearchTerm.toLowerCase()) || a.email.toLowerCase().includes(advisorSearchTerm.toLowerCase()))
      .sort((a, b) => {
        const valA = a[advisorSortKey].toLowerCase();
        const valB = b[advisorSortKey].toLowerCase();
        if (valA < valB) return advisorSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return advisorSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [advisors, advisorSortKey, advisorSortDirection, advisorSearchTerm]);
  
  const sortedVehicles = useMemo(() => {
    return [...vehicles]
    .filter(v => {
      // Filter out sold vehicles from management fleet table
      if (v.sold) return false;
      
      const searchMatch = v.model.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) || 
                          v.vin.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) || 
                          v.trim.toLowerCase().includes(vehicleSearchTerm.toLowerCase());
      return searchMatch;
    })
    .sort((a, b) => {
        const valA = a[vehicleSortKey].toLowerCase();
        const valB = b[vehicleSortKey].toLowerCase();
        if (valA < valB) return vehicleSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return vehicleSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [vehicles, vehicleSortKey, vehicleSortDirection, vehicleSearchTerm]);

  const handleAdvisorSort = (key: AdvisorSortKey) => {
    if (advisorSortKey === key) {
        setAdvisorSortDirection(advisorSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setAdvisorSortKey(key);
        setAdvisorSortDirection('asc');
    }
  };

  const handleVehicleSort = (key: VehicleSortKey) => {
    if (vehicleSortKey === key) {
        setVehicleSortDirection(vehicleSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setVehicleSortKey(key);
        setVehicleSortDirection('asc');
    }
  };
  
  const advisorTotalPages = Math.ceil(sortedAdvisors.length / ITEMS_PER_PAGE);
  const paginatedAdvisors = sortedAdvisors.slice(
    (advisorPage - 1) * ITEMS_PER_PAGE,
    advisorPage * ITEMS_PER_PAGE
  );

  const vehicleTotalPages = Math.ceil(sortedVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = sortedVehicles.slice(
    (vehiclePage - 1) * ITEMS_PER_PAGE,
    vehiclePage * ITEMS_PER_PAGE
  );

  const handleSaveAdvisor = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as UserRole || 'advisor';
  
    const advisorData: Partial<Advisor> = { name, email };
    if (canChangeRoles) {
        advisorData.role = role;
    }

    if (name && email) {
      if (editingAdvisor?.id) {
        const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${editingAdvisor.id}`);
        updateDocumentNonBlocking(advisorRef, advisorData);
        onAdvisorsUpdate(advisors.map(a => a.id === editingAdvisor.id ? { ...a, ...advisorData } as Advisor : a));
      } else {
        const advisorsColRef = collection(firestore, `stores/${storeCode}/advisors`);
        const newAdvisor = { ...advisorData, storeId: storeCode, id: `temp-${Date.now()}` } as Advisor;
        addDocumentNonBlocking(advisorsColRef, { ...advisorData, storeId: storeCode });
        onAdvisorsUpdate([...advisors, newAdvisor]);
      }
    }
    setAdvisorDialogOpen(false);
    setEditingAdvisor(null);
  }, [firestore, storeCode, editingAdvisor, onAdvisorsUpdate, advisors, canChangeRoles]);

  const handleDeleteAdvisor = useCallback((advisorId: string) => {
    if (!firestore) return;
    const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisorId}`);
    deleteDocumentNonBlocking(advisorRef);
    onAdvisorsUpdate(advisors.filter(a => a.id !== advisorId));
    setAdvisorToDelete(null);
  }, [firestore, storeCode, onAdvisorsUpdate, advisors]);
  
  const handleDeleteSelectedAdvisors = useCallback(() => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    selectedAdvisors.forEach(id => {
        const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${id}`);
        batch.delete(advisorRef);
    });
    batch.commit();
    onAdvisorsUpdate(advisors.filter(a => !selectedAdvisors.has(a.id)));
    setSelectedAdvisors(new Set());
    setAdvisorToDelete(null);
  }, [firestore, storeCode, selectedAdvisors, onAdvisorsUpdate, advisors]);

  const handleSaveVehicle = useCallback((vehicle: Vehicle) => {
    if (!firestore) return;
    const newVehicleData: Omit<Vehicle, 'id'> = { ...vehicle, storeId: storeCode };
    delete (newVehicleData as any).id; // Firestore will generate ID
    
    if (vehicle.id) {
      const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicle.id}`);
      updateDocumentNonBlocking(vehicleRef, { ...newVehicleData });
      onVehiclesUpdate(vehicles.map(v => v.id === vehicle.id ? vehicle : v));
    } else {
      const vehiclesColRef = collection(firestore, `stores/${storeCode}/vehicles`);
      const tempId = `temp-${Date.now()}`;
      addDocumentNonBlocking(vehiclesColRef, newVehicleData);
      onVehiclesUpdate([...vehicles, { ...vehicle, id: tempId }]);
    }
    setVehicleDialogOpen(false);
    setEditingVehicle(null);
  }, [firestore, storeCode, onVehiclesUpdate, vehicles]);

  const handleExportFleetCsv = useCallback(() => {
    const exportRows = vehicles
      .filter((v) => !v.sold)
      .map((v) => ({
        model: v.model,
        trim: v.trim,
        vin: v.vin,
        licensePlate: v.licensePlate ?? '',
        status: v.status,
        batteryLevel: v.batteryLevel,
        exteriorColor: v.exteriorColor,
        interiorColor: v.interiorColor,
        wheelSize: v.wheelSize,
        seats: v.seats,
      }));

    const headers = [
      'model',
      'trim',
      'vin',
      'licensePlate',
      'status',
      'batteryLevel',
      'exteriorColor',
      'interiorColor',
      'wheelSize',
      'seats',
    ] as const;

    const csv = convertJsonToCsv(exportRows, [...headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fleet_${storeCode}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({
      title: 'Fleet exported',
      description: 'CSV includes license plates (not shown in the Fleet table).',
    });
  }, [vehicles, storeCode, toast]);

  const handleDeleteVehicle = useCallback((vehicleId: string) => {
    if (!firestore) return;
    const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleId}`);
    deleteDocumentNonBlocking(vehicleRef);
    onVehiclesUpdate(vehicles.filter(v => v.id !== vehicleId));
    setVehicleToDelete(null);
  }, [firestore, storeCode, onVehiclesUpdate, vehicles]);

  const handleMarkAsSold = useCallback(async (vehicleId: string) => {
    if (!firestore) return;
    
    try {
      const { serverTimestamp } = await import('firebase/firestore');
      const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleId}`);
      
      await updateDoc(vehicleRef, { 
        sold: true,
        soldDate: serverTimestamp(),
        status: 'Sold' as VehicleStatus
      });
      
      onVehiclesUpdate(
        vehicles.map(v => v.id === vehicleId ? { ...v, sold: true, status: 'Sold' as VehicleStatus } : v)
      );
      
      toast({
        title: 'Vehicle Marked as Sold',
        description: 'The vehicle will be hidden from the fleet but remain in analytics.',
      });
    } catch (error) {
      console.error("Error marking vehicle as sold:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark vehicle as sold.',
      });
    }
  }, [firestore, storeCode, onVehiclesUpdate, vehicles, toast]);

  const handleDeleteSelectedVehicles = useCallback(() => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    selectedVehicles.forEach(id => {
        const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${id}`);
        batch.delete(vehicleRef);
    });
    batch.commit();
    onVehiclesUpdate(vehicles.filter(v => !selectedVehicles.has(v.id)));
    setSelectedVehicles(new Set());
    setVehicleToDelete(null);
  }, [firestore, storeCode, selectedVehicles, onVehiclesUpdate, vehicles]);

  const handleVehicleStatusChange = useCallback(async (vehicleId: string, newStatus: VehicleStatus) => {
    if (!firestore) return;
    
    const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicleId}`);
    
    try {
        await updateDoc(vehicleRef, { status: newStatus });
        
        onVehiclesUpdate(
            vehicles.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v)
        );

        if (newStatus === 'Needs Attention') {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            if (vehicle) {
                const issuesColRef = collection(firestore, `stores/${storeCode}/vehicles/${vehicleId}/vehicle_issues`);
                const newIssue: Omit<VehicleIssue, 'id' | 'resolutionNotes' | 'resolutionDate'> = {
                    description: 'Manually flagged for attention by manager.',
                    dateReported: new Date(),
                    status: 'Open',
                    vehicleId: vehicle.id,
                    storeId: storeCode,
                    vehicleModel: vehicle.model,
                    vehicleVin: vehicle.vin,
                };
                addDocumentNonBlocking(issuesColRef, newIssue);
            }
        }

        toast({
            title: 'Success',
            description: `Vehicle status updated to "${newStatus}".`,
        });
    } catch (error) {
        console.error("Error updating vehicle status:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update vehicle status.',
        });
    }
  }, [firestore, storeCode, toast, onVehiclesUpdate, vehicles]);
  
  const handleClearToday = () => {
    startTransition(async () => {
      if (!firestore) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const driveLogsRef = collection(firestore, `stores/${storeCode}/demo_drives`);
      const q = query(driveLogsRef, where('startTime', '>=', today));
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();

      toast({ title: 'Success', description: "Today's logs have been cleared." });
    });
  };

  const handleReset = () => {
    startTransition(async () => {
        if (!firestore) return;
        setResetDialogOpen(false);
        const batch = writeBatch(firestore);

        if (resetOptions.logs) {
            const colRef = collection(firestore, `stores/${storeCode}/demo_drives`);
            const snapshot = await getDocs(colRef);
            snapshot.docs.forEach(document => batch.delete(document.ref));
        }
        if (resetOptions.advisors) {
            const colRef = collection(firestore, `stores/${storeCode}/advisors`);
            const snapshot = await getDocs(colRef);
            snapshot.docs.forEach(document => batch.delete(document.ref));
        }
        if (resetOptions.vehicles) {
            const colRef = collection(firestore, `stores/${storeCode}/vehicles`);
            const snapshot = await getDocs(colRef);
            snapshot.docs.forEach(document => batch.delete(document.ref));
        }
        
        if(resetOptions.advisors || resetOptions.vehicles) {
            const seedData = getStoreData(storeCode);
            if (seedData) {
                if (resetOptions.advisors) {
                    seedData.advisors.forEach(advisor => {
                        const {id, ...advisorData} = advisor;
                        const advisorRef = doc(collection(firestore, `stores/${storeCode}/advisors`));
                        batch.set(advisorRef, stripUndefined({ ...advisorData, storeId: storeCode }));
                    });
                }
                if (resetOptions.vehicles) {
                    seedData.vehicles.forEach(vehicle => {
                        const {id, ...vehicleData} = vehicle;
                        const vehicleRef = doc(collection(firestore, `stores/${storeCode}/vehicles`));
                        batch.set(vehicleRef, stripUndefined({ ...vehicleData, storeId: storeCode }));
                    });
                }
            }
        }
        
        await batch.commit();
        toast({ title: 'Success', description: 'Selected store data has been reset.' });
        setResetOptions({ advisors: false, vehicles: false, logs: false });
    });
  };

   const onSelectAdvisor = (advisorId: string, checked: boolean) => {
    setSelectedAdvisors(prev => {
        const newSet = new Set(prev);
        if(checked) {
        newSet.add(advisorId);
        } else {
        newSet.delete(advisorId);
        }
        return newSet;
    });
  };

  const onSelectAllAdvisors = (checked: boolean) => {
      if(checked) {
          setSelectedAdvisors(new Set(advisors.map(a => a.id)));
      } else {
          setSelectedAdvisors(new Set());
      }
  };

  const onSelectVehicle = (vehicleId: string, checked: boolean) => {
      setSelectedVehicles(prev => {
          const newSet = new Set(prev);
          if (checked) {
              newSet.add(vehicleId);
          } else {
              newSet.delete(vehicleId);
          }
          return newSet;
      });
  };

  const onSelectAllVehicles = (checked: boolean) => {
      if (checked) {
          setSelectedVehicles(new Set(vehicles.map(v => v.id)));
      } else {
          setSelectedVehicles(new Set());
      }
  };

  const SortIndicator = ({ direction }: { direction: SortDirection | null }) => {
    if (!direction) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const renderMobileAdvisorManagement = () => (
    <Card className="border-border/40">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <UserCheck className="w-4 h-4 text-primary" />
              </div>
              Manage Advisors
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm">Add, edit, or remove advisors.</CardDescription>
          </div>
          <Dialog open={isAdvisorDialogOpen} onOpenChange={setAdvisorDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingAdvisor(null); setAdvisorDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAdvisor?.id ? 'Edit Advisor' : 'Add New Advisor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveAdvisor} className="space-y-4">
                <div><Label htmlFor="advisor-name">Name</Label><Input id="advisor-name" name="name" defaultValue={editingAdvisor?.name} required /></div>
                <div><Label htmlFor="advisor-email">Email</Label><Input id="advisor-email" name="email" type="email" defaultValue={editingAdvisor?.email} required /></div>
                {canChangeRoles && (
                    <div className="space-y-2">
                      <Label htmlFor="advisor-role">Role</Label>
                      <Select name="role" defaultValue={editingAdvisor?.role || 'advisor'}>
                        <SelectTrigger id="advisor-role"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advisor">Advisor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          {isSuperAdmin && <SelectItem value="moderator">Moderator</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                )}
                <Button type="submit">Save Advisor</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Checkbox 
                    id="select-all-advisors-mobile"
                    checked={selectedAdvisors.size > 0 && selectedAdvisors.size === sortedAdvisors.length}
                    onCheckedChange={onSelectAllAdvisors}
                />
                <Label htmlFor="select-all-advisors-mobile">Select All</Label>
                {selectedAdvisors.size > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedAdvisors.size})</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {selectedAdvisors.size} advisor(s).</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedAdvisors}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Sort <ArrowUpDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleAdvisorSort('name')}>Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdvisorSort('email')}>Email</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <Accordion type="multiple" className="space-y-3">
          {sortedAdvisors.map(advisor => (
            <AccordionItem key={advisor.id} value={advisor.id} className="border bg-card rounded-lg overflow-hidden">
              <div className="flex items-center p-2">
                <Checkbox id={`select-${advisor.id}`} checked={selectedAdvisors.has(advisor.id)} onCheckedChange={(checked) => onSelectAdvisor(advisor.id, checked as boolean)} className="mr-4 ml-2" />
                <AccordionTrigger className="p-2 hover:no-underline flex-1">
                  <div className="flex items-center gap-4 text-left">
                    <Avatar>
                      <AvatarImage src={advisor.avatarUrl} />
                      <AvatarFallback>{advisor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{advisor.name}</p>
                      <p className="text-sm text-muted-foreground">{advisor.email}</p>
                    </div>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent className="p-4 border-t bg-muted/50">
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingAdvisor(advisor); setAdvisorDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this advisor.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => advisor.id && handleDeleteAdvisor(advisor.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderMobileVehicleManagement = () => (
     <Card className="border-border/40">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Car className="w-4 h-4 text-primary" />
              </div>
              Manage Fleet
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm">Add, edit, or remove vehicles.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportFleetCsv} aria-label="Export fleet CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Dialog open={isVehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />Add</Button></DialogTrigger>
              <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle></DialogHeader><VehicleForm vehicle={editingVehicle} onSubmit={handleSaveVehicle} onCancel={() => setVehicleDialogOpen(false)} /></DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Checkbox id="select-all-vehicles-mobile" checked={selectedVehicles.size > 0 && selectedVehicles.size === sortedVehicles.length} onCheckedChange={onSelectAllVehicles} />
                <Label htmlFor="select-all-vehicles-mobile">Select All</Label>
                {selectedVehicles.size > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedVehicles.size})</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {selectedVehicles.size} vehicle(s).</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedVehicles}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Sort <ArrowUpDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleVehicleSort('model')}>Model</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVehicleSort('vin')}>VIN</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVehicleSort('status')}>Status</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <Accordion type="multiple" className="space-y-3">
          {sortedVehicles.map(vehicle => (
            <AccordionItem key={vehicle.id} value={vehicle.id} className="border bg-card rounded-lg overflow-hidden">
               <div className="flex items-center p-2">
                 <Checkbox id={`select-vehicle-${vehicle.id}`} checked={selectedVehicles.has(vehicle.id)} onCheckedChange={(checked) => onSelectVehicle(vehicle.id, checked as boolean)} className="mr-4 ml-2" />
                  <AccordionTrigger className="p-2 hover:no-underline flex-1">
                      <div className="flex items-center gap-4 text-left">
                          <div>
                              <p className="font-semibold">{vehicle.model} {vehicle.trim}</p>
                              <p className="text-sm text-muted-foreground">...{vehicle.vin.slice(-6)}</p>
                          </div>
                      </div>
                  </AccordionTrigger>
                  <Badge variant={vehicle.status === 'Needs Attention' ? 'destructive' : 'outline'} className="mr-2">{vehicle.status}</Badge>
              </div>
              <AccordionContent className="p-4 border-t bg-muted/50">
                <div className="space-y-1 mb-4 text-sm">
                    <p><strong>Exterior:</strong> {vehicle.exteriorColor}</p>
                    <p><strong>Interior:</strong> {vehicle.interiorColor}</p>
                    <p><strong>Wheels:</strong> {vehicle.wheelSize}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                  {!vehicle.sold && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400">
                          <CheckCircle className="h-4 w-4 mr-2" />Sold
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark Vehicle as Sold?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will hide the vehicle from the fleet page but keep it in analytics and history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleMarkAsSold(vehicle.id)}>Mark as Sold</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this vehicle.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );

  const managementTabs = [
    { value: 'vehicles', label: 'Fleet' },
    { value: 'advisors', label: 'Advisors' },
    ...((isManager || isModerator) ? [{ value: 'goals', label: 'Goals' }] : []),
    { value: 'issues', label: 'Issues' },
    { value: 'operations', label: 'Store' },
    ...(isSuperAdmin ? [{ value: 'awards', label: 'Awards' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Modern Header Section with Gradient */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Store Management
        </h1>
        <p className="text-muted-foreground">
          Manage advisors, vehicles, and operations for {storeName}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="bg-background/50 border-border/60">
              <SelectValue placeholder="Select a management area" />
            </SelectTrigger>
            <SelectContent>
              {managementTabs.map(tab => (
                <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1.5 text-muted-foreground border border-border/40 shadow-sm flex-wrap gap-1">
            {managementTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        )}
          
          <TabsContent value="vehicles" className="mt-6">
            {isMobile ? renderMobileVehicleManagement() : (
              <Card className="border-border/40">
                <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        Manage Fleet
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm">
                        Add, edit, or remove vehicles from this store.
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-auto md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search model, VIN, trim..."
                            value={vehicleSearchTerm}
                            onChange={(e) => setVehicleSearchTerm(e.target.value)}
                            className="pl-10 bg-background/50 border-border/60"
                        />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50 shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
                            <TableHead className="w-[50px]">
                                <Checkbox 
                                    checked={selectedVehicles.size > 0 && paginatedVehicles.every(v => selectedVehicles.has(v.id))}
                                    onCheckedChange={checked => {
                                      const currentIds = paginatedVehicles.map(v => v.id);
                                      if(checked) {
                                        setSelectedVehicles(prev => new Set([...prev, ...currentIds]));
                                      } else {
                                          setSelectedVehicles(prev => {
                                              const newSet = new Set(prev);
                                              currentIds.forEach(id => newSet.delete(id));
                                              return newSet;
                                          });
                                      }
                                    }}
                                    aria-label="Select all vehicles on this page"
                                />
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleVehicleSort('model')}>
                                    Model <SortIndicator direction={vehicleSortKey === 'model' ? vehicleSortDirection : null} />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleVehicleSort('vin')}>
                                    VIN <SortIndicator direction={vehicleSortKey === 'vin' ? vehicleSortDirection : null} />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleVehicleSort('status')}>
                                    Status <SortIndicator direction={vehicleSortKey === 'status' ? vehicleSortDirection : null} />
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                               <div className="flex items-center justify-end gap-2">
                                {selectedVehicles.size > 0 && (
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" className="mr-auto">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              ({selectedVehicles.size})
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  This will permanently delete {selectedVehicles.size} vehicle(s).
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleDeleteSelectedVehicles}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <Button size="sm" variant="outline" onClick={handleExportFleetCsv}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Export CSV
                                </Button>
                                <Dialog open={isVehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }}>
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add Vehicle
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                                    </DialogHeader>
                                    <VehicleForm
                                      vehicle={editingVehicle}
                                      onSubmit={handleSaveVehicle}
                                      onCancel={() => setVehicleDialogOpen(false)}
                                    />
                                  </DialogContent>
                                </Dialog>
                               </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedVehicles.map((vehicle) => {
                            const canChangeStatus = vehicle.status !== 'On Demo';
                            return (
                            <TableRow key={vehicle.id} className="border-b border-border/20 hover:bg-muted/40 transition-colors">
                              <TableCell>
                                  <Checkbox
                                    checked={selectedVehicles.has(vehicle.id)}
                                    onCheckedChange={checked => onSelectVehicle(vehicle.id, checked as boolean)}
                                    aria-label={`Select vehicle ${vehicle.model} ${vehicle.vin.slice(-6)}`}
                                  />
                              </TableCell>
                              <TableCell>{vehicle.model} {vehicle.trim}</TableCell>                          
                              <TableCell>...{vehicle.vin.slice(-6)}</TableCell>
                              <TableCell>
                                {canChangeStatus ? (
                                    <Select
                                        value={vehicle.status}
                                        onValueChange={(newStatus) => handleVehicleStatusChange(vehicle.id, newStatus as VehicleStatus)}
                                    >
                                        <SelectTrigger className="w-[150px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                                            <SelectItem value="Charging">Charging</SelectItem>
                                            <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Badge 
                                    variant={vehicle.status === 'Needs Attention' ? 'destructive' : 'outline'}
                                    className={vehicle.status === 'Needs Attention' ? '' : 'text-foreground'}
                                    >
                                    {vehicle.status}
                                    </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!vehicle.sold && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400">
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Mark Vehicle as Sold?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will hide the vehicle from the fleet page but keep it in analytics and history. This action can be undone by editing the vehicle later.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleMarkAsSold(vehicle.id)}>Mark as Sold</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  This will permanently delete this vehicle. This action cannot be undone.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                  </div>
                  {vehicleTotalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVehiclePage(prev => Math.max(prev - 1, 1))}
                            disabled={vehiclePage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {vehiclePage} of {vehicleTotalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVehiclePage(prev => Math.min(prev + 1, vehicleTotalPages))}
                            disabled={vehiclePage === vehicleTotalPages}
                        >
                            Next
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="advisors" className="mt-6">
            {isMobile ? renderMobileAdvisorManagement() : (
              <Card className="border-border/40">
                <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                          <UserCheck className="w-4 h-4 text-primary" />
                        </div>
                        Manage Advisors
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm">
                        Add, edit, or remove advisors from this store.
                      </CardDescription>
                    </div>
                     <div className="relative w-full sm:w-auto md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search name, email..."
                            value={advisorSearchTerm}
                            onChange={(e) => setAdvisorSearchTerm(e.target.value)}
                            className="pl-10 bg-background/50 border-border/60"
                        />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50 shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
                          <TableHead className="w-[50px]">
                            <Checkbox 
                              checked={selectedAdvisors.size > 0 && paginatedAdvisors.every(a => selectedAdvisors.has(a.id))}
                              onCheckedChange={checked => {
                                const currentIds = paginatedAdvisors.map(a => a.id);
                                if(checked) {
                                    setSelectedAdvisors(prev => new Set([...prev, ...currentIds]));
                                } else {
                                    setSelectedAdvisors(prev => {
                                        const newSet = new Set(prev);
                                        currentIds.forEach(id => newSet.delete(id));
                                        return newSet;
                                    });
                                }
                              }}
                              aria-label="Select all advisors on this page"
                            />
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" onClick={() => handleAdvisorSort('name')}>
                                Name <SortIndicator direction={advisorSortKey === 'name' ? advisorSortDirection : null} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" onClick={() => handleAdvisorSort('email')}>
                                Email <SortIndicator direction={advisorSortKey === 'email' ? advisorSortDirection : null} />
                            </Button>
                          </TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">
                             <div className="flex items-center justify-end gap-2">
                                {selectedAdvisors.size > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="mr-auto">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                ({selectedAdvisors.size})
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete {selectedAdvisors.size} advisor(s).
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteSelectedAdvisors}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Dialog
                                  open={isAdvisorDialogOpen}
                                  onOpenChange={setAdvisorDialogOpen}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setEditingAdvisor(null);
                                        setAdvisorDialogOpen(true);
                                      }}
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add Advisor
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {editingAdvisor?.id ? 'Edit Advisor' : 'Add New Advisor'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSaveAdvisor} className="space-y-4">
                                        <div>
                                            <Label htmlFor="advisor-name">Advisor Name</Label>
                                            <Input id="advisor-name" name="name" defaultValue={editingAdvisor?.name} required />
                                        </div>
                                        <div>
                                            <Label htmlFor="advisor-email">Advisor Email</Label>
                                            <Input id="advisor-email" name="email" type="email" defaultValue={editingAdvisor?.email} required />
                                        </div>
                                        {canChangeRoles && (
                                            <div className="space-y-2">
                                                <Label htmlFor="advisor-role">Role</Label>
                                                <Select name="role" defaultValue={editingAdvisor?.role || 'advisor'} disabled={!canChangeRoles}>
                                                <SelectTrigger id="advisor-role"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="advisor">Advisor</SelectItem>
                                                    <SelectItem value="manager">Manager</SelectItem>
                                                    {isSuperAdmin && <SelectItem value="moderator">Moderator</SelectItem>}
                                                </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <Button type="submit">Save Advisor</Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAdvisors.map((advisor) => (
                          <TableRow key={advisor.id} className="border-b border-border/20 last:border-0 hover:bg-muted/40 transition-colors">
                            <TableCell>
                              <Checkbox 
                                  checked={selectedAdvisors.has(advisor.id)}
                                  onCheckedChange={(checked) => onSelectAdvisor(advisor.id, checked as boolean)}
                                  aria-label={`Select advisor ${advisor.name}`}
                              />
                            </TableCell>
                            <TableCell>{advisor.name}</TableCell>
                            <TableCell>{advisor.email}</TableCell>
                            <TableCell>
                                <Badge variant={getRoleBadgeVariant(advisor.role || 'advisor')}>
                                    {advisor.role || 'advisor'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingAdvisor(advisor);
                                  setAdvisorDialogOpen(true);
                                }}
                              >
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
                                        <AlertDialogDescription>
                                            This will permanently delete this advisor. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => advisor.id && handleDeleteAdvisor(advisor.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {advisorTotalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdvisorPage(prev => Math.max(prev - 1, 1))}
                            disabled={advisorPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {advisorPage} of {advisorTotalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdvisorPage(prev => Math.min(prev + 1, advisorTotalPages))}
                            disabled={advisorPage === advisorTotalPages}
                        >
                            Next
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
           {(isManager || isModerator) && (
            <TabsContent value="goals" className="mt-6">
                    <React.Suspense fallback={<div>Loading...</div>}>
                        <GoalsTab 
                        advisors={advisors} 
                        storeCode={storeCode} 
                        goals={goals || []}
                        driveLogs={driveLogs || []}
                        currentAdvisor={currentAdvisor}
                        storeName={storeName}
                        />
                    </React.Suspense>
                </TabsContent>
           )}
          <TabsContent value="issues" className="mt-6">
               <Card className="border-border/40">
                <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    Open Vehicle Issues
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-sm">
                    Issues reported that need attention before the vehicle can be used for demos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50 shadow-sm">
                    <ScrollArea className="h-[300px] w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
                              <TableHead>Vehicle</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead className="hidden sm:table-cell">Reported On</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {openIssues.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                  No open issues.
                                </TableCell>
                              </TableRow>
                            )}
                            {openIssues.map((issue) => (
                              <TableRow key={issue.id} className="border-b border-border/20 last:border-0 hover:bg-muted/40 transition-colors">
                                <TableCell>
                                  <div className="font-medium">{issue.vehicleModel}</div>
                                  <div className="text-sm text-muted-foreground">...{issue.vehicleVin.slice(-6)}</div>
                                </TableCell>
                                <TableCell className="max-w-[150px] sm:max-w-xs truncate whitespace-normal">{issue.description}</TableCell>
                                <TableCell className="hidden sm:table-cell">{issue.dateReported?.toDate ? issue.dateReported.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setResolvingIssue(issue)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    Resolve
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="operations" className="mt-6">
              <Card className="border-border/40">
                <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    Store Operations
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-sm">High-level operations for this store.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StoreOperationsSettings storeCode={storeCode} />
                        {/* Clear Today's Logs Card */}
                        <AlertDialog>
                            <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background via-muted/10 to-background p-6 hover:border-border/60 transition-all duration-200 hover:shadow-lg">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500/15 transition-colors">
                                        <Trash className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base mb-1.5">Clear Today's Logs</h3>
                                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Remove all drive logs created today. This action is permanent.</p>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50">
                                                <Trash className="mr-2 h-4 w-4" />
                                                Clear Logs
                                            </Button>
                                        </AlertDialogTrigger>
                                    </div>
                                </div>
                            </div>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all drive logs created today. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearToday} disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Confirm
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>

                        {/* Reset Store Card */}
                        <Dialog open={isResetDialogOpen} onOpenChange={setResetDialogOpen}>
                            <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background via-muted/10 to-background p-6 hover:border-destructive/40 transition-all duration-200 hover:shadow-lg">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 group-hover:bg-destructive/15 transition-colors">
                                        <RefreshCw className="h-5 w-5 text-destructive" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base mb-1.5">Reset Store Data</h3>
                                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Delete and re-seed data with initial values. This is irreversible.</p>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="w-full" disabled={isPending}>
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                                Reset Store
                                            </Button>
                                        </DialogTrigger>
                                    </div>
                                </div>
                            </div>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reset Store Data</DialogTitle>
                                <DialogDescription>This action will delete existing data and re-seed it with initial values. This is irreversible.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="reset-advisors" checked={resetOptions.advisors} onCheckedChange={(checked) => setResetOptions(o => ({...o, advisors: checked as boolean}))} />
                                    <Label htmlFor="reset-advisors" className="text-sm font-normal">Reset Advisors</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="reset-vehicles" checked={resetOptions.vehicles} onCheckedChange={(checked) => setResetOptions(o => ({...o, vehicles: checked as boolean}))} />
                                    <Label htmlFor="reset-vehicles" className="text-sm font-normal">Reset Vehicles</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="reset-logs" checked={resetOptions.logs} onCheckedChange={(checked) => setResetOptions(o => ({...o, logs: checked as boolean}))} />
                                    <Label htmlFor="reset-logs" className="text-sm font-normal">Clear all Drive Logs</Label>
                                </div>
                            </div>
                            <CardFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full" disabled={isPending || isResetDisabled}>
                                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                            Reset Store Data
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Store Reset</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action is permanent and cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleReset} disabled={isPending}>
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Proceed
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </DialogContent>
                    </Dialog>
                    </div>
                </CardContent>
              </Card>
          </TabsContent>
          {isSuperAdmin && (
             <TabsContent value="awards" className="mt-6">
                <React.Suspense fallback={<div>Loading...</div>}>
                    <AwardsTab 
                      advisors={advisors} 
                      storeCode={storeCode} 
                      manualAwards={manualAwards || []}
                      currentAdvisor={currentAdvisor}
                    />
                </React.Suspense>
             </TabsContent>
          )}
      </Tabs>

      {resolvingIssue && (
        <ResolveIssueDialog
            issue={resolvingIssue}
            isOpen={!!resolvingIssue}
            onClose={() => setResolvingIssue(null)}
            storeCode={storeCode}
        />
      )}
    </div>
  );
}
