
'use client';

import React from 'react';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';

interface TopNavProps {
  isManagerMode: boolean;
  toggleManagerMode: () => void;
}

export default function TopNav({ isManagerMode, toggleManagerMode }: TopNavProps) {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center">
        {/* Logo or other left-side content */}
        <span className="text-lg font-bold">Demo Drive Hub</span>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {/* Manager access button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleManagerMode}
          className="hidden md:flex"
        >
          {isManagerMode ? "Exit Manager Mode" : "Manager Access"}
        </Button>
        
        {/* Theme toggle button */}
        <ThemeToggle />
      </div>
    </nav>
  );
}
