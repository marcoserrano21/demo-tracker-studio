'use client';

import { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, isToday, isYesterday } from 'date-fns';
import type { DriveLog } from '@/lib/types';
import { getDriveDate } from '@/lib/achievements';

interface StreakIndicatorProps {
  driveLogs: DriveLog[];
  className?: string;
}

export function StreakIndicator({ driveLogs, className }: StreakIndicatorProps) {
  const streakData = useMemo(() => {
    if (!driveLogs || driveLogs.length === 0) return { current: 0, longest: 0, todayCompleted: false };

    const completedDrives = driveLogs.filter(log => log.endTime);
    
    // Get unique dates with completed drives
    const uniqueDates = Array.from(
      new Set(
        completedDrives.map(log => format(getDriveDate(log), 'yyyy-MM-dd'))
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return { current: 0, longest: 0, todayCompleted: false };

    // Check if today has a completed drive
    const todayCompleted = uniqueDates.includes(format(new Date(), 'yyyy-MM-dd'));

    // Calculate current streak
    let currentStreak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // Start from today or yesterday
    let checkDate = todayCompleted ? new Date() : subDays(new Date(), 1);
    
    while (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const nextDate = new Date(uniqueDates[i + 1]);
      const diffDays = Math.round((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { 
      current: currentStreak, 
      longest: longestStreak,
      todayCompleted 
    };
  }, [driveLogs]);

  if (streakData.current === 0) return null;

  return (
    <Card className={cn("border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Flame className={cn(
                "w-8 h-8",
                streakData.current >= 7 ? "text-orange-500 animate-pulse" : "text-orange-400"
              )} />
              {streakData.current >= 7 && (
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-md animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{streakData.current}</span>
                <span className="text-sm text-muted-foreground">day streak</span>
              </div>
              {!streakData.todayCompleted && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Complete a drive today to keep it alive!
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best Streak</div>
            <div className="text-lg font-semibold text-foreground">{streakData.longest} days</div>
          </div>
        </div>
        
        {/* Progress towards milestone */}
        {streakData.current > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {streakData.current < 7 
                  ? `${7 - streakData.current} more days to reach 1 week`
                  : streakData.current < 30
                  ? `${30 - streakData.current} more days to reach 1 month`
                  : 'Legendary streak! 🏆'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
