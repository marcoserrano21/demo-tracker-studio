"use client"

import * as React from "react"
import { Moon, Sun, Contrast } from "lucide-react"
import { useTheme } from "next-themes"
import { doc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { useFirebase, updateDocumentNonBlocking } from "@/firebase"
import { DDHUB_KEYS, getSessionItem } from "@/lib/auth/session-keys"
import type { Advisor, ThemePreference } from "@/lib/types"

const THEMES = ['light', 'dark', 'high-contrast'] as const;

interface ThemeToggleProps {
  as?: React.ElementType;
  children?: React.ReactNode;
  storeCode?: string;
}

export function ThemeToggle({ as: Comp = Button, children, storeCode }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const { firestore } = useFirebase()

  const persistTheme = (next: ThemePreference) => {
    const profileRaw = getSessionItem(DDHUB_KEYS.advisorProfile)
    if (!profileRaw || !firestore || !storeCode) return
    try {
      const advisor = JSON.parse(profileRaw) as Advisor
      if (!advisor?.id) return
      const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisor.id}`)
      updateDocumentNonBlocking(advisorRef, { themePreference: next })
    } catch {
      /* ignore */
    }
  }

  const toggleTheme = () => {
    const current = (theme as typeof THEMES[number]) || 'dark';
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
    persistTheme(next);
  }

  const icon =
    theme === 'light' ? (
      <Sun className="h-4 w-4" />
    ) : theme === 'high-contrast' ? (
      <Contrast className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    );

  return (
    <Comp variant="outline" size="icon" onClick={toggleTheme} className="shrink-0">
      {icon}
      {children}
      <span className="sr-only">Toggle theme (light, dark, high contrast)</span>
    </Comp>
  )
}
