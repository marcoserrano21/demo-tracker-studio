'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import {
  getStoreSettingsClient,
  updateStoreSettingsClient,
} from '@/lib/store-settings-client';
import { DEFAULT_STORE_SETTINGS } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Manager/Moderator store setting - land on Morning Brief after elevate. */
export function MorningBriefLandingSetting({
  storeCode,
  className,
}: {
  storeCode: string;
  className?: string;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(DEFAULT_STORE_SETTINGS.landOnMorningBrief === true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    void getStoreSettingsClient(firestore, storeCode).then((data) => {
      if (!cancelled) {
        setEnabled(data.landOnMorningBrief === true);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firestore, storeCode]);

  const onChange = async (checked: boolean) => {
    if (!firestore) return;
    setSaving(true);
    try {
      await updateStoreSettingsClient(firestore, storeCode, { landOnMorningBrief: checked });
      setEnabled(checked);
      toast({ title: 'Store settings saved' });
    } catch {
      toast({
        title: 'Could not save',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-border/40 p-4', className)}>
      <div className="space-y-1">
        <Label htmlFor="land-on-morning-brief-settings" className="text-base font-medium">
          Land on Morning Brief after Manager Access
        </Label>
        <p className="text-sm text-muted-foreground">
          When enabled, elevating to Manager/Moderator opens Analytics (Morning Brief) instead of staying on the current tab.
        </p>
      </div>
      <Switch
        id="land-on-morning-brief-settings"
        checked={enabled}
        disabled={!ready || saving}
        onCheckedChange={(checked) => void onChange(checked)}
      />
    </div>
  );
}
