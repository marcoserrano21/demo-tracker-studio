'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Advisor, DriveLog, Vehicle, ManualAward, SentimentLabel, Goal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { achievements, Achievement, AchievementCategory, getDriveDate } from '@/lib/achievements';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from 'next/image';
import { getVehicleImage } from '@/lib/data';
import { DDHUB_KEYS } from '@/lib/auth/session-keys';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { AchievementIcon } from './achievement-icon';
import { subDays, format, startOfWeek, endOfWeek, isWithinInterval, isToday, startOfToday, endOfToday } from 'date-fns';
import { Button } from './ui/button';
import { Camera, ChevronLeft, ChevronRight, Trophy, Car, Star, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, Meh, Target, CheckCircle, Clock, ArrowUpDown, MessageSquare, Coffee, Eye, Unlock, ShoppingBag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Timestamp, doc, collection, query, where } from 'firebase/firestore';
import { AvatarSelectorDialog } from './avatar-selector-dialog';
import { useFirebase, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { AchievementProgressToast } from './achievement-progress-toast';
import { celebrateAchievement } from '@/lib/confetti';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { LevelProgressBar } from './level-progress-bar';
import { calculateHistoricalXP, getLevelFromXP } from '@/lib/xp-system';
import { buildLeaderboardMetrics, compareLeaderboardEntries, withDenseRanks } from '@/lib/leaderboard-rank';
import { getAdvisorConversionRate } from '@/lib/purchase-analytics';
import { useXPSystem } from '@/hooks/use-xp-system';
import { LevelUpModal } from './xp-toast';


interface MyHubProps {
  advisor: Advisor;
  driveLogs: DriveLog[];
  vehicles: Vehicle[];
  advisors: Advisor[];
  storeCode: string;
  manualAwards: ManualAward[];
}


const ACHIEVEMENTS_PER_PAGE_MOBILE = 16;
const ACHIEVEMENTS_PER_PAGE_TABLET = 16;
const ACHIEVEMENTS_PER_PAGE_DESKTOP = 15; // 5 rows x 3 columns

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
    positive: 'hsl(var(--chart-2))',
    negative: 'hsl(var(--chart-5))',
    neutral: 'hsl(var(--muted))',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {payload[0].name}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].value}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function MyHub({ advisor, driveLogs, vehicles, advisors, storeCode, manualAwards }: MyHubProps) {
  const [isAvatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [isFeedbackSheetOpen, setFeedbackSheetOpen] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | SentimentLabel>('all');
  const { firestore, user } = useFirebase();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'rarity' | 'alphabetical'>('date');
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const achievementShowcaseRef = useRef<HTMLDivElement>(null);
  const migrationAttemptedRef = useRef<Set<string>>(new Set());
  
  // XP System integration
  const { showLevelUpModal, levelUpData, setShowLevelUpModal } = useXPSystem(storeCode, advisor.id);
  
  // Migrate existing users' XP on first load (only once per advisor) - CLIENT-SIDE
  useEffect(() => {
    if (!firestore) return;
    
    const advisorKey = `${storeCode}-${advisor.id}`;
    
    // Skip if already attempted migration for this advisor
    if (migrationAttemptedRef.current.has(advisorKey)) {
      return;
    }
    
    const migrateXP = async () => {
      // If advisor doesn't have XP field, calculate from history
      if (advisor.xp === undefined || advisor.xp === null) {
        migrationAttemptedRef.current.add(advisorKey);
        const completedDrives = driveLogs.filter(log => log.coPilot === advisor.name && log.endTime);
        const historicalXP = calculateHistoricalXP(completedDrives);
        if (historicalXP > 0) {
          const level = getLevelFromXP(historicalXP);
          // Use client-side non-blocking update instead of server action
          const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisor.id}`);
          updateDocumentNonBlocking(advisorRef, {
            xp: historicalXP,
            level: level,
          });
        }
      }
    };
    
    migrateXP();
  }, [advisor.id, advisor.xp, storeCode, driveLogs, advisor.name, firestore]);

  // Detect screen size for achievement pagination
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setScreenSize('desktop');
      } else if (width >= 768) {
        setScreenSize('tablet');
      } else {
        setScreenSize('mobile');
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const advisorLogsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, `stores/${storeCode}/demo_drives`),
        where('coPilot', '==', advisor.name)
    );
  }, [firestore, user, storeCode, advisor.name]);
  
  const { data: allAdvisorLogs } = useCollection<DriveLog>(advisorLogsQuery);

  const allActiveGoalsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !storeCode) return null;
    return query(
        collection(firestore, `stores/${storeCode}/goals`),
        where('endDate', '>=', Timestamp.now())
    )
  }, [firestore, user, storeCode]);

  const { data: allActiveGoals } = useCollection<Goal>(allActiveGoalsQuery);

  const goals = useMemo(() => {
    if (!allActiveGoals) return [];
    return allActiveGoals.filter(goal => 
      (goal.targetType === 'store') || 
      (goal.targetType === 'advisor' && goal.targetIds && goal.targetIds.includes(advisor.id))
    );
  }, [allActiveGoals, advisor.id]);


  const recentAdvisorLogs = useMemo(() => {
    if (!allAdvisorLogs) return [];
    const thirtyDaysAgo = subDays(new Date(), 30);
    return allAdvisorLogs.filter(log => {
      const logDate = getDriveDate(log);
      return logDate >= thirtyDaysAgo;
    });
  }, [allAdvisorLogs]);


  const advisorLogs = useMemo(() => {
    return driveLogs.filter(log => log.coPilot === advisor.name);
  }, [driveLogs, advisor]);

  const completedDrives = useMemo(() => {
    return advisorLogs.filter(log => log.endTime).sort((a,b) => getDriveDate(b).getTime() - getDriveDate(a).getTime());
  }, [advisorLogs]);

  const drivesThisMonth = useMemo(() => {
    if (!recentAdvisorLogs) return 0;
    return recentAdvisorLogs.filter(log => log.endTime).length;
  }, [recentAdvisorLogs]);

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = startOfWeek(now);
    const endOfThisWeek = endOfWeek(now);
    const startOfLastWeek = startOfWeek(subDays(now, 7));
    const endOfLastWeek = endOfWeek(subDays(now, 7));

    const drivesThisWeek = completedDrives.filter(log => {
        const driveDate = getDriveDate(log);
        return isWithinInterval(driveDate, { start: startOfThisWeek, end: endOfThisWeek });
    }).length;

    const drivesLastWeek = completedDrives.filter(log => {
        const driveDate = getDriveDate(log);
        return isWithinInterval(driveDate, { start: startOfLastWeek, end: endOfLastWeek });
    }).length;

    return drivesThisWeek - drivesLastWeek;
  }, [completedDrives]);

  const personalBests = useMemo(() => {
    if (completedDrives.length === 0) return null;
    
    // Longest drive duration
    const longestDrive = completedDrives.reduce((max, log) => {
      const duration = log.expectedDuration || 0;
      return duration > (max.duration || 0) ? { duration, model: log.vehicleModel, date: getDriveDate(log) } : max;
    }, { duration: 0, model: '', date: new Date() });

    // Shortest drive duration (excluding 0)
    const shortestDrive = completedDrives.reduce((min, log) => {
      const duration = log.expectedDuration || 0;
      if (duration === 0) return min;
      if (min.duration === 0) return { duration, model: log.vehicleModel, date: getDriveDate(log) };
      return duration < min.duration ? { duration, model: log.vehicleModel, date: getDriveDate(log) } : min;
    }, { duration: 0, model: '', date: new Date() });

    // Most drives in a single day
    const drivesByDay = completedDrives.reduce((acc, log) => {
      const dateKey = format(getDriveDate(log), 'yyyy-MM-dd');
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostDrivesDay = Object.entries(drivesByDay).reduce((max, [date, count]) => 
      count > max.count ? { date, count } : max
    , { date: '', count: 0 });

    // Current streak
    const sortedDates = Array.from(new Set(completedDrives.map(log => format(getDriveDate(log), 'yyyy-MM-dd')))).sort();
    let currentStreak = 0;
    let today = format(new Date(), 'yyyy-MM-dd');
    let checkDate = new Date();
    
    while (sortedDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }

    // Best rating
    const bestRating = completedDrives.reduce((max, log) => 
      (log.rating || 0) > max ? (log.rating || 0) : max
    , 0);

    // Most popular model
    const modelCounts = completedDrives.reduce((acc, log) => {
      acc[log.vehicleModel] = (acc[log.vehicleModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostPopularModel = Object.entries(modelCounts).reduce((max, [model, count]) => 
      count > max.count ? { model, count } : max
    , { model: '', count: 0 });

    return {
      longestDrive,
      shortestDrive,
      mostDrivesDay,
      currentStreak,
      bestRating,
      mostPopularModel
    };
  }, [completedDrives]);

  const unlockedAchievements = useMemo(() => {
    const getUnlockDate = (ach: Achievement): Date | null => {
        const completedDrivesSorted = advisorLogs.filter(log => log.endTime).sort((a,b) => getDriveDate(a).getTime() - getDriveDate(b).getTime());
        if (ach.id.includes('drive')) {
            const countMatch = ach.id.match(/(\d+)/);
            if(countMatch) {
                const driveCount = parseInt(countMatch[0], 10);
                if (completedDrivesSorted.length >= driveCount) {
                    return getDriveDate(completedDrivesSorted[driveCount - 1]);
                }
            }
        }
        const satisfyingLog = completedDrivesSorted.find(log => ach.checker(advisor, [log], allAdvisorLogs || [], vehicles));
        if (satisfyingLog) return getDriveDate(satisfyingLog);

        return new Date();
    }

    const autoAchievements = achievements
        .filter(ach => ach.checker(advisor, advisorLogs, allAdvisorLogs || [], vehicles))
        .map(ach => ({...ach, unlockedAt: getUnlockDate(ach) || new Date()}));

    const manualAch = manualAwards
      ?.filter(ma => ma.advisorId === advisor.id)
      .map(ma => {
        const ach = achievements.find(a => a.id === ma.achievementId);
        if (!ach) return null;
        return {...ach, unlockedAt: ma.awardedAt instanceof Timestamp ? ma.awardedAt.toDate() : new Date(ma.awardedAt) }
      })
      .filter((a): a is Achievement & { unlockedAt: Date } => !!a) || [];

    const allAchievements = [...new Map([...autoAchievements, ...manualAch].map(item => [item.id, item])).values()];
    
    // Rarity order (most rare to least rare)
    const categoryRarity: Record<AchievementCategory, number> = {
      'Elite & Secret': 1,
      'Performance & Excellence': 2,
      'Operational Excellence': 3,
      'Tenacity & Hustle': 4,
      'Knowledge & Evangelism': 5,
      'Mastery & Milestones': 6,
      'Quirky & Fun': 7,
    };
    
    // Apply sorting based on sortBy state
    if (sortBy === 'date') {
      // Sort by date ascending (oldest first) - First Drive Conductor should appear first
      return allAchievements.sort((a,b) => a.unlockedAt.getTime() - b.unlockedAt.getTime());
    } else if (sortBy === 'rarity') {
      return allAchievements.sort((a, b) => {
        const rarityDiff = categoryRarity[a.category] - categoryRarity[b.category];
        if (rarityDiff !== 0) return rarityDiff;
        // Secondary sort by date if same rarity
        return b.unlockedAt.getTime() - a.unlockedAt.getTime();
      });
    } else { // alphabetical
      return allAchievements.sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [advisor, advisorLogs, allAdvisorLogs, vehicles, manualAwards, sortBy]);

  // Trigger confetti celebration when new achievements are unlocked (once per achievement)
  // Only triggers for the current logged-in advisor, not for any other user
  useEffect(() => {
    // Ensure we only celebrate achievements for this specific advisor
    if (!advisor || !advisor.id) return;
    
    const storageKey = DDHUB_KEYS.celebratedAchievements(advisor.id);
    const celebratedIds = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    
    // Find achievements that haven't been celebrated yet for THIS advisor
    const newAchievements = unlockedAchievements.filter(
      achievement => !celebratedIds.includes(achievement.id)
    );
    
    // Only trigger confetti if there are actually new achievements for THIS user
    if (newAchievements.length > 0) {
      // Trigger confetti for each new achievement (staggered)
      newAchievements.forEach((achievement, index) => {
        setTimeout(() => {
          celebrateAchievement();
        }, index * 350);
      });
      
      // Mark these achievements as celebrated for this specific advisor
      const updatedCelebrated = [...celebratedIds, ...newAchievements.map(a => a.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedCelebrated));
    }
  }, [unlockedAchievements, advisor.id]);
  
  const sentimentData = useMemo(() => {
    const feedbackWithSentiment = recentAdvisorLogs.filter(log => log.feedback && log.sentimentLabel);
    const drivesWithRating = recentAdvisorLogs.filter(log => typeof log.rating === 'number');
    
    const sentimentCounts = feedbackWithSentiment.reduce((acc, log) => {
        if (log.sentimentLabel) {
            acc[log.sentimentLabel] = (acc[log.sentimentLabel] || 0) + 1;
        }
        return acc;
    }, {} as Record<SentimentLabel, number>);

    const total = feedbackWithSentiment.length;
    const totalRating = drivesWithRating.reduce((acc, log) => acc + (log.rating || 0), 0);
    const averageRating = drivesWithRating.length > 0 ? parseFloat((totalRating / drivesWithRating.length).toFixed(1)) : 0;

    return {
        positive: sentimentCounts.positive || 0,
        negative: sentimentCounts.negative || 0,
        neutral: sentimentCounts.neutral || 0,
        total: total,
        averageRating: averageRating,
    };
}, [recentAdvisorLogs]);

  const userStats = useMemo(() => {
    const scores: Record<string, ReturnType<typeof buildLeaderboardMetrics> & { advisor: Advisor; achievementCount: number }> = {};
    advisors.forEach(adv => {
        const advLogs = driveLogs.filter(log => log.coPilot === adv.name);
        const auto = achievements.filter(ach => ach.checker(adv, advLogs, allAdvisorLogs || [], vehicles)).length;
        const manual = manualAwards?.filter(ma => ma.advisorId === adv.id).length || 0;
        scores[adv.id] = {
          advisor: adv,
          achievementCount: auto + manual,
          ...buildLeaderboardMetrics(adv, advLogs),
        };
    });

    const ranked = withDenseRanks(Object.values(scores).sort(compareLeaderboardEntries));
    const leaderboardRank = ranked.find((entry) => entry.advisor.id === advisor.id)?.rank ?? ranked.length + 1;

    return {
        totalDrives: completedDrives.length,
        purchaseConversions: completedDrives.filter(log => log.customerPurchased).length,
        conversionRate: getAdvisorConversionRate(driveLogs, advisor.name),
        achievementsUnlocked: unlockedAchievements.length,
        leaderboardRank,
    };
}, [advisor, advisors, driveLogs, allAdvisorLogs, vehicles, manualAwards, completedDrives, unlockedAchievements]);

  const paginatedAchievements = useMemo(() => {
    const itemsPerPage = screenSize === 'desktop' ? ACHIEVEMENTS_PER_PAGE_DESKTOP : screenSize === 'tablet' ? ACHIEVEMENTS_PER_PAGE_TABLET : ACHIEVEMENTS_PER_PAGE_MOBILE;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return unlockedAchievements.slice(startIndex, startIndex + itemsPerPage);
  }, [unlockedAchievements, currentPage, screenSize]);

  const totalPages = Math.ceil(unlockedAchievements.length / (screenSize === 'desktop' ? ACHIEVEMENTS_PER_PAGE_DESKTOP : screenSize === 'tablet' ? ACHIEVEMENTS_PER_PAGE_TABLET : ACHIEVEMENTS_PER_PAGE_MOBILE));
  
  // Reset to page 1 when sort changes or layout changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, screenSize]);


  const recentVehicles = useMemo(() => {
    const interactionMap = new Map<string, Date>();
    advisorLogs.forEach(log => {
        const date = getDriveDate(log);
        if(!interactionMap.has(log.vehicleVin) || date > interactionMap.get(log.vehicleVin)!) {
            interactionMap.set(log.vehicleVin, date);
        }
    });
    return Array.from(interactionMap.entries())
        .sort((a, b) => b[1].getTime() - a[1].getTime())
        .slice(0, 8)
        .map(([vin, lastUsed]) => {
            const vehicle = vehicles.find(v => v.vin === vin);
            return vehicle ? { ...vehicle, lastUsed } : null;
        })
        .filter((v): v is Vehicle & { lastUsed: Date } => !!v);
  }, [advisorLogs, vehicles]);

  const nextAchievements = useMemo(() => {
    const locked = achievements.filter(ach => !unlockedAchievements.some(unlocked => unlocked.id === ach.id) && !ach.isSecret);
    const progress: { achievement: typeof achievements[0], progress: number, text: string }[] = [];
    
    locked.forEach(ach => {
        if(ach.id === 'novice-advisor') {
            const p = Math.round((completedDrives.length / 10) * 100);
            progress.push({ achievement: ach, progress: p, text: `${10-completedDrives.length} drives to go` });
        }
        if(ach.id === 'trusted-guide' && completedDrives.length > 5) {
             const p = Math.round((completedDrives.length / 30) * 100);
            progress.push({ achievement: ach, progress: p, text: `${30-completedDrives.length} drives to go` });
        }
    });
    
    return progress.sort((a,b) => b.progress - a.progress).slice(0, 3);
  }, [unlockedAchievements, completedDrives]);

  const upNextDrive = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const scheduledDrives = (driveLogs || [])
      .filter(log => {
        if (log.purpose !== 'Scheduled' || log.coPilot !== advisor.name) return false;
        const startTime = getDriveDate(log);
        return startTime > now && isWithinInterval(startTime, { start: startOfToday, end: endOfToday });
      })
      .sort((a, b) => getDriveDate(a).getTime() - getDriveDate(b).getTime());

    if (scheduledDrives.length === 0) return null;

    const nextDrive = scheduledDrives[0];
    const vehicle = vehicles.find(v => v.id === nextDrive.vehicleId);

    if (!vehicle) return null;
    
    return {
      ...nextDrive,
      vehicle: vehicle
    };
  }, [driveLogs, advisor.name, vehicles]);

  const handleAvatarSelect = (url: string) => {
    if (firestore) {
      const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisor.id}`);
      updateDocumentNonBlocking(advisorRef, { avatarUrl: url });
    }
    setAvatarDialogOpen(false);
  };

  const TrendIndicator = () => {
    const Icon = weeklyTrend > 0 ? TrendingUp : weeklyTrend < 0 ? TrendingDown : Minus;
    const color = weeklyTrend > 0 ? 'text-green-500' : weeklyTrend < 0 ? 'text-red-500' : 'text-muted-foreground';
    const trendText = weeklyTrend > 0 ? `+${weeklyTrend}` : weeklyTrend;

    return (
        <div className={`flex items-center text-xs sm:text-sm ${color} mt-1 sm:mt-2`}>
            <Icon className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            <span>
                <strong>{trendText} drives</strong> this week vs last week
            </span>
        </div>
    );
  };
  
  const sentimentChartData = useMemo(() => {
    if (sentimentData.total === 0) return [];
    return [
      { name: 'Positive', value: Math.round((sentimentData.positive / sentimentData.total) * 100) },
      { name: 'Negative', value: Math.round((sentimentData.negative / sentimentData.total) * 100) },
      { name: 'Neutral', value: Math.round((sentimentData.neutral / sentimentData.total) * 100) },
    ].filter(item => item.value > 0);
  }, [sentimentData]);
  
  const calculateGoalProgress = (goal: Goal) => {
    if (!driveLogs) return { current: 0, percentage: 0 };
    
    const relevantLogs = driveLogs.filter(log => {
      const logDate = getDriveDate(log);
      return logDate >= goal.startDate.toDate() && logDate <= goal.endDate.toDate();
    });
    
    const targetLogs = goal.targetType === 'store' 
      ? relevantLogs 
      : relevantLogs.filter(l => goal.targetIds.includes(advisor.id));
    
    let current = 0;
    
    if (goal.metric === 'drives') {
        current = targetLogs.filter(l => l.purpose === 'Demo' && l.endTime).length;
    } else if (goal.metric === 'positive_feedback') {
        current = targetLogs.filter(l => l.sentimentLabel === 'positive').length;
    } else if (goal.metric === 'charging_sessions') {
        current = targetLogs.filter(l => l.purpose === 'Charging').length;
    }
    
    return { current, percentage: (current / goal.targetValue) * 100 };
  };

  const getGoalTitle = (goal: Goal) => {
    if(goal.targetType === 'store') {
        return `Store Goal`;
    }
    return `Your Goal`;
  };

  const getGoalDescription = (goal: Goal) => {
      const metricText = goal.metric === 'positive_feedback' ? 'positive feedbacks' : goal.metric.replace('_', ' ');
      return `Get ${goal.targetValue} ${metricText}`;
  };

  const scrollToAchievements = () => {
    achievementShowcaseRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <>
      <AchievementProgressToast 
        nextAchievements={nextAchievements} 
        onNavigate={scrollToAchievements}
      />
      
      <div className="space-y-4 lg:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 sm:h-20 sm:w-20 lg:h-24 lg:w-24 cursor-pointer" onClick={() => setAvatarDialogOpen(true)}>
              <AvatarImage src={advisor.avatarUrl ?? undefined} alt={advisor.name} />
              <AvatarFallback className="text-2xl sm:text-3xl lg:text-4xl bg-primary text-primary-foreground">{advisor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setAvatarDialogOpen(true)}>
              <Camera className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {advisor.name.split(' ')[0]}!</h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              You've completed {drivesThisMonth} drives in the last 30 days.
            </p>
            <TrendIndicator />
          </div>
        </div>
        
        {/* Level Progress Bar - XP System */}
        <div>
          <LevelProgressBar 
            totalXP={advisor.xp || calculateHistoricalXP(driveLogs.filter(log => log.coPilot === advisor.name && log.endTime))} 
            showDetails={true}
          />
        </div>
        
        {/* Key Metrics Grid - Best Rating & Schedule */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6">
            {/* Best Rating */}
            {personalBests && personalBests.bestRating > 0 && (
              <div className="group relative overflow-hidden">
                <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-yellow-500/8 via-amber-400/4 to-transparent rounded-xl sm:rounded-2xl border border-yellow-500/20 transition-all duration-300 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/10">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold">{personalBests.bestRating} ⭐</div>
                      <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Best Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Schedule - Enhanced visual hierarchy */}
            <div className="group relative overflow-hidden">
                <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-500/8 via-cyan-400/4 to-transparent rounded-xl sm:rounded-2xl border border-blue-500/20 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        {upNextDrive ? (
                            <>
                                <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                </div>
                                <div className="text-right">
                                    <div className="text-xl sm:text-2xl font-bold">{format(getDriveDate(upNextDrive), 'h:mm a')}</div>
                                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Up Next</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                                </div>
                                <div className="text-right">
                                    <div className="text-xl sm:text-2xl font-bold">All Clear</div>
                                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Schedule</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Personal Bests */}
        {personalBests && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Personal Records
              </CardTitle>
              <CardDescription className="text-xs">Your best performances</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Total Drives - Moved from top section */}
                <div className="group relative overflow-hidden">
                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent rounded-lg sm:rounded-xl border border-primary/20 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold">{userStats.totalDrives}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Drives</div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">All time</p>
                  </div>
                </div>

                {/* Achievements - Moved from top section */}
                <div className="group relative overflow-hidden">
                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-amber-500/8 via-yellow-400/4 to-transparent rounded-lg sm:rounded-xl border border-amber-500/20 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Unlock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold">{userStats.achievementsUnlocked}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Achievements</div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Unlocked</p>
                  </div>
                </div>

                {/* Purchase Conversions */}
                <div className="group relative overflow-hidden">
                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-emerald-500/8 via-green-400/4 to-transparent rounded-lg sm:rounded-xl border border-emerald-500/20 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold">{userStats.purchaseConversions}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Conversions</div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Purchase notes</p>
                  </div>
                </div>

                {/* Store Rank - Moved from top section */}
                <div className="group relative overflow-hidden">
                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-orange-500/8 via-amber-400/4 to-transparent rounded-lg sm:rounded-xl border border-orange-500/20 transition-all duration-300 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold">#{userStats.leaderboardRank}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Store Rank</div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Leaderboard</p>
                  </div>
                </div>

                {/* Longest Drive */}
                {personalBests.longestDrive.duration > 0 && (
                  <div className="group relative overflow-hidden">
                    <div className="relative p-2 sm:p-3 bg-gradient-to-br from-blue-500/8 via-blue-400/4 to-transparent rounded-lg sm:rounded-xl border border-blue-500/20 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold">{Math.round(personalBests.longestDrive.duration)} min</div>
                          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Longest Drive</div>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{personalBests.longestDrive.model}</p>
                    </div>
                  </div>
                )}

                {/* Most Drives in a Day */}
                {personalBests.mostDrivesDay.count > 0 && (
                  <div className="group relative overflow-hidden">
                    <div className="relative p-2 sm:p-3 bg-gradient-to-br from-green-500/8 via-emerald-400/4 to-transparent rounded-lg sm:rounded-xl border border-green-500/20 transition-all duration-300 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold">{personalBests.mostDrivesDay.count}</div>
                          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Best Day</div>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{format(new Date(personalBests.mostDrivesDay.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                )}

                {/* Best Rating - Removed, now above */}
                {/* Most Popular Model - Removed */}

                {/* Daily Rotating Fun Record */}
                {completedDrives.length > 0 && (() => {
                  // Create consistent daily rotation based on advisor ID and current date
                  const today = format(new Date(), 'yyyy-MM-dd');
                  const seed = advisor.id + today;
                  const dayIndex = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 7;
                  
                  const funRecords = [
                    {
                      title: "Mind Blown",
                      icon: MessageSquare,
                      value: Math.round(completedDrives.length * 5.3),
                      subtitle: '"Wait, where\'s the engine?" 🤯',
                      color: "cyan",
                      gradient: "from-cyan-500/10 to-cyan-500/5",
                      border: "border-cyan-500/20"
                    },
                    {
                      title: "Frunk Demos",
                      icon: Car,
                      value: Math.round(completedDrives.length * 2.1),
                      subtitle: "Storage space surprises ⚡",
                      color: "blue",
                      gradient: "from-blue-500/10 to-blue-500/5", 
                      border: "border-blue-500/20"
                    },
                    {
                      title: "Range Anxiety",
                      icon: Target,
                      value: Math.round(completedDrives.length * 1.7),
                      subtitle: "Myths successfully busted 🎯",
                      color: "green",
                      gradient: "from-green-500/10 to-green-500/5",
                      border: "border-green-500/20"
                    },
                    {
                      title: "Supercharger",
                      icon: Trophy,
                      value: Math.round(completedDrives.length * 4.2),
                      subtitle: "Network explanations given ⚡",
                      color: "amber",
                      gradient: "from-amber-500/10 to-amber-500/5",
                      border: "border-amber-500/20"
                    },
                    {
                      title: "Autopilot Wows",
                      icon: Star,
                      value: Math.round(completedDrives.length * 3.8),
                      subtitle: '"It drives itself?!" moments 🤖',
                      color: "purple",
                      gradient: "from-purple-500/10 to-purple-500/5",
                      border: "border-purple-500/20"
                    },
                    {
                      title: "Door Handle",
                      icon: Clock,
                      value: Math.round(completedDrives.length * 6.1),
                      subtitle: "Confusion explanations 🚗",
                      color: "rose",
                      gradient: "from-rose-500/10 to-rose-500/5",
                      border: "border-rose-500/20"
                    },
                    {
                      title: "Demo → Sale",
                      icon: CheckCircle,
                      value: `${userStats.conversionRate.toFixed(0)}%`,
                      subtitle: `${userStats.purchaseConversions} purchase${userStats.purchaseConversions === 1 ? '' : 's'} recorded`,
                      color: "emerald",
                      gradient: "from-emerald-500/10 to-emerald-500/5",
                      border: "border-emerald-500/20"
                    }
                  ];
                  
                  const record = funRecords[dayIndex];
                  const IconComponent = record.icon;
                  
                  return (
                    <div className="group relative overflow-hidden">
                      <div className={`relative p-2 sm:p-3 bg-gradient-to-br ${record.gradient} rounded-lg sm:rounded-xl border ${record.border} transition-all duration-300 hover:border-${record.color}-500/40 hover:shadow-lg hover:shadow-${record.color}-500/10`}>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-${record.color}-500/20 flex items-center justify-center`}>
                            <IconComponent className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-${record.color}-500`} />
                          </div>
                          <div className="text-right">
                            <div className="text-lg sm:text-xl font-bold">{record.value}</div>
                            <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{record.title}</div>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{record.subtitle}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {goals && goals.length > 0 && (
            <Card>
                <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> My Goals</CardTitle>
                    <CardDescription className="text-xs">Your current performance goals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 pt-0">
                    {goals.map(goal => {
                        const { current, percentage } = calculateGoalProgress(goal);
                        const isCompleted = percentage >= 100;
                        return (
                            <div key={goal.id}>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-medium">{getGoalTitle(goal)}: <span className="text-muted-foreground">{getGoalDescription(goal)}</span></p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {isCompleted && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />}
                                        <span>({current}/{goal.targetValue})</span>
                                        <span className="hidden sm:inline">Ends {format(goal.endDate.toDate(), 'MMM d')}</span>
                                    </div>
                                </div>
                                <Progress value={percentage} variant={isCompleted ? "success" : "default"} className="h-2" />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        )}

        {/* Progress & Activity Section - Single Column Layout */}
        <div className="space-y-4 lg:space-y-6">
            <Card className="border-border/40">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    Upcoming Milestones
                  </CardTitle>
                  <CardDescription className="text-xs">What's next for you</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Next Achievement */}
                    {nextAchievements.length > 0 && (
                      <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Badge</p>
                        </div>
                        <p className="text-sm sm:text-base font-semibold mb-1">{nextAchievements[0].achievement.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">{nextAchievements[0].text}</p>
                        <div className="flex items-center justify-between mb-1">
                          <Progress value={nextAchievements[0].progress} className="h-1.5 sm:h-2 flex-1" />
                          <span className="text-xs text-muted-foreground ml-2">{Math.round(nextAchievements[0].progress)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Additional Close Achievements */}
                    {nextAchievements.length > 1 && nextAchievements.slice(1, 3).map((nextAch, index) => (
                      nextAch.progress > 50 && (
                        <div key={index} className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Almost There</p>
                          </div>
                          <p className="text-sm sm:text-base font-semibold mb-1">{nextAch.achievement.title}</p>
                          <p className="text-xs text-muted-foreground mb-2">{nextAch.text}</p>
                          <div className="flex items-center justify-between mb-1">
                            <Progress value={nextAch.progress} className="h-1.5 sm:h-2 flex-1" />
                            <span className="text-xs text-muted-foreground ml-2">{Math.round(nextAch.progress)}%</span>
                          </div>
                        </div>
                      )
                    ))}

                    {/* Next Goal Deadline */}
                    {goals.length > 0 && goals.some(g => calculateGoalProgress(g).percentage < 100) && (() => {
                      const nextGoal = goals.filter(g => calculateGoalProgress(g).percentage < 100).sort((a, b) => 
                        a.endDate.toDate().getTime() - b.endDate.toDate().getTime()
                      )[0];
                      if (!nextGoal) return null;
                      const progress = calculateGoalProgress(nextGoal);
                      const daysLeft = Math.ceil((nextGoal.endDate.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal Deadline</p>
                          </div>
                          <p className="text-sm sm:text-base font-semibold mb-1">{getGoalDescription(nextGoal)}</p>
                          <p className="text-xs text-muted-foreground mb-2">{daysLeft} days remaining</p>
                          <Progress value={progress.percentage} className="h-1.5 sm:h-2" />
                        </div>
                      );
                    })()}

                    {/* Round Number Milestone */}
                    {(() => {
                      const nextMilestone = [50, 100, 150, 200, 250, 300, 500].find(m => m > completedDrives.length);
                      if (!nextMilestone) return null;
                      const remaining = nextMilestone - completedDrives.length;
                      const progress = (completedDrives.length / nextMilestone) * 100;
                      return (
                        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Car className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Drive Milestone</p>
                          </div>
                          <p className="text-sm sm:text-base font-semibold mb-1">{nextMilestone} Total Drives</p>
                          <p className="text-xs text-muted-foreground mb-2">{remaining} drives to go</p>
                          <Progress value={progress} className="h-1.5 sm:h-2" />
                        </div>
                      );
                    })()}

                    {nextAchievements.length === 0 && goals.length === 0 && completedDrives.length >= 500 && (
                        <div className="text-center py-6 sm:py-8">
                            <div className="inline-flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                                </div>
                                <div className="text-left">
                                    <div className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-400">Outstanding Performance!</div>
                                    <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80">All milestones achieved • Keep up the amazing work</div>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Car className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      My Recent Vehicles
                    </CardTitle>
                    <CardDescription className="text-xs">Cars you've recently interacted with.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {recentVehicles.length > 0 ? (
                        <Carousel opts={{ align: "start", loop: false, watchDrag: true }} className="w-full">
                            <CarouselContent>
                                {recentVehicles.map(v => (
                                    <CarouselItem key={v.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                                        <div className="p-1 select-none">
                                            <div className="relative aspect-video rounded-lg overflow-hidden">
                                                <Image src={getVehicleImage(v.model, v.trim)} alt={v.model} layout="fill" objectFit="cover" />
                                            </div>
                                            <p className="text-xs sm:text-sm font-semibold mt-2">{v.model} {v.trim}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">...{v.vin.slice(-6)}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">Last used: {format(v.lastUsed, 'MMM d, h:mm a')}</p>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {recentVehicles.length > 2 && (
                              <>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                              </>
                            )}
                        </Carousel>
                    ) : (
                        <div className="text-center py-6 sm:py-8">
                            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl flex items-center justify-center">
                                <Car className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/60" />
                            </div>
                            <h4 className="text-base sm:text-lg font-semibold mb-2">Ready to Hit the Road?</h4>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                Your recent vehicle interactions will appear here. Start a demo drive to see your activity.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>


        </div>

        {/* Achievement Showcase - Standalone Section */
        <Card ref={achievementShowcaseRef} className="border-border/40">
            <CardHeader className="pb-2 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-1 sm:space-y-1.5">
                    <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                      My Achievement Showcase
                    </CardTitle>
                    <CardDescription className="text-xs">Your personal collection of unlocked badges.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={(value: 'date' | 'rarity' | 'alphabetical') => setSortBy(value)}>
                      <SelectTrigger className="w-[140px] sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date Received</SelectItem>
                        <SelectItem value="rarity">Rarity</SelectItem>
                        <SelectItem value="alphabetical">A to Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
                    {paginatedAchievements.length > 0 ? paginatedAchievements.map(ach => (
                      <TooltipProvider key={ach.id}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center text-center gap-1 p-1.5 md:p-2 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer">
                                        <div className="relative w-full aspect-square md:w-[80%] lg:w-[45%] md:mx-auto">
                                          <AchievementIcon 
                                            src={ach.iconUrl} 
                                            alt={ach.title} 
                                            width={128} 
                                            height={128} 
                                            className="w-full h-full object-contain transition-transform group-hover:scale-110"
                                          />
                                          <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5 ring-2 ring-background shadow-sm">
                                            <CheckCircle className="w-2 h-2 text-white" />
                                          </div>
                                        </div>
                                        <p className="text-[9px] md:text-[10px] font-medium leading-tight line-clamp-2 w-full">{ach.title}</p>
                                    </div>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">{ach.description}</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                    )) : (
                        <div className="col-span-full">
                            <div className="relative p-12 text-center">
                                {/* Engaging illustration background */}
                                <div className="relative mx-auto w-32 h-32 mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" />
                                    <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                                        <Trophy className="h-16 w-16 text-primary/60" />
                                    </div>
                                </div>
                                
                                {/* Engaging copy with clear action */}
                                <div className="space-y-4 max-w-md mx-auto">
                                    <h3 className="text-xl font-semibold">Start Your Achievement Journey</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Your first demo drive is just the beginning. Complete drives, provide excellent customer service, and unlock exclusive badges to showcase your expertise.
                                    </p>
                                    
                                    {/* Action-oriented guidance */}
                                    <div className="pt-4">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                                            <Car className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">Ready to earn your first badge?</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4 sm:mt-6">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            Previous
                        </Button>
                        <span className="text-xs sm:text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                            Next
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
}
        {/* Feedback Insights Section */}
        <Card className="border-border/40">
            <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                          Feedback Insights
                        </CardTitle>
                        <CardDescription className="text-xs">Last 30 days of customer feedback</CardDescription>
                    </div>
                    {sentimentData.total > 0 && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setFeedbackSheetOpen(true)}
                            className="gap-2"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">See Reviews</span>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {sentimentData.total > 0 || sentimentData.averageRating > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                        {/* Clean Stats Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            {/* Average Rating */}
                            {sentimentData.averageRating > 0 && (
                                <div className="group relative overflow-hidden">
                                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-yellow-500/8 via-amber-400/4 to-transparent rounded-lg sm:rounded-xl border border-yellow-500/20 transition-all duration-300 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/10">
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold">{sentimentData.averageRating}</div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Rating</div>
                                      </div>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">out of 5</p>
                                  </div>
                                </div>
                            )}
                            
                            {/* Total Feedback */}
                            {sentimentData.total > 0 && (
                                <div className="group relative overflow-hidden">
                                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-slate-500/8 via-slate-400/4 to-transparent rounded-lg sm:rounded-xl border border-slate-500/20 transition-all duration-300 hover:border-slate-500/40 hover:shadow-lg hover:shadow-slate-500/10">
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                                        <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold">{sentimentData.total}</div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Total</div>
                                      </div>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">responses</p>
                                  </div>
                                </div>
                            )}
                            
                            {/* Positive */}
                            {sentimentData.total > 0 && (
                                <div className="group relative overflow-hidden">
                                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-green-500/8 via-emerald-400/4 to-transparent rounded-lg sm:rounded-xl border border-green-500/20 transition-all duration-300 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10">
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold">{Math.round((sentimentData.positive / sentimentData.total) * 100)}%</div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Positive</div>
                                      </div>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{sentimentData.positive} reviews</p>
                                  </div>
                                </div>
                            )}
                            
                            {/* Negative */}
                            {sentimentData.total > 0 && (
                                <div className="group relative overflow-hidden">
                                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-red-500/8 via-rose-400/4 to-transparent rounded-lg sm:rounded-xl border border-red-500/20 transition-all duration-300 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10">
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                        <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold">{Math.round((sentimentData.negative / sentimentData.total) * 100)}%</div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Negative</div>
                                      </div>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{sentimentData.negative} reviews</p>
                                  </div>
                                </div>
                            )}
                        </div>

                        {/* Neutral - If exists, show in separate row */}
                        {sentimentData.neutral > 0 && sentimentData.total > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                <div className="group relative overflow-hidden col-span-2 lg:col-span-1">
                                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-gray-500/8 via-gray-400/4 to-transparent rounded-lg sm:rounded-xl border border-gray-500/20 transition-all duration-300 hover:border-gray-500/40 hover:shadow-lg hover:shadow-gray-500/10">
                                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                                        <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold">{Math.round((sentimentData.neutral / sentimentData.total) * 100)}%</div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Neutral</div>
                                      </div>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{sentimentData.neutral} responses</p>
                                  </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-border/40 bg-muted/5 p-8 sm:p-12 text-center">
                        <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted/50 mb-3 sm:mb-4">
                            <Meh className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm sm:text-base font-medium text-foreground mb-1">No feedback data yet</p>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">Complete drives and collect customer feedback to see sentiment insights</p>
                    </div>
                )}
            </CardContent>
        </Card>

      </div>
      
      {/* Feedback Review Sheet */}
      <Sheet open={isFeedbackSheetOpen} onOpenChange={setFeedbackSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Customer Feedback Reviews
            </SheetTitle>
            <SheetDescription>
              Review all feedback from the last 30 days
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={feedbackFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackFilter('all')}
                className="gap-2"
              >
                All ({sentimentData.total})
              </Button>
              <Button
                variant={feedbackFilter === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackFilter('positive')}
                className="gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                Positive ({sentimentData.positive})
              </Button>
              <Button
                variant={feedbackFilter === 'negative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackFilter('negative')}
                className="gap-2"
              >
                <ThumbsDown className="h-4 w-4" />
                Negative ({sentimentData.negative})
              </Button>
              <Button
                variant={feedbackFilter === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackFilter('neutral')}
                className="gap-2"
              >
                <Minus className="h-4 w-4" />
                Neutral ({sentimentData.neutral})
              </Button>
            </div>

            {/* Feedback List */}
            <ScrollArea className="h-[calc(85vh-200px)] sm:h-[calc(90vh-200px)]">
              <div className="space-y-3 pr-4">
                {recentAdvisorLogs
                  .filter(log => {
                    if (!log.feedback || !log.sentimentLabel) return false;
                    if (feedbackFilter === 'all') return true;
                    return log.sentimentLabel === feedbackFilter;
                  })
                  .sort((a, b) => getDriveDate(b).getTime() - getDriveDate(a).getTime())
                  .map((log, index) => {
                    const sentimentIcon = 
                      log.sentimentLabel === 'positive' ? <ThumbsUp className="h-4 w-4 text-green-500" /> :
                      log.sentimentLabel === 'negative' ? <ThumbsDown className="h-4 w-4 text-red-500" /> :
                      <Minus className="h-4 w-4 text-gray-500" />;
                    
                    const sentimentColor = 
                      log.sentimentLabel === 'positive' ? 'border-green-500/20 bg-green-500/5' :
                      log.sentimentLabel === 'negative' ? 'border-red-500/20 bg-red-500/5' :
                      'border-gray-500/20 bg-gray-500/5';

                    return (
                      <Card key={`${log.id}-${index}`} className={cn('border', sentimentColor)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {sentimentIcon}
                              <Badge variant="outline" className="text-xs">
                                {log.sentimentLabel}
                              </Badge>
                              {log.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs font-medium">{log.rating}/5</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(getDriveDate(log), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-foreground leading-relaxed">{log.feedback}</p>
                          <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
                            <Car className="h-3 w-3" />
                            <span>{log.vehicleModel}</span>
                            {(log as any).customer_name && (
                              <>
                                <span>•</span>
                                <span>{(log as any).customer_name}</span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                {recentAdvisorLogs.filter(log => {
                  if (!log.feedback || !log.sentimentLabel) return false;
                  if (feedbackFilter === 'all') return true;
                  return log.sentimentLabel === feedbackFilter;
                }).length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/5 p-12 text-center">
                    <Meh className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-base font-medium text-foreground mb-1">No feedback found</p>
                    <p className="text-sm text-muted-foreground">
                      {feedbackFilter === 'all' 
                        ? 'No feedback available for the last 30 days'
                        : `No ${feedbackFilter} feedback in the last 30 days`
                      }
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
      
      <AvatarSelectorDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={advisor.avatarUrl || null}
        advisors={advisors}
        currentAdvisorId={advisor.id}
      />
      
      {/* Level Up Modal */}
      {showLevelUpModal && levelUpData && (
        <LevelUpModal
          level={levelUpData.level}
          xpGained={levelUpData.xpGained}
          onClose={() => setShowLevelUpModal(false)}
        />
      )}
    </>
  );
}
