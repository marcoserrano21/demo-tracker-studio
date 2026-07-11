'use client';

import { useEffect, useState, useMemo } from 'react';
import { Progress } from './ui/progress';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';

interface AchievementProgressToastProps {
  nextAchievements: { achievement: Achievement; progress: number; text: string }[];
  onNavigate?: () => void;
}

export function AchievementProgressToast({ nextAchievements, onNavigate }: AchievementProgressToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const topAchievement = useMemo(() => {
    if (!nextAchievements || nextAchievements.length === 0) return null;
    // Get the achievement with highest progress
    return nextAchievements.reduce((max, curr) => 
      curr.progress > max.progress ? curr : max
    , nextAchievements[0]);
  }, [nextAchievements]);

  useEffect(() => {
    // Check if toast was already dismissed in this session
    if (sessionStorage.getItem('achievement-toast-dismissed')) {
      setIsDismissed(true);
      return;
    }

    // Show toast after 2 seconds if there's progress and not dismissed
    if (topAchievement && !isDismissed && topAchievement.progress > 0 && topAchievement.progress < 100) {
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        
        // Auto-dismiss after 4.5 seconds of being visible
        const dismissTimer = setTimeout(() => {
          setIsVisible(false);
          setIsDismissed(true);
          sessionStorage.setItem('achievement-toast-dismissed', 'true');
        }, 4500);
        
        // Store dismiss timer to clear it if needed
        return () => clearTimeout(dismissTimer);
      }, 2000);
      
      return () => clearTimeout(showTimer);
    }
  }, [topAchievement, isDismissed]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsDismissed(true);
    // Save dismissed state to sessionStorage
    sessionStorage.setItem('achievement-toast-dismissed', 'true');
  };

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  if (!topAchievement || isDismissed || !isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-80 sm:w-96",
        "animate-in slide-in-from-bottom-5 duration-300",
        "cursor-pointer"
      )}
      onClick={handleClick}
    >
      <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 backdrop-blur-sm border border-amber-500/20 rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
              <span className="font-semibold text-sm text-foreground">Almost There!</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {topAchievement.text} to unlock <span className="font-semibold text-foreground">"{topAchievement.achievement.title}"</span>
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold">{Math.round(topAchievement.progress)}%</span>
            </div>
            <Progress 
              value={topAchievement.progress} 
              className="h-2 bg-amber-900/20"
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Click to view all achievements
          </p>
        </div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent animate-shimmer pointer-events-none" />
      </div>
    </div>
  );
}
