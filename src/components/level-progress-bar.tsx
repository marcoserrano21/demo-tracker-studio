'use client';

import { motion } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getXPProgress, getRankForLevel, formatXP } from '@/lib/xp-system';

interface LevelProgressBarProps {
  totalXP: number;
  showDetails?: boolean;
  compact?: boolean;
}

export function LevelProgressBar({ totalXP, showDetails = true, compact = false }: LevelProgressBarProps) {
  const progress = getXPProgress(totalXP);
  const rank = getRankForLevel(progress.level);
  const isMaxLevel = progress.level >= 99;

  const tierColors: Record<string, { gradient: string; border: string; glow: string; text: string }> = {
    Bronze: {
      gradient: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20',
      text: 'text-amber-500',
    },
    Silver: {
      gradient: 'from-slate-400/20 via-gray-300/10 to-slate-500/20',
      border: 'border-slate-400/30',
      glow: 'shadow-slate-400/20',
      text: 'text-slate-400',
    },
    Gold: {
      gradient: 'from-yellow-400/20 via-amber-300/10 to-yellow-500/20',
      border: 'border-yellow-400/30',
      glow: 'shadow-yellow-400/20',
      text: 'text-yellow-400',
    },
    Platinum: {
      gradient: 'from-cyan-400/20 via-blue-300/10 to-cyan-500/20',
      border: 'border-cyan-400/30',
      glow: 'shadow-cyan-400/20',
      text: 'text-cyan-400',
    },
    Diamond: {
      gradient: 'from-purple-400/20 via-pink-300/10 to-purple-500/20',
      border: 'border-purple-400/30',
      glow: 'shadow-purple-400/20',
      text: 'text-purple-400',
    },
    Transcendent: {
      gradient: 'from-pink-400/20 via-rose-300/10 to-pink-500/20',
      border: 'border-pink-400/30',
      glow: 'shadow-pink-400/20',
      text: 'text-pink-400',
    },
  };

  const colors = tierColors[rank.tier] || tierColors.Bronze;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r ${colors.gradient} border ${colors.border}`}>
          <span className="text-sm font-bold">{rank.icon}</span>
          <span className="text-xs font-semibold">Lv.{progress.level}</span>
        </div>
        <div className="flex-1 min-w-[100px]">
          <Progress value={progress.progressPercent} className="h-1.5" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} ${colors.glow} shadow-lg transition-all duration-300 hover:shadow-xl hover:${colors.glow}`}>
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="relative p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} flex items-center justify-center shadow-lg`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <span className="text-2xl sm:text-3xl">{rank.icon}</span>
              </motion.div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg sm:text-xl font-bold ${colors.text}`}>
                    Level {progress.level}
                  </h3>
                  {isMaxLevel && (
                    <motion.span
                      className="text-xs px-2 py-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full font-semibold text-pink-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                    >
                      MAX
                    </motion.span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {rank.name} • {rank.tier} Tier
                </p>
              </div>
            </div>

            {showDetails && (
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Zap className={`h-4 w-4 ${colors.text}`} />
                  <span className={`text-xl sm:text-2xl font-bold ${colors.text}`}>
                    {formatXP(progress.totalXP)}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  Total XP
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium">
                {isMaxLevel ? 'Max Level Reached!' : `${formatXP(progress.currentLevelXP)} / ${formatXP(progress.xpNeededForNextLevel)} XP`}
              </span>
              {!isMaxLevel && (
                <span className={`font-semibold ${colors.text} flex items-center gap-1`}>
                  <TrendingUp className="h-3 w-3" />
                  {formatXP(progress.xpToNextLevel)} to go
                </span>
              )}
            </div>
            
            <div className="relative">
              <Progress 
                value={progress.progressPercent} 
                className="h-3 sm:h-4 bg-background/50" 
              />
              
              {/* XP particles effect on hover */}
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {Math.round(progress.progressPercent)}% Complete
              </span>
              {!isMaxLevel && (
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  Next: Level {progress.level + 1}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
