

'use client';

import React, { useState, useEffect } from 'react';
import type { Advisor, DefaultTab, FontSizePreference, ThemePreference, SortKey, FleetView, CardHoverEffect, ButtonHoverEffect, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Camera, Palette, Text, Contrast, Sun, Moon, Download, RefreshCw, Loader2, ArrowDownUp, View, List, LayoutGrid, LayoutList, RectangleHorizontal, Accessibility } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AvatarSelectorDialog } from './avatar-selector-dialog';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { applyReduceMotion } from '@/lib/motion-preference';
import { isElevatedUserRole } from '@/lib/demo-users';
import { MorningBriefLandingSetting } from './morning-brief-landing-setting';


interface SettingsPageProps {
  advisor: Advisor;
  storeCode: string;
  advisors: Advisor[];
  userRole?: UserRole;
}

const OVERDUE_PALETTE = [
  '#ef4444', '#001219', '#005f73', '#0a9396', '#94d2bd', 
  '#e9d8a6', '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226'
];

export default function SettingsPage({ advisor, storeCode, advisors, userRole }: SettingsPageProps) {
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [isAvatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const { firestore } = useFirebase();

  const handlePreferenceChange = (key: string, value: any) => {
    if (firestore) {
        const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisor.id}`);
        updateDocumentNonBlocking(advisorRef, { [key]: value });
    }
  }

  const handleAvatarSelect = (url: string) => {
    handlePreferenceChange('avatarUrl', url);
    setAvatarDialogOpen(false);
  };
  
  const handleThemeChange = (theme: ThemePreference) => {
      setTheme(theme);
      handlePreferenceChange('themePreference', theme);
  };
  
  const handleFontSizeChange = (size: FontSizePreference) => {
      document.documentElement.style.fontSize = 
          size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px';
      handlePreferenceChange('fontSize', size);
  };

  const handleOverdueColorChange = (color: string) => {
      document.documentElement.style.setProperty('--overdue-glow-color', color);
      handlePreferenceChange('overdueGlowColor', color);
  };

  const handleReduceMotionChange = (enabled: boolean) => {
    applyReduceMotion(enabled);
    handlePreferenceChange('reduceMotion', enabled);
  };

  useEffect(() => {
    if (advisor.overdueGlowColor) {
      document.documentElement.style.setProperty('--overdue-glow-color', advisor.overdueGlowColor);
    }
  }, [advisor.overdueGlowColor]);


  const handleResetPreferences = () => {
    if (firestore) {
      const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisor.id}`);
      updateDocumentNonBlocking(advisorRef, {
        themePreference: 'dark',
        fontSize: 'base',
        defaultTab: 'fleet',
        fleetView: 'grid',
        compactHistoryView: false,
        defaultSortOrder: 'model',
        cardHoverEffect: 'holographic',
        buttonHoverEffect: 'default',
        reduceMotion: false,
        overdueGlowColor: '#ef4444', // Reset to default red
      });
      // Also apply them immediately
      setTheme('dark');
      document.documentElement.style.fontSize = '16px';
      document.documentElement.style.setProperty('--overdue-glow-color', '#ef4444');
      applyReduceMotion(false);
      toast({ title: "Preferences Reset", description: "Your settings have been restored to default." });
    }
  };


  return (
    <>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 cursor-pointer" onClick={() => setAvatarDialogOpen(true)}>
                  <AvatarImage src={advisor.avatarUrl ?? undefined} alt={advisor.name} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{advisor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer" onClick={() => setAvatarDialogOpen(true)}>
                    <Camera className="h-6 w-6 text-white mb-1" />
                    <span className="text-white text-[10px] font-medium leading-tight text-center px-1">Change photo</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold">{advisor.name}</p>
                <p className="text-sm text-muted-foreground">{advisor.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isElevatedUserRole(userRole) && (
          <Card>
            <CardHeader>
              <CardTitle>Manager preferences</CardTitle>
              <CardDescription>
                Store-level options visible after Manager Access. Affects all elevated sessions in this store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MorningBriefLandingSetting storeCode={storeCode} />
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Interface Preferences</CardTitle>
                <CardDescription>Customize your user experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="default-tab">Default Landing Page</Label>
                     <Select 
                        value={advisor.defaultTab || 'fleet'}
                        onValueChange={(value: DefaultTab) => handlePreferenceChange('defaultTab', value)}
                     >
                        <SelectTrigger id="default-tab" className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a default tab" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fleet">Find (Floor Mode)</SelectItem>
                            <SelectItem value="schedule">Start (Schedule)</SelectItem>
                            <SelectItem value="finish">Finish</SelectItem>
                            <SelectItem value="my-hub">My Hub</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="default-sort">Default Fleet Sort Order</Label>
                     <Select 
                        value={advisor.defaultSortOrder || 'model'}
                        onValueChange={(value: SortKey) => handlePreferenceChange('defaultSortOrder', value)}
                     >
                        <SelectTrigger id="default-sort" className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a default sort order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="model"><div className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> By Model</div></SelectItem>
                            <SelectItem value="battery-desc"><div className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> By Battery (High to Low)</div></SelectItem>
                            <SelectItem value="battery-asc"><div className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> By Battery (Low to High)</div></SelectItem>
                            <SelectItem value="date-added"><div className="flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> By Date Added</div></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="fleet-view">Default Fleet View</Label>
                     <Select 
                        value={advisor.fleetView || 'grid'}
                        onValueChange={(value: FleetView) => handlePreferenceChange('fleetView', value)}
                     >
                        <SelectTrigger id="fleet-view" className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a fleet view" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grid"><div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Grid</div></SelectItem>
                            <SelectItem value="compact"><div className="flex items-center gap-2"><View className="w-4 h-4" /> Compact</div></SelectItem>
                            <SelectItem value="list"><div className="flex items-center gap-2"><LayoutList className="w-4 h-4" /> List</div></SelectItem>
                            <SelectItem value="carousel"><div className="flex items-center gap-2"><RectangleHorizontal className="w-4 h-4" /> Carousel</div></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="compact-history-view"
                        checked={advisor.compactHistoryView}
                        onCheckedChange={(checked) => handlePreferenceChange('compactHistoryView', checked)}
                    />
                    <Label htmlFor="compact-history-view" className="flex items-center gap-2">
                        <View className="w-4 h-4" />
                        Enable Compact View for History
                    </Label>
                </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
            <CardDescription>Control motion and animation across the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="reduce-motion"
                checked={advisor.reduceMotion === true}
                onCheckedChange={handleReduceMotionChange}
              />
              <Label htmlFor="reduce-motion" className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  Reduce Motion
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Turns off hover effects, sidebar animations, sheet transitions, and chart motion.
                </span>
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label>Theme</Label>
                 <Select
                    value={advisor.themePreference || 'dark'}
                    onValueChange={(value: ThemePreference) => handleThemeChange(value)}
                >
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-5 h-5" /> Light</div></SelectItem>
                        <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-5 h-5" /> Dark</div></SelectItem>
                        <SelectItem value="high-contrast"><div className="flex items-center gap-2"><Contrast className="w-5 h-5" /> High Contrast</div></SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Font Size</Label>
                 <Select
                    value={advisor.fontSize || 'base'}
                    onValueChange={(value: FontSizePreference) => handleFontSizeChange(value)}
                >
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select a font size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sm"><div className="flex items-center gap-2"><Text className="w-4 h-4" /> Small</div></SelectItem>
                        <SelectItem value="base"><div className="flex items-center gap-2"><Text className="w-5 h-5" /> Normal</div></SelectItem>
                        <SelectItem value="lg"><div className="flex items-center gap-2"><Text className="w-6 h-6" /> Large</div></SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Card Hover Effect (Desktop)</Label>
                 <Select
                    value={advisor.cardHoverEffect || 'holographic'}
                    onValueChange={(value: CardHoverEffect) => handlePreferenceChange('cardHoverEffect', value)}
                >
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select a hover effect" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="holographic">Holographic</SelectItem>
                        <SelectItem value="blur">Blur</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Checkout Button Effect</Label>
                 <Select
                    value={advisor.buttonHoverEffect || 'default'}
                    onValueChange={(value: ButtonHoverEffect) => handlePreferenceChange('buttonHoverEffect', value)}
                >
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Select a button effect" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="arrow">Arrow Animation</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Overdue Glow Color</Label>
                <div className="flex flex-wrap items-center gap-2">
                    {OVERDUE_PALETTE.map(color => (
                        <Button
                            key={color}
                            variant="outline"
                            className={cn(
                                "h-8 w-8 rounded-full p-0 border-2",
                                advisor.overdueGlowColor === color ? 'border-primary' : 'border-transparent'
                            )}
                            onClick={() => handleOverdueColorChange(color)}
                        >
                            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
                        </Button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset All My Preferences
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will reset your theme, font size, and default landing page to the application defaults. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetPreferences}>
                                Yes, Reset Preferences
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
      <AvatarSelectorDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={advisor.avatarUrl || null}
        advisors={advisors}
        currentAdvisorId={advisor.id}
      />
    </>
  );
}
