'use client';

import { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriveLog } from '@/lib/types';
import { calculateHabitStreak } from '@/lib/habit-streak';

interface StreakIndicatorProps {
  driveLogs: DriveLog[];
  advisorName: string;
  className?: string;
}

/** Habit streak: consecutive days with on-time demos that logged FSD-sub attach. */
export function StreakIndicator({ driveLogs, advisorName, className }: StreakIndicatorProps) {
  const streakData = useMemo(
    () => calculateHabitStreak(driveLogs, advisorName),
    [driveLogs, advisorName],
  );

  if (streakData.current === 0 && streakData.longest === 0) return null;

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
                <span className="text-sm text-muted-foreground">day habit streak</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                On-time Finish + FSD-sub attach
              </p>
              {!streakData.todayCompleted && streakData.current > 0 && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Log an on-time FSD-sub today to keep it alive
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best Streak</div>
            <div className="text-lg font-semibold text-foreground">{streakData.longest} days</div>
          </div>
        </div>
        
        {streakData.current > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {streakData.current < 7 
                  ? `${7 - streakData.current} more days to reach 1 week`
                  : streakData.current < 30
                  ? `${30 - streakData.current} more days to reach 1 month`
                  : 'Legendary habit streak'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
