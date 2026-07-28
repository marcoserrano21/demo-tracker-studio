
'use client';

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
import { verifyManagerAccess } from '@/app/auth/actions';
import type { Advisor } from '@/lib/types';

interface ManagerAuthDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: () => void;
  storeCode: string;
  currentAdvisor: Advisor;
}

export default function ManagerAuthDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  currentAdvisor,
}: ManagerAuthDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword('');
      setError('');
    }
    setIsOpen(open);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await verifyManagerAccess(
      password,
      currentAdvisor.email,
      currentAdvisor.name
    );

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Manager access granted.',
      });
      onSuccess();
      setIsOpen(false);
    } else {
      setError(result.error ?? 'Incorrect password.');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: result.error ?? 'Incorrect password.',
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manager Authentication</DialogTitle>
          <DialogDescription>
            Enter the manager password to gain elevated access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manager-password">Password</Label>
              <Input
                id="manager-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={error ? 'manager-password-error' : undefined}
                aria-invalid={!!error}
                required
                autoComplete="current-password"
              />
              {error && (
                <p id="manager-password-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Verifying...' : 'Grant Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
