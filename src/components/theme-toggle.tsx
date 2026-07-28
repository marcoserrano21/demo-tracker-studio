"use client"

import * as React from "react"
import { Moon, Sun, Contrast } from "lucide-react"
import { useTheme } from "next-themes"
import { doc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { useFirebase, updateDocumentNonBlocking } from "@/firebase"
import { DDHUB_KEYS, getSessionItem, setSessionItem } from "@/lib/auth/session-keys"
import type { Advisor, ThemePreference } from "@/lib/types"
import { cn } from "@/lib/utils"

const THEMES = ['light', 'dark', 'high-contrast'] as const
type CycleTheme = (typeof THEMES)[number]

function isCycleTheme(value: string | undefined): value is CycleTheme {
  return !!value && (THEMES as readonly string[]).includes(value)
}

interface ThemeToggleProps {
  as?: React.ElementType
  children?: React.ReactNode
  storeCode?: string
  className?: string
}

export function ThemeToggle({
  as: Comp = Button,
  children,
  storeCode,
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { firestore } = useFirebase()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const persistTheme = (next: ThemePreference) => {
    const profileRaw = getSessionItem(DDHUB_KEYS.advisorProfile)
    if (profileRaw) {
      try {
        const advisor = JSON.parse(profileRaw) as Advisor
        const updated = { ...advisor, themePreference: next }
        setSessionItem(DDHUB_KEYS.advisorProfile, JSON.stringify(updated))
      } catch {
        /* ignore */
      }
    }

    if (!firestore || !storeCode || !profileRaw) return
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
    // Prefer explicit cycle theme; fall back to resolved (handles 'system' / hydration)
    const current: CycleTheme = isCycleTheme(theme)
      ? theme
      : isCycleTheme(resolvedTheme)
        ? resolvedTheme
        : 'dark'
    const idx = THEMES.indexOf(current)
    const next = THEMES[(idx + 1) % THEMES.length]
    setTheme(next)
    persistTheme(next)
  }

  const displayTheme: CycleTheme = isCycleTheme(theme)
    ? theme
    : isCycleTheme(resolvedTheme)
      ? resolvedTheme
      : 'dark'

  const icon =
    displayTheme === 'light' ? (
      <Sun className="h-4 w-4" />
    ) : displayTheme === 'high-contrast' ? (
      <Contrast className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    )

  return (
    <Comp
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn('shrink-0', className)}
      aria-label={`Theme: ${mounted ? displayTheme : 'dark'}. Click to cycle light, dark, high contrast.`}
    >
      {mounted ? icon : <Moon className="h-4 w-4" />}
      {children}
      <span className="sr-only">Toggle theme (light, dark, high contrast)</span>
    </Comp>
  )
}
