

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarChartIcon, Users, Clock, TrendingUp, UserCheck, Zap, Eye, EyeOff, Filter, X, BatteryCharging, UserRoundCheck, Hourglass, Star, Trophy, CheckCircle, TrendingDown, Minus, FileText, Timer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, LabelList, ScatterChart, Scatter, Label } from 'recharts';
import { ArrowUpDown } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DriveLog, Advisor, UserRole, VehicleModel } from '@/lib/types';


type SortKey = 'name' | 'drives_desc' | 'drives_asc' | 'duration_desc' | 'duration_asc';

const MODEL_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#dd7788', '#77dd88', '#8877dd'];
const DAY_COLORS = ['#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];

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

interface AdvancedAnalyticsSectionProps {
    driveLogs: DriveLog[];
    advisors: Advisor[];
    drivesByDayData: any[];
    peakHoursData: any[];
    coPilotPerformanceData: any[];
    drivesByTrimData: any[];
    coPilotDurationData: any[];
    batteryLeaderboard: any[];
    advisorLeaderboard: any[];
    batteryPerformanceData: any[];
    punctualityStats: { onTimeRate: number; avgVariance: number };
    durationByModel: any[];
    coPilotPerformanceSort: SortKey;
    setCoPilotPerformanceSort: (key: SortKey) => void;
    coPilotFilter: string[];
    setCoPilotFilter: (filter: string[]) => void;
    trimModelFilter: string;
    setTrimModelFilter: (filter: string) => void;
    uniqueFilterOptions: { models: string[] };
    drivesByTrimSort: SortKey;
    setDrivesByTrimSort: (key: SortKey) => void;
    durationBreakdownFilter: number;
    setDurationBreakdownFilter: (value: number) => void;
    durationOptions: { label: string; value: number }[];
    coPilotDurationSort: SortKey;
    setCoPilotDurationSort: (key: SortKey) => void;
    drivesByDurationData: any[];
    getTrophyColor: (rank: number) => string;
    dynamicChartConfig: any;
    batteryDegradationData: any[];
    batteryDegradationDurationFilter: number;
    setBatteryDegradationDurationFilter: (value: number) => void;
}

export default function AdvancedAnalyticsSection({
    driveLogs,
    advisors,
    drivesByDayData,
    peakHoursData,
    coPilotPerformanceData,
    drivesByTrimData,
    coPilotDurationData,
    batteryLeaderboard,
    advisorLeaderboard,
    batteryPerformanceData,
    punctualityStats,
    durationByModel,
    coPilotPerformanceSort,
    setCoPilotPerformanceSort,
    coPilotFilter,
    setCoPilotFilter,
    trimModelFilter,
    setTrimModelFilter,
    uniqueFilterOptions,
    drivesByTrimSort,
    setDrivesByTrimSort,
    durationBreakdownFilter,
    setDurationBreakdownFilter,
    durationOptions,
    coPilotDurationSort,
    setCoPilotDurationSort,
    drivesByDurationData,
    getTrophyColor,
    dynamicChartConfig,
    batteryDegradationData,
    batteryDegradationDurationFilter,
    setBatteryDegradationDurationFilter,
}: AdvancedAnalyticsSectionProps) {
  return (
    <div className="space-y-8 mt-8 animate-collapsible-down">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/40">
                <CardHeader>
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />Drives per Day
                        </CardTitle>
                        <CardDescription className="text-xs">Performance metrics throughout the week</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart accessibilityLayer data={drivesByDayData} margin={{ left: -10, right: 10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <Tooltip content={<ChartTooltipContent />} cursor={false} />
                            <Bar dataKey="drives" radius={8}>
                                <LabelList dataKey="drives" position="top" offset={8} className="fill-foreground text-sm" formatter={(value: number) => value > 0 ? value : ''} />
                                {drivesByDayData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={DAY_COLORS[index % DAY_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card className="border-border/40">
                <CardHeader>
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />Peak Hours
                        </CardTitle>
                        <CardDescription className="text-xs">Activity throughout the day</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={peakHoursData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Line type="monotone" dataKey="drives" stroke="var(--color-peakHours)" name="Drives" />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
            <Card className="border-border/40">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-primary" />Co-Pilot Performance
                        </CardTitle>
                        <CardDescription className="text-xs">Metrics by advisor • Auto check-ins shown in orange</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <ChartResetButton onClick={() => setCoPilotFilter([])} isVisible={coPilotFilter.length > 0} />
                        <SortDropdown sortKey={coPilotPerformanceSort} setSortKey={setCoPilotPerformanceSort} />
                    </div>
                </div>
            </CardHeader>
                <CardContent className="space-y-4">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={coPilotPerformanceData} layout="vertical" margin={{ left: 20, right: 30, bottom: 20 }} barCategoryGap={15}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={0} width={100} />
                        <XAxis type="number" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 0, 0, 4]} />
                        <Bar dataKey="inProgress" stackId="a" fill="var(--color-inProgress)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ChartContainer>
                
                {/* Auto Check-In Warning Table */}
                {coPilotPerformanceData.some(item => item.autoCheckedIn > 0) && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-destructive/10">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-destructive mb-1">Auto Check-In Alerts</h4>
                                <p className="text-xs text-muted-foreground">Vehicles were automatically checked in after being overdue by 30+ minutes</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {coPilotPerformanceData
                                .filter(item => item.autoCheckedIn > 0)
                                .map(item => (
                                    <div 
                                        key={item.name}
                                        className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/40 hover:border-destructive/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                                                <Users className="h-4 w-4 text-destructive" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.completed} total completed drives
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-destructive">{item.autoCheckedIn}</p>
                                                <p className="text-xs text-muted-foreground">auto check-in{item.autoCheckedIn !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-destructive/10">
                                                <Timer className="h-4 w-4 text-destructive" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
            <Card className="border-border/40">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />Drives by Trim
                        </CardTitle>
                        <CardDescription className="text-xs">Popularity of vehicle trims</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                            <Select value={trimModelFilter} onValueChange={setTrimModelFilter}>
                            <SelectTrigger className="w-[130px] h-8 text-xs border-border/40 bg-muted/30">
                                <SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Models</SelectItem>
                                {uniqueFilterOptions.models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <SortDropdown sortKey={drivesByTrimSort} setSortKey={setDrivesByTrimSort} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
                    <BarChart accessibilityLayer data={drivesByTrimData} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={12} />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} cursor={true} />
                        <Bar dataKey="drives" radius={8} name="Drives">
                            <LabelList dataKey="drives" position="top" offset={8} className="fill-foreground text-sm" formatter={(value: number) => value > 0 ? value : ''} />
                            {drivesByTrimData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
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
                            <Hourglass className="w-4 h-4 text-primary" />Avg. Drive Duration by Co-Pilot
                        </CardTitle>
                        <CardDescription className="text-xs">Average actual duration by expected duration</CardDescription>
                    </div>
                        <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/30 p-0.5">
                            {durationOptions.map(opt => (
                                <Button 
                                    key={opt.value}
                                    variant={durationBreakdownFilter === opt.value ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setDurationBreakdownFilter(opt.value)}
                                    className="rounded-full h-6 px-2.5 text-xs"
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                        <SortDropdown sortKey={coPilotDurationSort} setSortKey={setCoPilotDurationSort} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={dynamicChartConfig} className="h-[350px] w-full">
                    <BarChart data={coPilotDurationData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" width={100} interval={0} tick={{fontSize: 10}} />
                        <XAxis dataKey="avgDuration" type="number" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="avgDuration" name="Avg. Duration (min)" radius={8}>
                            <LabelList dataKey="avgDuration" position="right" offset={8} className="fill-foreground text-xs" formatter={(value: number) => `${value}m`} />
                            {coPilotDurationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
            <Card className="border-border/40">
            <CardHeader>
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Timer className="w-4 h-4 text-primary" />Drives by Expected Duration
                    </CardTitle>
                    <CardDescription className="text-xs">Breakdown by scheduled duration</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={drivesByDurationData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} cursor={false} />
                    <Bar dataKey="drives" radius={8}>
                    <LabelList dataKey="drives" position="top" offset={8} className="fill-foreground text-sm" formatter={(value: number) => value > 0 ? value : ''} />
                    {drivesByDurationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                    ))}
                    </Bar>
                </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card className="border-border/40">
            <CardHeader>
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Advanced Performance Analytics</CardTitle>
                    <CardDescription className="text-xs">Deeper insights into efficiency and punctuality</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Drive Efficiency & Punctuality</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 bg-muted/30 rounded-xl border border-border/40">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On-Time Rate</span>
                                <span className="text-2xl font-bold">{punctualityStats.onTimeRate}%</span>
                            </div>
                            <Progress value={punctualityStats.onTimeRate} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-2">Drives ended within expected duration</p>
                        </div>
                        <div className="p-5 bg-muted/30 rounded-xl border border-border/40">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Avg. Time Variance</span>
                            <p className={cn("text-3xl font-bold", punctualityStats.avgVariance > 0 ? "text-red-500" : "text-green-500")}>
                                {punctualityStats.avgVariance > 0 ? '+' : ''}{punctualityStats.avgVariance}
                                <span className="text-sm text-muted-foreground ml-1 font-normal">min</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Average deviation from scheduled time</p>
                        </div>
                    </div>
                </div>
                    <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Drive Duration Optimization</h3>
                    <div className="border border-border/40 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Model</TableHead>
                                    <TableHead className="text-right">Average Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {durationByModel.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{item.avgDuration} mins</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card className="border-border/40">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">Battery Degradation Analysis</CardTitle>
                        <CardDescription className="text-xs">Drive duration vs battery consumption</CardDescription>
                    </div>
                    <div className="flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/30 p-0.5">
                        {durationOptions.map(opt => (
                            <Button 
                                key={opt.value}
                                variant={batteryDegradationDurationFilter === opt.value ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setBatteryDegradationDurationFilter(opt.value)}
                                className="rounded-full h-6 px-2.5 text-xs"
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={dynamicChartConfig} className="h-[350px] w-full">
                    <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <CartesianGrid />
                        <XAxis type="number" dataKey="duration" name="Duration" unit="m">
                            <Label value="Drive Duration (min)" offset={0} position="insideBottom" />
                        </XAxis>
                        <YAxis type="number" dataKey="batteryConsumed" name="Battery Used" unit="%">
                            <Label value="Battery Consumed (%)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent hideIndicator />} />
                        <Legend />
                        {uniqueFilterOptions.models.map((model, index) => (
                            <Scatter 
                                key={model} 
                                name={model}
                                data={batteryDegradationData.filter(d => d.model === model)} 
                                fill={MODEL_COLORS[index % MODEL_COLORS.length]} 
                            />
                        ))}
                    </ScatterChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/40">
            <CardHeader>
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />Advisor Leaderboard
                    </CardTitle>
                    <CardDescription className="text-xs">Top co-pilots by completed drives</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Completed Drives</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {advisorLeaderboard.slice(0, 5).map((item, index) => (
                    <TableRow key={item.name}>
                        <TableCell className="flex items-center gap-2">
                        {item.rank}
                        {item.rank <= 3 && <Trophy className={cn("h-4 w-4", getTrophyColor(item.rank))} />}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.drives}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
            <Card className="border-border/40">
            <CardHeader>
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BatteryCharging className="w-4 h-4 text-primary" />Battery Leaderboard
                    </CardTitle>
                    <CardDescription className="text-xs">Top advisors by charging sessions</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Charging Sessions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {batteryLeaderboard.slice(0, 5).map((item, index) => (
                    <TableRow key={item.name}>
                        <TableCell className="flex items-center gap-2">
                            {item.rank}
                            {item.rank <= 3 && <Trophy className={cn("h-4 w-4", getTrophyColor(item.rank))} />}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.sessions}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
