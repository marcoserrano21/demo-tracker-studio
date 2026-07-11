

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { DriveLog, Advisor, Vehicle, ManualAward, StoreInfo } from '@/lib/types';
import { achievements, Achievement, AchievementCategory, getDriveDate } from '@/lib/achievements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Trophy, Star, Shield, Zap, Puzzle, Award, Lock, Check, Search, Car, TrendingUp, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AchievementIcon } from './achievement-icon';
import { Input } from './ui/input';
import { Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { getLevelFromXP, getRankForLevel, calculateHistoricalXP } from '@/lib/xp-system';
import { buildLeaderboardMetrics, compareLeaderboardEntries, withDenseRanks } from '@/lib/leaderboard-rank';

interface HallOfFameProps {
  driveLogs: DriveLog[];
  advisors: Advisor[];
  vehicles: Vehicle[];
  manualAwards: ManualAward[];
  allStores: StoreInfo[];
}

const categoryIcons: Record<AchievementCategory, React.ElementType> = {
  'Mastery & Milestones': Trophy,
  'Performance & Excellence': Star,
  'Tenacity & Hustle': Zap,
  'Knowledge & Evangelism': Shield,
  'Quirky & Fun': Puzzle,
  'Operational Excellence': Award,
  'Elite & Secret': Lock,
};

const CATEGORIES: AchievementCategory[] = [
    'Mastery & Milestones',
    'Performance & Excellence',
    'Tenacity & Hustle',
    'Knowledge & Evangelism',
    'Quirky & Fun',
    'Operational Excellence',
    'Elite & Secret',
];

const getTrophyColor = (rank: number) => {
  switch (rank) {
    case 1: return 'text-yellow-400';
    case 2: return 'text-gray-400';
    case 3: return 'text-orange-400';
    default: return 'text-muted-foreground';
  }
};

const getCompletedDrives = (driveLogs: DriveLog[]) => driveLogs.filter(log => log.endTime);

export default function HallOfFame({ driveLogs, advisors, vehicles, manualAwards, allStores }: HallOfFameProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const advisorProfileRef = useRef<HTMLDivElement>(null);
  
  // Pagination settings: 15 per page on ALL layouts (mobile, tablet, desktop)
  const ITEMS_PER_PAGE = 15;

  const getStoreName = (storeId: string) => {
    const store = allStores.find(s => s.code === storeId);
    return store ? store.name : 'Unknown Store';
  }

  const advisorLeaderboard = useMemo(() => {
    const scores: Record<string, {
      advisor: Advisor;
      recentAchievements: (Achievement & { unlockedAt: Date })[];
      achievementCount: number;
      driveCount: number;
      purchaseCount: number;
      totalXP: number;
      averageRating: number;
    }> = {};

    advisors.forEach(adv => {
        const advisorLogs = driveLogs.filter(log => log.coPilot === adv.name);
        const advisorCompletedDrives = getCompletedDrives(advisorLogs);

        const getUnlockDateForAchievement = (ach: Achievement): Date | null => {
            const completedDrivesSorted = advisorCompletedDrives.sort((a,b) => getDriveDate(a).getTime() - getDriveDate(b).getTime());
            
            if (ach.id.includes('drive')) {
                const countMatch = ach.id.match(/(\d+)/);
                if (countMatch) {
                    const driveCount = parseInt(countMatch[0], 10);
                    if (completedDrivesSorted.length >= driveCount) {
                        return getDriveDate(completedDrivesSorted[driveCount - 1]);
                    }
                }
            }
            
            const satisfyingLog = completedDrivesSorted.find(log => ach.checker(adv, [log], driveLogs, vehicles));
            if (satisfyingLog) return getDriveDate(satisfyingLog);
            return null;
        };
        
        const unlockedAutomatic = achievements
            .filter(ach => ach.checker(adv, advisorLogs, driveLogs, vehicles))
            .map(ach => ({...ach, unlockedAt: getUnlockDateForAchievement(ach) || new Date() }));
            
        const unlockedManual = manualAwards?.filter(ma => ma.advisorId === adv.id).map(ma => {
            const ach = achievements.find(a => a.id === ma.achievementId);
            if (!ach) return null;
            const unlockedAt = ma.awardedAt instanceof Timestamp ? ma.awardedAt.toDate() : new Date(ma.awardedAt);
            return { ...ach, unlockedAt };
        }).filter((a): a is Achievement & {unlockedAt: Date} => !!a) || [];

        const allUnlockedAchs = [...new Map([...unlockedAutomatic, ...unlockedManual].map(item => [item.id, item])).values()];

        const recentAchievements = allUnlockedAchs
            .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
            .slice(0, 3);
        
        scores[adv.id] = {
          advisor: adv,
          recentAchievements,
          achievementCount: allUnlockedAchs.length,
          ...buildLeaderboardMetrics(adv, advisorLogs),
        };
    });

    const sorted = Object.values(scores).sort(compareLeaderboardEntries);

    return withDenseRanks(sorted).map((item) => ({
      ...item,
      score: item.achievementCount,
    }));
  }, [driveLogs, advisors, vehicles, manualAwards]);

  useEffect(() => {
    if (!selectedAdvisor && advisorLeaderboard.length > 0) {
      setSelectedAdvisor(advisorLeaderboard[0].advisor);
    }
  }, [advisorLeaderboard, selectedAdvisor]);

  const filteredAdvisors = useMemo(() => {
    if (!searchTerm) return advisorLeaderboard;
    return advisorLeaderboard.filter(item =>
      item.advisor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, advisorLeaderboard]);
  
  // Paginated advisors for ALL layouts
  const paginatedAdvisors = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAdvisors.slice(startIndex, endIndex);
  }, [filteredAdvisors, currentPage]);
  
  const totalPages = Math.ceil(filteredAdvisors.length / ITEMS_PER_PAGE);
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const displayedAdvisorData = useMemo(() => {
    if (!selectedAdvisor) return null;
    return advisorLeaderboard.find(item => item.advisor.id === selectedAdvisor.id);
  }, [selectedAdvisor, advisorLeaderboard]);

  const advisorAchievements = useMemo(() => {
    if (!selectedAdvisor) return [];
    const advisorLogs = driveLogs.filter(log => log.coPilot === selectedAdvisor.name);
    
    const manualAchIds = new Set(manualAwards?.filter(ma => ma.advisorId === selectedAdvisor.id).map(ma => ma.achievementId) || []);

    return achievements.map(ach => ({
      ...ach,
      isUnlocked: ach.checker(selectedAdvisor, advisorLogs, driveLogs, vehicles) || manualAchIds.has(ach.id),
    }));
  }, [selectedAdvisor, driveLogs, vehicles, manualAwards]);

  const achievementsByCategory = useMemo(() => {
    return advisorAchievements.reduce((acc, ach) => {
      if (!acc[ach.category]) acc[ach.category] = [];
      acc[ach.category].push(ach);
      return acc;
    }, {} as Record<AchievementCategory, (Achievement & { isUnlocked: boolean })[]>);
  }, [advisorAchievements]);

  return (
    <div className="space-y-8 sm:space-y-12">
       {/* Hero Section - Minimalist */}
       <div className="space-y-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Hall of Fame</h1>
        </div>
        <p className="text-base text-muted-foreground">Top performers and achievements</p>
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Panel - Leaderboard */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Card className="h-full border-border/40 flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg font-semibold">Leaderboard</CardTitle>
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{advisorLeaderboard.length}</span>
                  </div>
                </div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search..."
                        className="pl-9 h-10 border-border/40 bg-muted/30 focus-visible:bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col overflow-hidden h-full">
              <ScrollArea className="flex-1 px-3 pb-2">
                <div className="space-y-1.5 py-2">
                  {paginatedAdvisors.map((item) => (
                    <div
                      key={item.advisor.id}
                      className={cn(
                        "grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                        selectedAdvisor?.id === item.advisor.id 
                          ? "bg-primary/5 ring-1 ring-primary/20" 
                          : "hover:bg-muted/40"
                      )}
                      onClick={() => {
                        setSelectedAdvisor(item.advisor);
                        // Smooth scroll to top of page
                        setTimeout(() => {
                          window.scrollTo({ 
                            top: 0, 
                            behavior: 'smooth'
                          });
                        }, 100);
                      }}
                    >
                      {/* Rank Badge */}
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-lg font-semibold text-xs flex-shrink-0",
                        item.rank <= 3 ? "" : "bg-muted/50"
                      )}>
                        {item.rank <= 3 ? (
                          <Trophy className={cn("h-4 w-4", getTrophyColor(item.rank))} />
                        ) : (
                          <span className="text-muted-foreground">{item.rank}</span>
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <Avatar className="h-9 w-9 border border-border/40 flex-shrink-0">
                        <AvatarImage src={item.advisor.avatarUrl} />
                        <AvatarFallback className="text-xs font-medium bg-muted">
                          {item.advisor.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Info - Now uses full available space */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm break-words leading-tight">{item.advisor.name}</p>
                         <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {item.recentAchievements.slice(0, 3).map(ach => (
                                <TooltipProvider key={ach.id}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                             <AchievementIcon 
                                               src={ach.iconUrl} 
                                               alt={ach.title} 
                                               width={16} 
                                               height={16} 
                                               className="w-4 h-4"
                                             />
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">{ach.title}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                      </div>
                      
                      {/* Score Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-full flex-shrink-0">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-sm text-amber-600 dark:text-amber-500">{item.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Pagination Controls - Compact Layout */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 pb-1 px-2 border-t border-border/40 mt-auto flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {currentPage}/{totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Advisor Profile */}
        <div className="lg:col-span-2 order-1 lg:order-2" ref={advisorProfileRef}>
            {displayedAdvisorData ? (
                <div className="space-y-6">
                  {/* Profile Header Card - Minimalist */}
                  <Card className="overflow-hidden border-border/40">
                    <div className="bg-muted/20 p-6 sm:p-8 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border/60">
                          <AvatarImage src={displayedAdvisorData.advisor.avatarUrl} />
                          <AvatarFallback className="text-2xl sm:text-3xl font-semibold bg-muted">
                            {displayedAdvisorData.advisor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center sm:text-left">
                          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{displayedAdvisorData.advisor.name}</h2>
                          {displayedAdvisorData.rank <= 3 && (
                            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                              <Trophy className={cn("h-3.5 w-3.5", getTrophyColor(displayedAdvisorData.rank))} />
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wide">
                                {displayedAdvisorData.rank === 1 ? '1st Place' : displayedAdvisorData.rank === 2 ? '2nd Place' : '3rd Place'}
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {(displayedAdvisorData.advisor.role || 'Advisor').charAt(0).toUpperCase() + 
                             (displayedAdvisorData.advisor.role || 'Advisor').slice(1)} • 
                            {getStoreName(displayedAdvisorData.advisor.storeId)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Stats Grid - Modern */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
                        {/* Drives */}
                        <div className="group relative overflow-hidden">
                          <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent rounded-xl sm:rounded-2xl border border-primary/20 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
                                <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              </div>
                              <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold">{displayedAdvisorData.driveCount}</div>
                                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Drives</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Achievements */}
                        <div className="group relative overflow-hidden">
                          <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-amber-500/8 via-yellow-400/4 to-transparent rounded-xl sm:rounded-2xl border border-amber-500/20 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                              </div>
                              <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold">{displayedAdvisorData.score}</div>
                                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Achievements</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rank */}
                        <div className="group relative overflow-hidden">
                          <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-orange-500/8 via-amber-400/4 to-transparent rounded-xl sm:rounded-2xl border border-orange-500/20 transition-all duration-300 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                              </div>
                              <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold">#{displayedAdvisorData.rank}</div>
                                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Rank</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Level */}
                        {(() => {
                          const advisorXP = displayedAdvisorData.advisor.xp || calculateHistoricalXP(
                            driveLogs.filter(log => log.coPilot === displayedAdvisorData.advisor.name && log.endTime)
                          );
                          const level = getLevelFromXP(advisorXP);
                          const rank = getRankForLevel(level);
                          
                          // Tier-specific colors
                          const tierColors: Record<string, { gradient: string; border: string; glow: string; text: string; bg: string }> = {
                            Bronze: {
                              gradient: 'from-amber-500/8 via-yellow-400/4 to-transparent',
                              border: 'border-amber-500/20 hover:border-amber-500/40',
                              glow: 'hover:shadow-amber-500/10',
                              text: 'text-amber-500',
                              bg: 'bg-amber-500/20',
                            },
                            Silver: {
                              gradient: 'from-slate-400/8 via-gray-300/4 to-transparent',
                              border: 'border-slate-400/20 hover:border-slate-400/40',
                              glow: 'hover:shadow-slate-400/10',
                              text: 'text-slate-400',
                              bg: 'bg-slate-400/20',
                            },
                            Gold: {
                              gradient: 'from-yellow-400/8 via-amber-300/4 to-transparent',
                              border: 'border-yellow-400/20 hover:border-yellow-400/40',
                              glow: 'hover:shadow-yellow-400/10',
                              text: 'text-yellow-400',
                              bg: 'bg-yellow-400/20',
                            },
                            Platinum: {
                              gradient: 'from-cyan-400/8 via-blue-300/4 to-transparent',
                              border: 'border-cyan-400/20 hover:border-cyan-400/40',
                              glow: 'hover:shadow-cyan-400/10',
                              text: 'text-cyan-400',
                              bg: 'bg-cyan-400/20',
                            },
                            Diamond: {
                              gradient: 'from-purple-400/8 via-pink-300/4 to-transparent',
                              border: 'border-purple-400/20 hover:border-purple-400/40',
                              glow: 'hover:shadow-purple-400/10',
                              text: 'text-purple-400',
                              bg: 'bg-purple-400/20',
                            },
                            Transcendent: {
                              gradient: 'from-pink-400/8 via-rose-300/4 to-transparent',
                              border: 'border-pink-400/20 hover:border-pink-400/40',
                              glow: 'hover:shadow-pink-400/10',
                              text: 'text-pink-400',
                              bg: 'bg-pink-400/20',
                            },
                          };
                          
                          const colors = tierColors[rank.tier] || tierColors.Bronze;
                          
                          return (
                            <div className="group relative overflow-hidden">
                              <div className={`relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br ${colors.gradient} rounded-xl sm:rounded-2xl border ${colors.border} transition-all duration-300 hover:shadow-lg ${colors.glow}`}>
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${colors.bg} flex items-center justify-center`}>
                                    <span className="text-base sm:text-lg">{rank.icon}</span>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xl sm:text-2xl font-bold">{level}</div>
                                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Level</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>

                  {/* Badge Collection Card */}
                  <Card className="border-border/40">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">Achievements</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {advisorAchievements.filter(a => a.isUnlocked).length} of {advisorAchievements.length}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] sm:h-[400px] pr-3">
                          <Accordion type="multiple" defaultValue={['Mastery & Milestones']} className="w-full space-y-3">
                              {CATEGORIES.map(category => {
                                  const categoryAch = achievementsByCategory[category];
                                  if (!categoryAch) return null;
                                  
                                  const unlockedCount = categoryAch.filter(a => a.isUnlocked).length;
                                  const totalCount = categoryAch.length;
                                  const visibleAchievements = categoryAch.filter(a => !a.isSecret || a.isUnlocked);

                                  if (visibleAchievements.length === 0 && category !== 'Elite & Secret') return null;
                                  
                                  return (
                                      <AccordionItem 
                                        key={category} 
                                        value={category} 
                                        className="border-0"
                                      >
                                          <AccordionTrigger className="px-4 py-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all hover:no-underline [&[data-state=open]]:rounded-b-none [&[data-state=open]]:bg-muted/50">
                                              <div className="flex items-center gap-3 w-full">
                                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                                                    {React.createElement(categoryIcons[category], { 
                                                      className: "w-4 h-4 text-foreground" 
                                                    })}
                                                  </div>
                                                  <div className="flex-1 text-left">
                                                    <h3 className="text-sm font-semibold">{category}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                      {unlockedCount} of {totalCount}
                                                    </p>
                                                  </div>
                                              </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="px-4 pb-4 pt-3 bg-muted/30 rounded-b-xl">
                                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                                                  {visibleAchievements.length > 0 ? visibleAchievements.map(ach => (
                                                      <TooltipProvider key={ach.id}>
                                                          <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <button className="group flex flex-col items-center text-center gap-2 p-2 rounded-xl hover:bg-background/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                                                                      <div className={cn(
                                                                        "relative rounded-xl p-2 transition-all duration-300",
                                                                        ach.isUnlocked 
                                                                          ? 'bg-primary/5 scale-100' 
                                                                          : 'bg-muted/30 scale-95 grayscale opacity-50'
                                                                      )}>
                                                                          <AchievementIcon
                                                                            src={ach.iconUrl}
                                                                            alt={ach.title}
                                                                            width={48}
                                                                            height={48}
                                                                            className="w-12 h-12"
                                                                          />
                                                                          {ach.isUnlocked && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 ring-2 ring-background">
                                                                              <Check className="w-2.5 h-2.5 text-white" />
                                                                            </div>
                                                                          )}
                                                                          {!ach.isUnlocked && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-0.5 ring-2 ring-background">
                                                                              <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                                                            </div>
                                                                          )}
                                                                      </div>
                                                                      <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-foreground transition-colors">{ach.title}</p>
                                                                  </button>
                                                              </TooltipTrigger>
                                                              <TooltipContent className="max-w-xs">
                                                                  <p className="font-semibold text-sm">{ach.title}</p>
                                                                  <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                                                                  {!ach.isUnlocked && (
                                                                    <div className="flex items-center gap-1 text-xs text-amber-500 mt-2">
                                                                      <Lock className="w-3 h-3" />
                                                                      <span>Locked</span>
                                                                    </div>
                                                                  )}
                                                              </TooltipContent>
                                                          </Tooltip>
                                                      </TooltipProvider>
                                                  )) : (
                                                    <div className="col-span-full">
                                                        <div className="relative p-8 text-center bg-gradient-to-br from-muted/30 via-muted/20 to-transparent rounded-2xl border border-dashed border-border/40">
                                                            {/* Modern illustration */}
                                                            <div className="relative mx-auto w-20 h-20 mb-4">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-xl" />
                                                                <div className="relative w-full h-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                                                                    <Lock className="h-8 w-8 text-amber-500/60" />
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Enhanced content hierarchy */}
                                                            <h4 className="text-lg font-semibold mb-2">Achievements Await</h4>
                                                            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                                                                Complete demo drives and provide excellent service to unlock badges in this category.
                                                            </p>
                                                            
                                                            {/* Motivational element */}
                                                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                                                                <Star className="h-3 w-3 text-amber-500" />
                                                                <span className="text-xs font-medium text-amber-600">First achievement coming soon</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                  )}
                                              </div>
                                          </AccordionContent>
                                      </AccordionItem>
                                  );
                              })}
                          </Accordion>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
            ) : (
                <Card className="h-full min-h-[400px] border-border/40">
                  <CardContent className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                      <Trophy className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-base font-medium text-foreground">Select an advisor</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">Choose from the leaderboard to view achievements and stats</p>
                  </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
