'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Star, AlertCircle } from 'lucide-react';
import { getRankForLevel } from '@/lib/xp-system';

interface XPGainToastProps {
  xpGained: number;
  bonuses?: Array<{ reason: string; amount: number }>;
  newLevel?: number;
  onMyHubPage?: boolean;
}

// Using a simple custom toast system since sonner is not installed
let toastContainer: HTMLDivElement | null = null;

function getToastContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'xp-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showXPGainToast({ xpGained, bonuses, newLevel, onMyHubPage = false }: XPGainToastProps) {
  // Only show on My Hub page or if it's a level up
  if (!onMyHubPage && !newLevel) return;

  const rank = newLevel ? getRankForLevel(newLevel) : null;
  const duration = newLevel ? 6000 : 4500;
  
  // Create toast element
  const toastElement = document.createElement('div');
  toastElement.style.cssText = 'pointer-events: auto;';
  
  // Use simple innerHTML since we can't use React.render here
  // This is a simplified version - in production you'd want to use createRoot
  const container = getToastContainer();
  container.appendChild(toastElement);
  
  // Simple fade in/out animation
  toastElement.style.opacity = '0';
  toastElement.style.transform = 'translateY(20px)';
  toastElement.style.transition = 'all 0.3s ease-out';
  
  setTimeout(() => {
    toastElement.style.opacity = '1';
    toastElement.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto dismiss
  setTimeout(() => {
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      container.removeChild(toastElement);
    }, 300);
  }, duration);
  
  // For now, we'll use console.log as a fallback notification
  // The actual toast rendering would need a proper React portal
  console.log(`XP Gained: +${xpGained}${newLevel ? ` - Level Up to ${newLevel}!` : ''}`);
}

// Level Up Celebration Modal
interface LevelUpModalProps {
  level: number;
  xpGained: number;
  onClose: () => void;
}

export function LevelUpModal({ level, xpGained, onClose }: LevelUpModalProps) {
  const rank = getRankForLevel(level);

  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-purple-500/30 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/30 backdrop-blur-xl">
          {/* Animated background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          
          <div className="relative p-8 text-center">
            {/* Icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 border-4 border-purple-400/60 flex items-center justify-center shadow-2xl"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <span className="text-6xl">{rank.icon}</span>
            </motion.div>
            
            {/* Title */}
            <motion.h2
              className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent"
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              LEVEL UP!
            </motion.h2>
            
            <motion.p
              className="text-2xl font-bold text-purple-200 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Level {level}
            </motion.p>
            
            {/* Rank Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400/40 mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <TrendingUp className="h-5 w-5 text-purple-300" />
              <span className="text-lg font-bold text-purple-200">
                {rank.name} • {rank.tier} Tier
              </span>
            </motion.div>
            
            {/* XP Gained */}
            <motion.div
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Zap className="h-6 w-6 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold text-yellow-300">
                +{xpGained.toLocaleString()} XP
              </span>
            </motion.div>
            
            {/* Close hint */}
            <motion.p
              className="mt-6 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Click anywhere to continue
            </motion.p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
