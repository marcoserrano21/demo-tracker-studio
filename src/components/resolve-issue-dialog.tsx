
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { VehicleIssue } from '@/lib/types';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
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


interface ResolveIssueDialogProps {
  issue: VehicleIssue;
  isOpen: boolean;
  onClose: () => void;
  storeCode: string;
}

export function ResolveIssueDialog({ issue, isOpen, onClose, storeCode }: ResolveIssueDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const handleConfirm = async () => {
    if (!firestore) return;
    if (!resolutionNotes) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Resolution notes are required.',
      });
      return;
    }
    setIsPending(true);
    
    const issueRef = doc(firestore, `stores/${storeCode}/vehicles/${issue.vehicleId}/vehicle_issues/${issue.id}`);
    updateDocumentNonBlocking(issueRef, {
        status: 'Resolved',
        resolutionDate: serverTimestamp(),
        resolutionNotes: resolutionNotes,
    });

    const issuesQuery = query(collection(firestore, `stores/${storeCode}/vehicles/${issue.vehicleId}/vehicle_issues`), where('status', '==', 'Open'));
    const issuesSnap = await getDocs(issuesQuery);
    
    const openIssues = issuesSnap.docs.filter(d => d.id !== issue.id);

    if (openIssues.length === 0) {
        const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${issue.vehicleId}`);
        updateDocumentNonBlocking(vehicleRef, { status: 'Available' });
    }

    toast({
        title: 'Success',
        description: 'Vehicle issue has been resolved.',
    });
    setIsPending(false);
    onClose();
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Resolution notes are required.',
      });
      return;
    }
    handleConfirm();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Vehicle Issue</DialogTitle>
            <DialogDescription>
              Enter notes for resolving the issue with the {issue.vehicleModel} (...{issue.vehicleVin.slice(-6)}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <p className="text-sm">
                  <span className="font-semibold">Issue:</span> {issue.description}
              </p>
              <div className="space-y-2">
                <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                <Textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g., Replaced tire, detailed interior, performed software update."
                  required
                />
              </div>
            </div>
            <DialogFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" disabled={isPending || !resolutionNotes}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Resolved
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to resolve this issue? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirm}>
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
