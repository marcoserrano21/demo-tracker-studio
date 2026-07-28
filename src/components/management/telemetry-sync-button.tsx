'use client';

import { useState } from 'react';
import type { Vehicle } from '@/lib/types';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Radio, MapPin } from 'lucide-react';

interface TelemetrySyncButtonProps {
  storeCode: string;
  vehicles: Vehicle[];
  onVehiclesUpdate?: (vehicles: Vehicle[]) => void;
}

type SyncResponse = {
  configured: boolean;
  message?: string;
  error?: string;
  results?: Array<{
    vin: string;
    batteryLevel?: number;
    latitude?: number;
    longitude?: number;
    fsdActive?: boolean;
    fetchedAt: number;
  }>;
};

export function TelemetrySyncButton({
  storeCode,
  vehicles,
  onVehiclesUpdate,
}: TelemetrySyncButtonProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastConfigured, setLastConfigured] = useState<boolean | null>(null);

  const handleSync = async () => {
    setLoading(true);
    try {
      const vins = vehicles.filter((v) => !v.sold && v.vin).map((v) => v.vin);
      const res = await fetch('/api/telemetry/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vins }),
      });
      const data = (await res.json()) as SyncResponse;
      setLastConfigured(data.configured);

      if (!data.configured) {
        toast({
          title: 'Live telemetry pending',
          description:
            data.message ||
            'Add TESLA_CLIENT_ID, TESLA_CLIENT_SECRET, and TESLA_REFRESH_TOKEN when Fleet API access is approved.',
        });
        return;
      }

      if (data.error) {
        toast({ variant: 'destructive', title: 'Sync failed', description: data.error });
        return;
      }

      const results = data.results ?? [];
      if (results.length === 0) {
        toast({
          title: 'No telemetry returned',
          description: 'Vehicles may be asleep or unpaired. Manual battery entry still works.',
        });
        return;
      }

      if (!firestore) return;

      const updated = vehicles.map((v) => {
        const match = results.find((r) => r.vin === v.vin);
        if (!match) return v;
        const patch: Partial<Vehicle> = {
          batterySource: 'fleet_api',
          telemetrySyncedAt: match.fetchedAt,
        };
        if (typeof match.batteryLevel === 'number') patch.batteryLevel = match.batteryLevel;
        if (typeof match.latitude === 'number') patch.latitude = match.latitude;
        if (typeof match.longitude === 'number') patch.longitude = match.longitude;
        if (typeof match.fsdActive === 'boolean') patch.fsdActiveTelemetry = match.fsdActive;
        if (typeof match.latitude === 'number' || typeof match.longitude === 'number') {
          patch.locationUpdatedAt = match.fetchedAt;
        }
        updateDocumentNonBlocking(doc(firestore, `stores/${storeCode}/vehicles/${v.id}`), {
          ...patch,
          telemetrySyncedAt: serverTimestamp(),
          locationUpdatedAt:
            match.latitude != null || match.longitude != null ? serverTimestamp() : undefined,
        });
        return { ...v, ...patch };
      });

      onVehiclesUpdate?.(updated);
      toast({
        title: 'Fleet telemetry synced',
        description: `Updated ${results.length} vehicle${results.length === 1 ? '' : 's'} from Fleet API.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Sync error',
        description: 'Could not reach telemetry endpoint.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Radio className="h-4 w-4 mr-2" />
        )}
        Sync fleet telemetry
      </Button>
      {lastConfigured === false && (
        <Badge variant="secondary" className="text-xs">
          Manual · Live pending
        </Badge>
      )}
      {lastConfigured === true && (
        <Badge variant="outline" className="text-xs gap-1">
          <MapPin className="h-3 w-3" />
          Fleet API ready
        </Badge>
      )}
    </div>
  );
}
