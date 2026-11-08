'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Vehicle, VehicleIssue } from '@/lib/types';
import { useFirebase } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { writeAuditLog } from '@/lib/audit-log';

interface FixAttentionDialogProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  storeCode: string;
  editorName: string;
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

/** Manager/moderator flow: resolve open issues and return vehicle to Available from Find/Fleet. */
export function FixAttentionDialog({
  vehicle,
  isOpen,
  onClose,
  storeCode,
  editorName,
  onVehicleUpdate,
}: FixAttentionDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [openIssues, setOpenIssues] = useState<VehicleIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !firestore) return;
    let cancelled = false;
    setNotes('');
    setLoadingIssues(true);

    (async () => {
      try {
        const issuesQuery = query(
          collection(firestore, `stores/${storeCode}/vehicles/${vehicle.id}/vehicle_issues`),
          where('status', '==', 'Open'),
        );
        const snap = await getDocs(issuesQuery);
        if (cancelled) return;
        setOpenIssues(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleIssue)),
        );
      } catch (error) {
        console.error('Failed to load vehicle issues:', error);
        if (!cancelled) setOpenIssues([]);
      } finally {
        if (!cancelled) setLoadingIssues(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, firestore, storeCode, vehicle.id]);

  const handleResolve = async () => {
    if (!firestore) return;
    const trimmed = notes.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Notes required',
        description: 'Add a short note on what was fixed.',
      });
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(firestore);
      const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicle.id}`);

      for (const issue of openIssues) {
        const issueRef = doc(
          firestore,
          `stores/${storeCode}/vehicles/${vehicle.id}/vehicle_issues/${issue.id}`,
        );
        batch.update(issueRef, {
          status: 'Resolved',
          resolutionDate: serverTimestamp(),
          resolutionNotes: trimmed,
        });
      }

      // No open issue docs - still clear attention with an audit trail issue
      if (openIssues.length === 0) {
        const issueRef = doc(
          collection(firestore, `stores/${storeCode}/vehicles/${vehicle.id}/vehicle_issues`),
        );
        batch.set(issueRef, {
          vehicleId: vehicle.id,
          storeId: storeCode,
          vehicleModel: vehicle.model,
          vehicleVin: vehicle.vin,
          description: 'Cleared Needs Attention from Find / Fleet.',
          dateReported: serverTimestamp(),
          status: 'Resolved',
          resolutionDate: serverTimestamp(),
          resolutionNotes: trimmed,
        });
      }

      batch.update(vehicleRef, { status: 'Available' });

      await writeAuditLog({
        firestore,
        storeId: storeCode,
        userName: editorName || 'Unknown',
        action: 'resolve_issue',
        targetId: vehicle.id,
        targetType: 'Vehicle',
        description: `Cleared Needs Attention on ${vehicle.model} (...${vehicle.vin.slice(-6)}): ${trimmed}`,
        changes: [
          { field: 'status', previous: 'Needs Attention', next: 'Available' },
          { field: 'resolutionNotes', previous: null, next: trimmed },
        ],
        batch,
      });

      await batch.commit();
      onVehicleUpdate({ id: vehicle.id, status: 'Available' });
      toast({
        title: 'Vehicle available',
        description: `${vehicle.model} (...${vehicle.vin.slice(-6)}) is back on the floor.`,
      });
      onClose();
    } catch (error: unknown) {
      console.error('Fix attention failed:', error);
      toast({
        variant: 'destructive',
        title: 'Could not clear attention',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" aria-hidden />
            Fix Needs Attention
          </DialogTitle>
          <DialogDescription>
            Resolve issues for {vehicle.model} (...{vehicle.vin.slice(-6)}) and return it to Available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadingIssues ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading open issues…
            </div>
          ) : openIssues.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Open issue{openIssues.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-2">
                {openIssues.map((issue) => (
                  <li key={issue.id} className="text-sm text-foreground">
                    {issue.description || 'Flagged for attention'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No open issue records found. You can still clear the flag and mark this vehicle Available.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="fix-attention-notes">What was fixed?</Label>
            <Textarea
              id="fix-attention-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Washed / detailed, tire pressure corrected, software update complete."
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleResolve} disabled={saving || !notes.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark Available
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
