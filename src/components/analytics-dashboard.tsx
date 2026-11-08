

'use client';

import { useMemo, useState, useEffect, Suspense, lazy, useRef } from 'react';
import type { DriveLog, Advisor, UserRole, VehicleModel, FsdOrderRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarChartIcon, Users, Award, Clock, TrendingUp, UserCheck, Zap, Eye, EyeOff, Filter, X, BatteryCharging, UserRoundCheck, Hourglass, Star, Trophy, CheckCircle, TrendingDown, Minus, FileText, ClipboardList, AlertCircle, SlidersHorizontal, Check, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, LabelList } from 'recharts';
import { ChevronDown, ChevronUp, List, BarChart2, ArrowUpDown, Download, Timer } from 'lucide-react';
import { formatMinutesToHoursAndMinutes } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Timestamp } from 'firebase/firestore';
import { endOfDay, startOfDay, format, isSameDay, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, startOfQuarter, endOfQuarter, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import CopilotBanner from './copilot-banner';
import { Progress } from './ui/progress';
import { ChartBuilderUI } from './chart-builder-ui';
import { getPresetById } from '@/lib/chart-builder/chart-presets';
import type { ChartConfig } from '@/lib/chart-builder';
import { getPurchaseChartData, getStorePurchaseConversionRate, getAdvisorOrdersChartData } from '@/lib/purchase-analytics';
import {
  filterFsdOrdersByDateRange,
  getFsdTakeRate,
  getFsdWeeklyTakeRateChartData,
  getFsdCoachMoment,
} from '@/lib/fsd-analytics';
import { ShoppingBag } from 'lucide-react';
import MorningBrief from './morning-brief';
import WeeklyStoreReport from './weekly-store-report';
import RegionalLite from './regional-lite';
import { CoachingQueue } from './coaching-queue';
import type { Vehicle } from '@/lib/types';
import { isElevatedUserRole } from '@/lib/demo-users';


interface AnalyticsDashboardProps {
  driveLogs: DriveLog[];
  advisors: Advisor[];
  userRole: UserRole;
  storeName: string;
  storeCode?: string;
  vehicles?: Vehicle[];
  fsdOrders?: FsdOrderRecord[];
  onNavigateTab?: (tab: string) => void;
}

type SortKey = 'name' | 'drives_desc' | 'drives_asc' | 'duration_desc' | 'duration_asc';


const MODEL_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#dd7788', '#77dd88', '#8877dd'];
const DAY_COLORS = ['#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];
const MODEL_ORDER: VehicleModel[] = ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'];

const chartConfig = {
  drives: {
    label: "Drives",
    color: "hsl(var(--primary))",
  },
  peakHours: {
    label: "Peak Hours",
    color: "hsl(var(--primary))",
  },
   completed: { label: "Completed", color: "hsl(var(--chart-2))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-5))" },
} as const;

const AdvancedAnalyticsSection = lazy(() => import('./advanced-analytics-section'));

const QUICK_ANALYTICS_PRESETS = [
  { id: 'demo-drives-by-model', label: 'Drives by Model', description: 'Bar chart - popular demo vehicles' },
  { id: 'advisor-performance-ranking', label: 'Top Advisors', description: 'Horizontal bar - team leaderboard' },
  { id: 'daily-demo-volume-trend', label: 'Daily Volume', description: 'Line chart - trend over time' },
  { id: 'drive-duration-distribution', label: 'Duration Mix', description: 'Pie chart - 40min vs overnight' },
] as const;


export default function AnalyticsDashboard({
  driveLogs,
  advisors,
  userRole,
  storeName,
  storeCode = 'store',
  vehicles = [],
  fsdOrders = [],
  onNavigateTab,
}: AnalyticsDashboardProps) {
  const { toast } = useToast();
  const showOpsBrief = isElevatedUserRole(userRole);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [renderAdvanced, setRenderAdvanced] = useState(false);
  const [chartBuilderOpen, setChartBuilderOpen] = useState(false);
  const [chartBuilderInitialConfig, setChartBuilderInitialConfig] = useState<Partial<ChartConfig> | undefined>();
  const advancedSectionRef = useRef<HTMLDivElement>(null);
  
  const [showCopilotOfMonth, setShowCopilotOfMonth] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = sessionStorage.getItem('showCopilotOfMonth');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // State for global filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [coPilotFilter, setCoPilotFilter] = useState<string[]>([]);
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  
  // State for "Drives by Trim" chart's model filter
  const [trimModelFilter, setTrimModelFilter] = useState<string>('all');
  const [durationBreakdownFilter, setDurationBreakdownFilter] = useState<number>(40);
  const [batteryDegradationDurationFilter, setBatteryDegradationDurationFilter] = useState<number>(40);

  const isMobile = useBreakpoint() === 'sm';

  const openChartBuilder = (presetId?: string) => {
    if (presetId) {
      const preset = getPresetById(presetId);
      if (preset) {
        setChartBuilderInitialConfig({
          type: preset.chartType,
          name: preset.name,
          ...preset.config,
        });
      }
    } else {
      setChartBuilderInitialConfig(undefined);
    }
    setChartBuilderOpen(true);
  };

  const [drivesByModelSort, setDrivesByModelSort] = useState<SortKey>('drives_desc');
  const [drivesByAdvisorSort, setDrivesByAdvisorSort] = useState<SortKey>('drives_desc');
  const [drivesByTrimSort, setDrivesByTrimSort] = useState<SortKey>('drives_desc');
  const [coPilotPerformanceSort, setCoPilotPerformanceSort] = useState<SortKey>('drives_desc');
  const [advisorOrdersSort, setAdvisorOrdersSort] = useState<SortKey>('drives_desc');
  const [coPilotDurationSort, setCoPilotDurationSort] = useState<SortKey>('duration_desc');

  useEffect(() => {
    sessionStorage.setItem('showCopilotOfMonth', JSON.stringify(showCopilotOfMonth));
  }, [showCopilotOfMonth]);
  
  useEffect(() => {
    if (showAdvanced) {
      setRenderAdvanced(true);
    }
  }, [showAdvanced]);

  const uniqueFilterOptions = useMemo(() => {
    const models = new Set<string>();
    const coPilots = new Set<string>();
    const purposes = new Set<string>();

    driveLogs.forEach(log => {
      models.add(log.vehicleModel);
      if (log.coPilot) coPilots.add(log.coPilot);
      purposes.add(log.purpose);
    });
    
    const sortedModels = Array.from(models).sort((a, b) => {
        const indexA = MODEL_ORDER.indexOf(a as VehicleModel);
        const indexB = MODEL_ORDER.indexOf(b as VehicleModel);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return {
      models: sortedModels,
      coPilots: Array.from(coPilots).sort(),
      purposes: Array.from(purposes).sort(),
    };
  }, [driveLogs]);

    const previousDateRange = useMemo<DateRange | undefined>(() => {
        if (!dateRange || !dateRange.from) return undefined;
        const from = dateRange.from;
        const to = dateRange.to || from;
        const diff = differenceInDays(to, from);
        
        const prevFrom = subDays(from, diff + 1);
        const prevTo = subDays(to, diff + 1);

        return { from: prevFrom, to: prevTo };
    }, [dateRange]);

  const filteredDriveLogs = useMemo(() => {
    return driveLogs.filter(log => {
      // Date filter
      if (!dateRange?.from) return false;
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      const logDate = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
      if (logDate < from || logDate > to) return false;
      
      // Model filter
      if (modelFilter !== 'all' && log.vehicleModel !== modelFilter) return false;

      // Co-pilot filter (multi-select)
      if (coPilotFilter.length > 0 && log.coPilot && !coPilotFilter.includes(log.coPilot)) return false;

      // Purpose filter
      if (purposeFilter !== 'all' && log.purpose !== purposeFilter) return false;
      
      // Duration filter
      if (durationFilter !== 'all') {
        const expected = parseInt(durationFilter);
        if (expected !== log.expectedDuration) return false;
      }

      return true;
    });
  }, [driveLogs, dateRange, modelFilter, coPilotFilter, purposeFilter, durationFilter]);

    const previousFilteredDriveLogs = useMemo(() => {
        if (!previousDateRange) return [];
        return driveLogs.filter(log => {
            if (!previousDateRange?.from) return false;
            const from = startOfDay(previousDateRange.from);
            const to = previousDateRange.to ? endOfDay(previousDateRange.to) : endOfDay(previousDateRange.from);
            const logDate = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
            if (logDate < from || logDate > to) return false;

            // Apply same filters as current period
            if (modelFilter !== 'all' && log.vehicleModel !== modelFilter) return false;
            if (coPilotFilter.length > 0 && log.coPilot && !coPilotFilter.includes(log.coPilot)) return false;
            if (purposeFilter !== 'all' && log.purpose !== purposeFilter) return false;
            if (durationFilter !== 'all') {
                const expected = parseInt(durationFilter);
                if (expected !== log.expectedDuration) return false;
            }
            return true;
        });
    }, [driveLogs, previousDateRange, modelFilter, coPilotFilter, purposeFilter, durationFilter]);


  const getStartTime = (log: DriveLog) => {
    if (!log.startTime) return 0;
    if ((log.startTime as Timestamp)?.toDate) {
        return (log.startTime as Timestamp).toDate().getTime();
    }
    return new Date(log.startTime as number | Date).getTime();
  };

  const getEndTime = (log: DriveLog) => {
    if (!log.endTime) return 0;
    if ((log.endTime as Timestamp)?.toDate) {
        return (log.endTime as Timestamp).toDate().getTime();
    }
    return new Date(log.endTime as number | Date).getTime();
  };

  const calculateMetrics = (logs: DriveLog[]) => {
    const demoDrives = logs.filter(log => log.purpose === 'Demo');
    const totalDrives = demoDrives.length;
    const totalChargingSessions = logs.filter(log => log.purpose === 'Charging').length;
    const totalOtherDrives = logs.filter(log => log.purpose === 'Other').length;
    const issuesReported = logs.filter(log => log.issueDetected).length;

    const totalDuration = demoDrives
        .filter(log => log.endTime && log.startTime)
        .reduce((acc, log) => acc + (getEndTime(log) - getStartTime(log)), 0);
    
    const avgDriveDuration = totalDrives > 0 ? Math.round(totalDuration / totalDrives / 60000) : 0;
    
    const completedDemosWithBattery = demoDrives.filter(log => typeof log.endBattery === 'number' && typeof log.startBattery === 'number' && log.startBattery > log.endBattery);

    const totalBatteryUsed = completedDemosWithBattery.reduce((acc, log) => acc + ((log.startBattery ?? 0) - (log.endBattery ?? 0)), 0);
    
    const avgBatteryUsage = completedDemosWithBattery.length === 0 ? 0 : parseFloat((totalBatteryUsed / completedDemosWithBattery.length).toFixed(1));

    const completedDemos = demoDrives.filter((log) => log.endTime);
    const purchaseConversions = completedDemos.filter((log) => log.customerPurchased).length;
    const purchaseConversionRate = completedDemos.length > 0
      ? parseFloat(((purchaseConversions / completedDemos.length) * 100).toFixed(1))
      : 0;

    return {
        totalDrives,
        totalChargingSessions,
        totalOtherDrives,
        issuesReported,
        avgDriveDuration,
        avgBatteryUsage,
        purchaseConversions,
        purchaseConversionRate,
    };
  }

    const currentMetrics = useMemo(() => calculateMetrics(filteredDriveLogs), [filteredDriveLogs]);
    const previousMetrics = useMemo(() => calculateMetrics(previousFilteredDriveLogs), [previousFilteredDriveLogs]);

    const purchaseChartData = useMemo(
      () => getPurchaseChartData(filteredDriveLogs),
      [filteredDriveLogs],
    );

    const filteredFsdOrders = useMemo(() => {
      if (!dateRange?.from) return [];
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      return filterFsdOrdersByDateRange(fsdOrders, from, to);
    }, [fsdOrders, dateRange]);

    const previousFilteredFsdOrders = useMemo(() => {
      if (!previousDateRange?.from) return [];
      const from = startOfDay(previousDateRange.from);
      const to = previousDateRange.to ? endOfDay(previousDateRange.to) : endOfDay(previousDateRange.from);
      return filterFsdOrdersByDateRange(fsdOrders, from, to);
    }, [fsdOrders, previousDateRange]);

    const fsdTakeRate = useMemo(() => getFsdTakeRate(filteredFsdOrders), [filteredFsdOrders]);
    const previousFsdTakeRate = useMemo(() => getFsdTakeRate(previousFilteredFsdOrders), [previousFilteredFsdOrders]);
    const fsdWeeklyChartData = useMemo(
      () => getFsdWeeklyTakeRateChartData(filteredFsdOrders),
      [filteredFsdOrders],
    );
    const fsdCoachMoment = useMemo(() => getFsdCoachMoment(filteredFsdOrders), [filteredFsdOrders]);

    const calculateDifference = (current: number, previous: number) => {
        return current - previous;
    }

    const TrendCard = ({ title, value, unit, trend, isHigherBetter, formatValue = (v) => v.toString(), icon, isPrimary = false }: { 
        title: string, 
        value: number, 
        unit?: string, 
        trend: number, 
        isHigherBetter: boolean, 
        formatValue?: (v: number) => string,
        icon?: React.ReactNode,
        isPrimary?: boolean
    }) => {
        const isImprovement = (trend > 0 && isHigherBetter) || (trend < 0 && !isHigherBetter);
        const TrendIcon = trend === 0 ? Minus : isImprovement ? TrendingUp : TrendingDown;
        const trendColor = trend === 0 ? 'text-muted-foreground' : isImprovement ? 'text-green-500' : 'text-red-500';
        const trendPrefix = trend > 0 ? '+' : '';

        // Bento mode for mobile/tablet - hero cards get special styling
        if (isPrimary) {
            return (
                <Card className="border-border/40 transition-all hover:border-border hover:shadow-md bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-primary/20 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3 mb-2">
                            {icon && <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">{icon}</div>}
                            <CardDescription className="text-xs font-medium uppercase tracking-wider">{title}</CardDescription>
                        </div>
                        <CardTitle className="text-4xl sm:text-5xl lg:text-4xl font-bold tracking-tight">
                            {formatValue(value)}
                            {unit && <span className="text-base text-muted-foreground ml-2 font-normal">{unit}</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-sm font-medium flex items-center gap-1.5", trendColor)}>
                            <TrendIcon className="h-4 w-4" />
                            <span>{trendPrefix}{trend.toFixed(0)}</span>
                            <span className="text-muted-foreground">vs last period</span>
                        </div>
                    </CardContent>
                </Card>
            )
        }

        // Standard compact card for bento grid
        return (
            <Card className="border-border/40 transition-all hover:border-border hover:shadow-sm bg-card-foreground/5 dark:bg-card/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                        {icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">{icon}</div>}
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">{title}</CardDescription>
                    </div>
                    <CardTitle className="text-3xl sm:text-4xl lg:text-3xl font-bold tracking-tight">
                        {formatValue(value)}
                        {unit && <span className="text-sm text-muted-foreground ml-1 font-normal">{unit}</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-xs font-medium flex items-center gap-1", trendColor)}>
                        <TrendIcon className="h-3.5 w-3.5" />
                        <span>{trendPrefix}{trend.toFixed(0)}</span>
                        <span className="text-muted-foreground hidden sm:inline">vs last period</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

  const drivesByModelData = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    const drivesByModel = demoDrives.reduce((acc, log) => {
      acc[log.vehicleModel] = (acc[log.vehicleModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(drivesByModel).map(([name, value]) => ({ name, drives: value, fill: `var(--color-${name.replace(/\s+/g, '-')})`  }))
      .sort((a, b) => {
        switch (drivesByModelSort) {
          case 'drives_desc': return b.drives - a.drives;
          case 'drives_asc': return a.drives - b.drives;
          case 'name': return a.name.localeCompare(b.name);
          default: return 0;
        }
      });
  }, [filteredDriveLogs, drivesByModelSort]);

  const drivesByTrimData = useMemo(() => {
    let demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    if (trimModelFilter !== 'all') {
        demoDrives = demoDrives.filter(log => log.vehicleModel === trimModelFilter);
    }
  
    const drivesByTrim = demoDrives.reduce((acc, log) => {
      // Forcefully remap "Long Range" for Model X to "All-Wheel Drive"
      let trim = log.vehicleTrim || 'Unknown';
      if (log.vehicleModel === 'Model X' && trim === 'Long Range') {
        trim = 'All-Wheel Drive';
      }
      acc[trim] = (acc[trim] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(drivesByTrim).map(([name, value]) => ({ name, drives: value, fill: `var(--color-${name.replace(/\s+/g, '-')})` }))
      .sort((a, b) => {
        switch (drivesByTrimSort) {
          case 'drives_desc': return b.drives - a.drives;
          case 'drives_asc': return a.drives - b.drives;
          case 'name': return a.name.localeCompare(b.name);
          default: return 0;
        }
      });
  }, [filteredDriveLogs, drivesByTrimSort, trimModelFilter]);

  const drivesByAdvisorData = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo' && log.coPilot);
    const drivesByAdvisor: Record<string, number> = {};
  
    // Initialize all advisors with 0 drives to ensure they appear on the chart
    advisors.forEach(adv => {
        drivesByAdvisor[adv.name] = 0;
    });
  
    // Tally drives from logs
    demoDrives.forEach(log => {
      if (log.coPilot) {
        drivesByAdvisor[log.coPilot] = (drivesByAdvisor[log.coPilot] || 0) + 1;
      }
    });
    
    return Object.entries(drivesByAdvisor)
      .map(([name, value]) => ({ name, drives: value, fill: `var(--color-${name.replace(/\s+/g, '-')})` }))
      .filter(item => item.drives > 0) // Optionally filter out advisors with 0 drives for cleaner charts
      .sort((a,b) => {
        switch (drivesByAdvisorSort) {
          case 'drives_desc': return b.drives - a.drives;
          case 'drives_asc': return a.drives - b.drives;
          case 'name': return a.name.localeCompare(b.name);
          default: return 0;
        }
      });
  }, [filteredDriveLogs, drivesByAdvisorSort, advisors]);

  const drivesByDayData = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    const drivesByDay = demoDrives.reduce((acc, log) => {
      const day = format(getStartTime(log), 'EEE');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays.map((day) => ({
      name: day,
      drives: drivesByDay[day] || 0,
    }));
  }, [filteredDriveLogs]);

  const peakHoursData = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    let minHour = 9;
    let maxHour = 20; 
    const hourlyDrives: Record<number, number> = {};

    demoDrives.forEach(log => {
      const hour = new Date(getStartTime(log)).getHours();
      hourlyDrives[hour] = (hourlyDrives[hour] || 0) + 1;
    });

    const driveHours = Object.keys(hourlyDrives).map(Number);
    if (driveHours.length > 0) {
        minHour = Math.min(minHour, ...driveHours);
        maxHour = Math.max(maxHour, ...driveHours);
    }

    const data = [];
    for (let i = minHour; i <= maxHour; i++) {
      const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const ampm = i < 12 || i === 24 ? 'AM' : 'PM';
      data.push({
        hour: `${hour12}${ampm}`,
        drives: hourlyDrives[i] || 0,
      });
    }
    return data;
  }, [filteredDriveLogs]);

  const getCoPilotTitle = (range?: DateRange): string => {
    if (!range || !range.from) return "of the Period";
    const from = range.from;
    const to = range.to || from;

    const today = new Date();
    const yesterday = subDays(today, 1);

    if (isSameDay(from, today) && isSameDay(to, today)) return "of the Day";
    if (isSameDay(from, yesterday) && isSameDay(to, yesterday)) return "of Yesterday";

    if (isSameDay(from, startOfWeek(today)) && isSameDay(to, endOfWeek(today))) return "of the Week";
    if (isSameDay(from, startOfMonth(today)) && isSameDay(to, endOfMonth(today))) return "of the Month";
    if (isSameDay(from, startOfQuarter(today)) && isSameDay(to, endOfQuarter(today))) return "of the Quarter";

    if (isSameDay(from, subDays(today, 6)) && isSameDay(to, today)) return "of the Last 7 Days";
    if (isSameDay(from, subDays(today, 29)) && isSameDay(to, today)) return "of the Last 30 Days";

    return "of the Period";
  }

  const coPilotOfThePeriod = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo' && log.coPilot);
    const periodLogs = demoDrives.filter(log => log.endTime && log.startTime);
    if (periodLogs.length === 0) return null;
    
    const drivesByAdvisor: Record<string, number> = {};
    advisors.forEach(adv => {
        drivesByAdvisor[adv.name] = 0;
    });

    periodLogs.forEach(log => {
        if (log.coPilot) drivesByAdvisor[log.coPilot] = (drivesByAdvisor[log.coPilot] || 0) + 1;
    });

    if (Object.values(drivesByAdvisor).every(d => d === 0)) return null;
  
    const maxDrives = Math.max(...Object.values(drivesByAdvisor));
    if (maxDrives === 0) return null;

    const topAdvisorNames = Object.entries(drivesByAdvisor)
        .filter(([_, drives]) => drives === maxDrives)
        .map(([name]) => name);
    
    const topAdvisors = topAdvisorNames.map(name => {
        const advisorData = advisors.find(a => a.name === name);
        return { name, avatarUrl: advisorData?.avatarUrl || null };
    });
  
    let titleSuffix = getCoPilotTitle(dateRange);
    let title = `Co-Pilot${topAdvisors.length > 1 ? 's' : ''} ${titleSuffix}`;
    return { advisors: topAdvisors, drives: maxDrives, title };
  }, [filteredDriveLogs, dateRange, advisors]);

  const coPilotPerformanceData = useMemo(() => {
    const data: Record<string, {name: string; completed: number; inProgress: number, total: number; autoCheckedIn: number}> = {};
    
    advisors.forEach(adv => {
        data[adv.name] = { name: adv.name, completed: 0, inProgress: 0, total: 0, autoCheckedIn: 0 };
    });

    filteredDriveLogs.forEach(log => {
        if (!log.coPilot || !data[log.coPilot]) return;

        // Only count Demo drives in performance metrics
        if (log.purpose !== 'Demo') return;

        if (log.endTime) {
            data[log.coPilot].completed += 1;
            // Count auto check-ins
            if (log.autoCheckedIn) {
                data[log.coPilot].autoCheckedIn += 1;
            }
        } else {
            // Demo drives that haven't ended yet are in progress
            data[log.coPilot].inProgress += 1;
        }
        // Count all Demo drives in total
        data[log.coPilot].total += 1;
    });

    return Object.values(data).sort((a,b) => {
        switch(coPilotPerformanceSort) {
            case 'drives_desc': return b.total - a.total;
            case 'drives_asc': return a.total - b.total;
            case 'name': return a.name.localeCompare(b.name);
            default: return 0;
        }
    });
  }, [filteredDriveLogs, coPilotPerformanceSort, advisors]);

  const advisorOrdersData = useMemo(() => {
    return getAdvisorOrdersChartData(filteredDriveLogs, advisors).sort((a, b) => {
      switch (advisorOrdersSort) {
        case 'drives_desc': return b.orders - a.orders;
        case 'drives_asc': return a.orders - b.orders;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [filteredDriveLogs, advisorOrdersSort, advisors]);

  const coPilotDurationData = useMemo(() => {
    const data: Record<string, {totalDuration: number, count: number}> = {};

    advisors.forEach(adv => {
        data[adv.name] = { totalDuration: 0, count: 0 };
    });

    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    demoDrives
      .filter(log => log.endTime && log.startTime && log.coPilot && log.expectedDuration === durationBreakdownFilter)
      .forEach(log => {
        if (!log.coPilot || !data[log.coPilot]) return;
        
        data[log.coPilot].totalDuration += (getEndTime(log) - getStartTime(log));
        data[log.coPilot].count += 1;
      });

    return Object.entries(data)
        .map(([name, { totalDuration, count }]) => ({
            name,
            avgDuration: count > 0 ? Math.round(totalDuration / count / 60000) : 0 // in minutes
        }))
        .sort((a,b) => {
            switch(coPilotDurationSort) {
                case 'duration_desc': return b.avgDuration - a.avgDuration;
                case 'duration_asc': return a.avgDuration - b.avgDuration;
                case 'name': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });
  }, [filteredDriveLogs, coPilotDurationSort, advisors, durationBreakdownFilter]);
  
  const drivesByDurationData = useMemo(() => {
    const durationMap: Record<string, number> = {
        '40 min': 0,
        '24 hours': 0,
        '48 hours': 0
    };
    
    filteredDriveLogs.forEach(log => {
        if(log.purpose === 'Demo' && log.endTime) {
            if(log.expectedDuration === 40) durationMap['40 min']++;
            else if(log.expectedDuration === 1440) durationMap['24 hours']++;
            else if(log.expectedDuration === 2880) durationMap['48 hours']++;
        }
    });
    
    return Object.entries(durationMap).map(([name, drives]) => ({ name, drives }));
  }, [filteredDriveLogs]);

  const otherDrivesData = useMemo(() => {
    const otherDrives = filteredDriveLogs.filter(log => log.purpose === 'Other');
    const drivesByFeedback: Record<string, number> = {};
  
    otherDrives.forEach(log => {
      const key = log.feedback || 'No Description';
      drivesByFeedback[key] = (drivesByFeedback[key] || 0) + 1;
    });
    
    return Object.entries(drivesByFeedback)
      .map(([name, drives]) => ({ name, drives }))
      .sort((a,b) => b.drives - a.drives);
  }, [filteredDriveLogs]);

  const batteryLeaderboard = useMemo(() => {
    const chargingSessionsByAdvisor: Record<string, number> = {};

    advisors.forEach(adv => {
        chargingSessionsByAdvisor[adv.name] = 0;
    });

    filteredDriveLogs
      .filter(log => log.purpose === 'Charging' && log.coPilot)
      .forEach(log => {
        if (log.coPilot) chargingSessionsByAdvisor[log.coPilot] = (chargingSessionsByAdvisor[log.coPilot] || 0) + 1;
      });

    const sorted = Object.entries(chargingSessionsByAdvisor)
      .map(([name, sessions]) => ({ name, sessions }))
      .sort((a, b) => b.sessions - a.sessions);

    if (sorted.length === 0) return [];

    let rank = 1;
    return sorted.map((item, index) => {
        if (index > 0 && item.sessions < sorted[index - 1].sessions) {
            rank = index + 1;
        }
        return { ...item, rank };
    });
  }, [filteredDriveLogs, advisors]);

  const advisorLeaderboard = useMemo(() => {
    const completedDrivesByAdvisor: Record<string, number> = {};
    
    advisors.forEach(adv => {
        completedDrivesByAdvisor[adv.name] = 0;
    });

    filteredDriveLogs
      .filter(log => log.purpose === 'Demo' && log.endTime && log.coPilot)
      .forEach(log => {
        if (log.coPilot) completedDrivesByAdvisor[log.coPilot] = (completedDrivesByAdvisor[log.coPilot] || 0) + 1;
      });

    const sorted = Object.entries(completedDrivesByAdvisor)
      .map(([name, drives]) => ({ name, drives }))
      .sort((a, b) => b.drives - a.drives);
    
    if (sorted.length === 0) return [];

    let rank = 1;
    return sorted.map((item, index) => {
        if (index > 0 && item.drives < sorted[index - 1].drives) {
            rank = index + 1;
        }
        return { ...item, rank };
    });
  }, [filteredDriveLogs, advisors]);

  const batteryPerformanceData = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    const completedDemosWithBattery = demoDrives.filter(log => typeof log.endBattery === 'number' && typeof log.startBattery === 'number' && log.startBattery > log.endBattery);
    const batteryByModel = completedDemosWithBattery.reduce((acc, log) => {
        if (!acc[log.vehicleModel]) {
            acc[log.vehicleModel] = { totalUsage: 0, count: 0 };
        }
        acc[log.vehicleModel].totalUsage += ((log.startBattery ?? 0) - (log.endBattery ?? 0));
        acc[log.vehicleModel].count += 1;
        return acc;
    }, {} as Record<string, {totalUsage: number, count: number}>);

    return Object.entries(batteryByModel)
        .map(([name, { totalUsage, count }]) => ({
            name,
            avgUsage: parseFloat((totalUsage / count).toFixed(1))
        }))
        .sort((a,b) => b.avgUsage - a.avgUsage);
  }, [filteredDriveLogs]);

  const punctualityStats = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    const completed = demoDrives.filter(log => log.endTime && log.startTime);
    if (completed.length === 0) {
      return { onTimeRate: 0, avgVariance: 0 };
    }
    let onTimeCount = 0;
    let totalVariance = 0;
    completed.forEach(log => {
      const actualDuration = (getEndTime(log) - getStartTime(log)) / 60000;
      if (actualDuration <= log.expectedDuration) {
        onTimeCount++;
      }
      totalVariance += (actualDuration - log.expectedDuration);
    });
    return {
      onTimeRate: Math.round((onTimeCount / completed.length) * 100),
      avgVariance: Math.round(totalVariance / completed.length),
    };
  }, [filteredDriveLogs]);

  const durationByModel = useMemo(() => {
    const demoDrives = filteredDriveLogs.filter(log => log.purpose === 'Demo');
    const durationData = demoDrives
      .filter(log => log.endTime && log.startTime)
      .reduce((acc, log) => {
        if (!acc[log.vehicleModel]) {
          acc[log.vehicleModel] = { totalDuration: 0, count: 0 };
        }
        acc[log.vehicleModel].totalDuration += (getEndTime(log) - getStartTime(log));
        acc[log.vehicleModel].count++;
        return acc;
      }, {} as Record<string, { totalDuration: number, count: number }>);
  
    return Object.entries(durationData)
      .map(([name, { totalDuration, count }]) => ({
        name,
        avgDuration: Math.round(totalDuration / count / 60000)
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }, [filteredDriveLogs]);

  const batteryDegradationData = useMemo(() => {
    return filteredDriveLogs
      .filter(log => log.purpose === 'Demo' && log.endTime && log.startTime && log.startBattery && log.endBattery && log.startBattery > log.endBattery && log.expectedDuration === batteryDegradationDurationFilter)
      .map(log => ({
        duration: Math.round((getEndTime(log) - getStartTime(log)) / 60000), // duration in minutes
        batteryConsumed: (log.startBattery ?? 0) - (log.endBattery ?? 0),
        model: log.vehicleModel,
      }));
  }, [filteredDriveLogs, batteryDegradationDurationFilter]);


  const resetFilters = () => {
    setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    setModelFilter('all');
    setCoPilotFilter([]);
    setPurposeFilter('all');
    setDurationFilter('all');
  }
  
  const hasActiveFilters = 
    modelFilter !== 'all' || 
    coPilotFilter.length > 0 || 
    purposeFilter !== 'all' ||
    durationFilter !== 'all' ||
    !isSameDay(dateRange?.from || 0, startOfDay(new Date())) ||
    !isSameDay(dateRange?.to || 0, endOfDay(new Date()));


  const dynamicChartConfig = useMemo(() => {
    const config: any = { ...chartConfig };
    uniqueFilterOptions.models.forEach(model => {
      config[model.replace(/\s+/g, '-')] = { label: model };
    });
    uniqueFilterOptions.coPilots.forEach(pilot => {
        config[pilot.replace(/\s+/g, '-')] = { label: pilot };
    });
    return config;
  }, [uniqueFilterOptions]);

  const SortDropdown = ({ sortKey, setSortKey }: { sortKey: SortKey, setSortKey: (key: SortKey) => void }) => {
    const isDurationSort = sortKey.includes('duration');
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setSortKey(isDurationSort ? 'duration_desc' : 'drives_desc')}>Highest</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortKey(isDurationSort ? 'duration_asc' : 'drives_asc')}>Lowest</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortKey('name')}>Name</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
  };
  
  const ChartResetButton = ({ onClick, isVisible }: { onClick: () => void; isVisible: boolean }) => {
    if (!isVisible) return null;
    return (
      <Button variant="ghost" size="sm" onClick={onClick} className="h-6 text-primary hover:text-primary">
        <X className="mr-1 h-3 w-3" />
        Reset
      </Button>
    );
  };

  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-400';
      default: return 'text-muted-foreground';
    }
  };

  const durationOptions = [
    { label: '40 min', value: 40 },
    { label: '24 hr', value: 1440 },
    { label: '48 hr', value: 2880 },
  ];

  return (
    <div className="space-y-8">
       <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-base text-muted-foreground">{storeName} performance insights</p>
       </div>

      {showOpsBrief && vehicles.length > 0 && (
        <div className="space-y-4">
          <MorningBrief
            vehicles={vehicles}
            driveLogs={driveLogs}
            advisors={advisors}
            storeName={storeName}
            onNavigate={onNavigateTab}
          />
          <CoachingQueue advisors={advisors} driveLogs={driveLogs} />
          <WeeklyStoreReport
            vehicles={vehicles}
            driveLogs={driveLogs}
            advisors={advisors}
            storeName={storeName}
            storeCode={storeCode}
          />
        </div>
      )}

      {/* Mobile/Tablet: Modern Sheet-based Filters */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full h-auto py-4 border-border/40 bg-card hover:bg-muted/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Filters</p>
                    <p className="text-xs text-muted-foreground">
                      {hasActiveFilters ? `${[modelFilter !== 'all' ? 1 : 0, coPilotFilter.length, purposeFilter !== 'all' ? 1 : 0, durationFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)} active` : 'Tap to refine'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-lg">Filter Analytics</SheetTitle>
                  <SheetDescription className="text-xs">Refine your data view</SheetDescription>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                    <X className="mr-1.5 h-3.5 w-3.5" /> Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Date Range
                </label>
                <DateRangePicker 
                  date={dateRange}
                  onDateChange={setDateRange}
                  disabledDays={{ after: new Date() }}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BarChartIcon className="h-4 w-4 text-primary" />
                  Vehicle Model
                </label>
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="w-full h-11 border-border/40 bg-muted/30">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {uniqueFilterOptions.models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Co-Pilots
                  {coPilotFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {coPilotFilter.length} selected
                    </Badge>
                  )}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-start border-border/40 bg-muted/30 hover:bg-muted/50">
                      {coPilotFilter.length === 0 ? (
                        <span className="text-muted-foreground">Select co-pilots</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {coPilotFilter.slice(0, 2).map(pilot => (
                            <Badge key={pilot} variant="secondary" className="text-xs">
                              {pilot}
                            </Badge>
                          ))}
                          {coPilotFilter.length > 2 && (
                            <Badge variant="secondary" className="text-xs">+{coPilotFilter.length - 2} more</Badge>
                          )}
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <p className="text-sm font-semibold">Select Co-Pilots</p>
                        {coPilotFilter.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCoPilotFilter([])} 
                            className="h-6 text-xs px-2"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {uniqueFilterOptions.coPilots.map(pilot => (
                          <div key={pilot} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`pilot-${pilot}`}
                              checked={coPilotFilter.includes(pilot)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCoPilotFilter([...coPilotFilter, pilot]);
                                } else {
                                  setCoPilotFilter(coPilotFilter.filter(p => p !== pilot));
                                }
                              }}
                            />
                            <label
                              htmlFor={`pilot-${pilot}`}
                              className="text-sm flex-1 cursor-pointer"
                            >
                              {pilot}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Drive Purpose
                </label>
                <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                  <SelectTrigger className="w-full h-11 border-border/40 bg-muted/30">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purposes</SelectItem>
                    {uniqueFilterOptions.purposes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  Duration
                </label>
                <Select value={durationFilter} onValueChange={setDurationFilter}>
                  <SelectTrigger className="w-full h-11 border-border/40 bg-muted/30">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="40">40 min</SelectItem>
                    <SelectItem value="1440">24h</SelectItem>
                    <SelectItem value="2880">48h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Traditional Card-based Filters (unchanged) */}
      <Card className="border-border/40 hidden lg:block">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <Filter className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold">Filters</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Refine your data view</p>
                    </div>
                </div>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                        <X className="mr-1.5 h-3.5 w-3.5" /> Clear All
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
             <DateRangePicker 
                date={dateRange}
                onDateChange={setDateRange}
                disabledDays={{ after: new Date() }}
            />
             <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 border-border/40 bg-muted/30"><SelectValue placeholder="Model" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {uniqueFilterOptions.models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-start border-border/40 bg-muted/30 hover:bg-muted/50 text-sm min-w-[150px]">
                  {coPilotFilter.length === 0 ? (
                    <span className="text-muted-foreground">All Co-Pilots</span>
                  ) : coPilotFilter.length === 1 ? (
                    coPilotFilter[0]
                  ) : (
                    <span>{coPilotFilter.length} Co-Pilots</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <p className="text-sm font-semibold">Co-Pilots</p>
                    {coPilotFilter.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCoPilotFilter([])} 
                        className="h-6 text-xs px-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {uniqueFilterOptions.coPilots.map(pilot => (
                      <div key={pilot} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={`desktop-pilot-${pilot}`}
                          checked={coPilotFilter.includes(pilot)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCoPilotFilter([...coPilotFilter, pilot]);
                            } else {
                              setCoPilotFilter(coPilotFilter.filter(p => p !== pilot));
                            }
                          }}
                        />
                        <label
                          htmlFor={`desktop-pilot-${pilot}`}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {pilot}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 border-border/40 bg-muted/30"><SelectValue placeholder="Purpose" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Purposes</SelectItem>
                    {uniqueFilterOptions.purposes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 border-border/40 bg-muted/30"><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="40">40 min</SelectItem>
                    <SelectItem value="1440">24h</SelectItem>
                    <SelectItem value="2880">48h</SelectItem>
                </SelectContent>
            </Select>
        </CardContent>
      </Card>

      {/* Bento Grid Layout - Asymmetric on mobile/tablet for visual interest, standard grid on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-4">
        {/* Total Drives - Hero card on mobile/tablet (full width), standard on desktop */}
        <div className="col-span-2 lg:col-span-1">
            <TrendCard 
                title="Total Demo Drives" 
                value={currentMetrics.totalDrives} 
                trend={calculateDifference(currentMetrics.totalDrives, previousMetrics.totalDrives)}
                isHigherBetter={true}
                icon={<BarChartIcon className="w-5 h-5 text-primary" />}
                isPrimary={true}
            />
        </div>
        
        {/* Avg Duration - Compact card */}
        <TrendCard 
            title="Avg. Duration" 
            value={currentMetrics.avgDriveDuration}
            unit="min"
            trend={calculateDifference(currentMetrics.avgDriveDuration, previousMetrics.avgDriveDuration)}
            formatValue={formatMinutesToHoursAndMinutes}
            isHigherBetter={false}
            icon={<Clock className="w-4 h-4 text-primary" />}
        />
        
        {/* Charging Sessions - Compact card */}
        <TrendCard 
            title="Charging" 
            value={currentMetrics.totalChargingSessions} 
            trend={calculateDifference(currentMetrics.totalChargingSessions, previousMetrics.totalChargingSessions)}
            isHigherBetter={true}
            icon={<Zap className="w-4 h-4 text-primary" />}
        />
        
        {/* Issues - Compact card */}
        <TrendCard 
            title="Issues" 
            value={currentMetrics.issuesReported} 
            trend={calculateDifference(currentMetrics.issuesReported, previousMetrics.issuesReported)}
            isHigherBetter={false}
            icon={<AlertCircle className="w-4 h-4 text-primary" />}
        />
        
        {/* Battery Usage - Compact card positioned next to Issues on mobile/tablet */}
        <TrendCard 
            title="Battery" 
            value={currentMetrics.avgBatteryUsage}
            unit="%"
            trend={calculateDifference(currentMetrics.avgBatteryUsage, previousMetrics.avgBatteryUsage)}
            isHigherBetter={false}
            icon={<BatteryCharging className="w-4 h-4 text-primary" />}
        />

        <TrendCard 
            title="Demo → Sale" 
            value={currentMetrics.purchaseConversionRate}
            unit="%"
            trend={calculateDifference(currentMetrics.purchaseConversionRate, previousMetrics.purchaseConversionRate)}
            isHigherBetter={true}
            icon={<ShoppingBag className="w-4 h-4 text-primary" />}
        />

        <TrendCard 
            title="FSD Take Rate" 
            value={fsdTakeRate}
            unit="%"
            trend={calculateDifference(fsdTakeRate, previousFsdTakeRate)}
            isHigherBetter={true}
            icon={<Sparkles className="w-4 h-4 text-primary" />}
        />
      </div>
      
        {coPilotOfThePeriod && showCopilotOfMonth && (
            <CopilotBanner 
                title={coPilotOfThePeriod.title}
                advisors={coPilotOfThePeriod.advisors}
                drives={coPilotOfThePeriod.drives}
            />
        )}

        {fsdCoachMoment && (
          <p className="text-sm text-muted-foreground rounded-xl border border-border/40 bg-muted/20 px-4 py-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Coach moment: </span>
              {fsdCoachMoment}
            </span>
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="border-border/40">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <BarChartIcon className="w-4 h-4 text-primary" />
                                Drives by Model
                            </CardTitle>
                            <CardDescription className="text-xs">Click to filter by model</CardDescription>
                        </div>
                         <div className="flex items-center gap-1">
                            <ChartResetButton onClick={() => setModelFilter('all')} isVisible={modelFilter !== 'all'} />
                            <SortDropdown sortKey={drivesByModelSort} setSortKey={setDrivesByModelSort} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
                        <BarChart accessibilityLayer data={drivesByModelData} margin={{ left: -10, right: 10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={12} />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} cursor={true} />
                            <Bar dataKey="drives" radius={8} name="Drives">
                                <LabelList dataKey="drives" position="top" offset={8} className="fill-foreground text-sm" formatter={(value: number) => value > 0 ? value : ''} />
                                {drivesByModelData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`}
                                      fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                                      onClick={() => setModelFilter(entry.name)}
                                      className={cn("cursor-pointer", modelFilter === entry.name && "stroke-primary stroke-2 ring-2 ring-primary")}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card className="border-border/40">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Drives by Co-Pilot
                            </CardTitle>
                            <CardDescription className="text-xs">Click to filter by advisor</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                            <ChartResetButton onClick={() => setCoPilotFilter([])} isVisible={coPilotFilter.length > 0} />
                            <SortDropdown sortKey={drivesByAdvisorSort} setSortKey={setDrivesByAdvisorSort} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                   <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
                        <BarChart data={drivesByAdvisorData} layout="horizontal" margin={{ left: 20, right: 30, bottom: 20 }}>
                            <CartesianGrid vertical={false} />
                             <XAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                             <YAxis dataKey="drives" type="number" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip content={<ChartTooltipContent />} cursor={true} />
                            <Bar dataKey="drives" radius={5}>
                                {drivesByAdvisorData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`}
                                      fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                                      onClick={() => {
                                        if (coPilotFilter.includes(entry.name)) {
                                          setCoPilotFilter(coPilotFilter.filter(p => p !== entry.name));
                                        } else {
                                          setCoPilotFilter([...coPilotFilter, entry.name]);
                                        }
                                      }}
                                      className={cn("cursor-pointer", coPilotFilter.includes(entry.name) && "stroke-primary stroke-2 ring-2 ring-primary")}
                                    />
                                ))}
                                <LabelList dataKey="drives" position="top" offset={8} className="fill-foreground text-xs" />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                FSD Take Rate
              </CardTitle>
              <CardDescription className="text-xs">
                Weekly Full Self-Driving (Supervised) attach rate from orders, follow-ups, and check-in keywords.
                Period rate: {fsdTakeRate}% ({filteredFsdOrders.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fsdWeeklyChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No FSD order records in this period. Add them in Management → FSD Orders, or note FSD in check-in feedback.
                </p>
              ) : (
                <ChartContainer
                  config={{
                    takeRate: { label: 'Take rate %', color: 'hsl(var(--chart-1))' },
                    subscribed: { label: 'Subscribed', color: 'hsl(var(--chart-2))' },
                  }}
                  className="h-[300px] w-full"
                >
                  <BarChart accessibilityLayer data={fsdWeeklyChartData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="takeRate" fill="var(--color-takeRate)" radius={8} name="Take rate %">
                      <LabelList dataKey="takeRate" position="top" offset={8} className="fill-foreground text-xs" formatter={(v: number) => (v > 0 ? `${v}%` : '')} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    Orders
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Completed demo drives with a customer purchase, by advisor
                  </CardDescription>
                </div>
                <SortDropdown sortKey={advisorOrdersSort} setSortKey={setAdvisorOrdersSort} />
              </div>
            </CardHeader>
            <CardContent>
              {advisorOrdersData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No orders in this period. Mark purchases at check-in or note FSD subscription in feedback.
                </p>
              ) : (
                <ChartContainer
                  config={{ orders: { label: 'Orders', color: 'hsl(var(--chart-2))' } }}
                  className="h-[300px] w-full"
                >
                  <BarChart data={advisorOrdersData} layout="vertical" margin={{ left: 20, right: 30, bottom: 20 }} barCategoryGap={15}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} interval={0} width={100} />
                    <XAxis type="number" allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="orders" fill="var(--color-orders)" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="orders" position="right" offset={8} className="fill-foreground text-xs" formatter={(value: number) => (value > 0 ? value : '')} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>


      {(userRole === 'manager' || userRole === 'moderator') && (
        <>
          {vehicles.length > 0 && (
            <RegionalLite
              storeCode={storeCode}
              storeName={storeName}
              vehicles={vehicles}
              driveLogs={driveLogs}
              advisors={advisors}
            />
          )}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 flex-wrap">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  Visual Chart Builder
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  Start with a one-click template or build a custom chart. Guided steps live in Configure Fields.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => openChartBuilder()}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-300 group"
                >
                  <BarChart3 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Open Builder
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Quick charts (beginner-friendly)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_ANALYTICS_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start text-left flex-col items-start gap-1"
                    onClick={() => openChartBuilder(preset.id)}
                  >
                    <span className="font-semibold text-sm">{preset.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">{preset.description}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                13 Chart Types
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                Drag & Drop Fields
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                Advanced Filters
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                Export Ready
              </Badge>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {showOpsBrief && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="h-9 border-border/40">
            <span className="text-sm">{showAdvanced ? 'Hide Advanced' : 'Show Advanced'}</span>
            <ChevronUp className={cn("ml-2 h-4 w-4 transition-transform duration-200", !showAdvanced && "rotate-180")} />
          </Button>
        </div>
      )}

      <ChartBuilderUI
        open={chartBuilderOpen}
        onClose={() => {
          setChartBuilderOpen(false);
          setChartBuilderInitialConfig(undefined);
        }}
        initialConfig={chartBuilderInitialConfig}
        data={filteredDriveLogs.map(log => {
          // Comprehensive History data structure with all fields
          const startTime = (log.startTime as Timestamp)?.toDate ? (log.startTime as Timestamp).toDate() : new Date(log.startTime as number | Date);
          const endTime = log.endTime ? ((log.endTime as Timestamp)?.toDate ? (log.endTime as Timestamp).toDate() : new Date(log.endTime as number | Date)) : null;
          const actualDuration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : 0;
          
          return {
            // Date & Time fields
            date: format(startTime, 'MMM dd, yyyy'),
            dateShort: format(startTime, 'MMM dd'),
            dayOfWeek: format(startTime, 'EEEE'),
            month: format(startTime, 'MMMM'),
            year: format(startTime, 'yyyy'),
            startTime: format(startTime, 'h:mm a'),
            endTime: endTime ? format(endTime, 'h:mm a') : 'N/A',
            hour: startTime.getHours(),
            
            // Advisor & Co-Pilot
            advisorIn: log.advisorIn || 'Unknown',
            coPilot: log.coPilot || 'None',
            
            // Vehicle details
            vehicleModel: log.vehicleModel || 'Unknown',
            vehicleVin: log.vehicleVin || 'N/A',
            vehicleTrim: log.vehicleTrim || 'N/A',
            
            // Battery & Performance
            startBattery: log.startBattery || 0,
            endBattery: log.endBattery || 0,
            batteryUsed: (log.startBattery || 0) - (log.endBattery || 0),
            
            // Duration metrics
            expectedDuration: log.expectedDuration || 0,
            actualDuration: actualDuration,
            durationDifference: actualDuration - (log.expectedDuration || 0),
            isOvertime: actualDuration > (log.expectedDuration || 0),
            
            // Purpose & Status
            purpose: log.purpose || 'Unknown',
            status: log.endTime ? 'Completed' : 'In Progress',
            isCompleted: !!log.endTime,
            
            // Issues & Feedback
            issueDetected: log.issueDetected || false,
            feedback: log.feedback || '',
            rating: log.rating || 0,

            // Sales & FSD
            customerPurchased: log.customerPurchased || false,
            purchaseModel: log.purchaseModel || '',
            purchaseTrim: log.purchaseTrim || '',
            fsdSubscribed: log.fsdSubscribed || false,
            
            // Metadata
            id: log.id,
          };
        })}
        onSave={(config) => {
          try {
            const key = `ddhub-chart-builder:${storeName}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
            const next = [...existing, { ...config, savedAt: Date.now() }].slice(-20);
            localStorage.setItem(key, JSON.stringify(next));
            toast({ title: 'Chart saved', description: 'Saved to this browser for quick reopen.' });
          } catch {
            toast({ title: 'Chart noted', description: 'Could not persist locally; config was still applied.' });
          }
          setChartBuilderOpen(false);
        }}
      />

      <div 
        ref={advancedSectionRef}
        className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          showAdvanced ? "max-h-[10000px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
        )}
      >
        <div className="pb-6">
          {renderAdvanced && (
            <Suspense fallback={<div>Loading advanced analytics...</div>}>
              <AdvancedAnalyticsSection 
                  driveLogs={filteredDriveLogs}
                  advisors={advisors}
                  drivesByDayData={drivesByDayData}
                  peakHoursData={peakHoursData}
                  coPilotPerformanceData={coPilotPerformanceData}
                  purchaseChartData={purchaseChartData}
                  storePurchaseConversionRate={getStorePurchaseConversionRate(filteredDriveLogs)}
                  drivesByTrimData={drivesByTrimData}
                  coPilotDurationData={coPilotDurationData}
                  batteryLeaderboard={batteryLeaderboard}
                  advisorLeaderboard={advisorLeaderboard}
                  batteryPerformanceData={batteryPerformanceData}
                  punctualityStats={punctualityStats}
                  durationByModel={durationByModel}
                  coPilotPerformanceSort={coPilotPerformanceSort}
                  setCoPilotPerformanceSort={setCoPilotPerformanceSort}
                  coPilotFilter={coPilotFilter}
                  setCoPilotFilter={setCoPilotFilter}
                  trimModelFilter={trimModelFilter}
                  setTrimModelFilter={setTrimModelFilter}
                  uniqueFilterOptions={uniqueFilterOptions}
                  drivesByTrimSort={drivesByTrimSort}
                  setDrivesByTrimSort={setDrivesByTrimSort}
                  durationBreakdownFilter={durationBreakdownFilter}
                  setDurationBreakdownFilter={setDurationBreakdownFilter}
                  durationOptions={durationOptions}
                  coPilotDurationSort={coPilotDurationSort}
                  setCoPilotDurationSort={setCoPilotDurationSort}
                  drivesByDurationData={drivesByDurationData}
                  getTrophyColor={getTrophyColor}
                  dynamicChartConfig={dynamicChartConfig}
                  batteryDegradationData={batteryDegradationData}
                  batteryDegradationDurationFilter={batteryDegradationDurationFilter}
                  setBatteryDegradationDurationFilter={setBatteryDegradationDurationFilter}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
