'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import {
  getStoreSettingsClient,
  updateStoreSettingsClient,
} from '@/lib/store-settings-client';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/types';

export function StoreOperationsSettings({ storeCode }: { storeCode: string }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    let cancelled = false;
    void getStoreSettingsClient(firestore, storeCode).then((data) => {
      if (!cancelled) {
        setSettings(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firestore, storeCode]);

  const save = async (patch: Partial<StoreSettings>) => {
    if (!firestore) return;

    setIsSaving(true);
    const next = { ...settings, ...patch };
    try {
      await updateStoreSettingsClient(firestore, storeCode, patch);
      setSettings(next);
      toast({ title: 'Store settings saved' });
    } catch {
      toast({
        title: 'Could not save settings',
        description: 'Firestore write failed.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading store operations…
      </div>
    );
  }

  return (
    <Card className="border-border/40 md:col-span-2">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Auto check-in policy
        </CardTitle>
        <CardDescription>
          Optional automatic check-in for overdue demos. Off by default — managers enable per store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="auto-checkin-enabled" className="text-base font-medium">
              Enable automatic check-in
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, overdue vehicles are checked in automatically after the threshold.
            </p>
          </div>
          <Switch
            id="auto-checkin-enabled"
            checked={settings.autoCheckInEnabled}
            disabled={isSaving}
            onCheckedChange={(checked) => void save({ autoCheckInEnabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auto-checkin-threshold">Overdue threshold (minutes)</Label>
          <div className="flex max-w-xs gap-2">
            <Input
              id="auto-checkin-threshold"
              type="number"
              min={15}
              max={180}
              value={settings.autoCheckInThresholdMinutes}
              disabled={isSaving || !settings.autoCheckInEnabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  autoCheckInThresholdMinutes: Number(e.target.value) || 30,
                }))
              }
            />
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || !settings.autoCheckInEnabled}
              onClick={() =>
                void save({ autoCheckInThresholdMinutes: settings.autoCheckInThresholdMinutes })
              }
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
