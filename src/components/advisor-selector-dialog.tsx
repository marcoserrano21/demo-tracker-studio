
'use client';

import { useMemo, useState } from 'react';
import type { Advisor } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Users } from 'lucide-react';
import { EmptyState } from './empty-state';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { dedupeAdvisors, findAdvisorBySelectValue, getAdvisorSelectValue, resolveAdvisorId } from './drive-flow-sheet-ui';

interface AdvisorSelectorDialogProps {
  isOpen: boolean;
  advisors: Advisor[];
  onAdvisorSelect: (advisor: Advisor) => void;
  onBack: () => void;
  allowClose?: boolean;
  onClose?: () => void;
  isLoading?: boolean;
  storeCode?: string;
}

export default function AdvisorSelectorDialog({ isOpen, advisors, onAdvisorSelect, onBack, allowClose = false, onClose, isLoading = false, storeCode }: AdvisorSelectorDialogProps) {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const { toast } = useToast();
  
  const sortedAdvisors = useMemo(
    () => dedupeAdvisors(advisors).sort((a, b) => a.name.localeCompare(b.name)),
    [advisors],
  );

  const handleOpenChange = (open: boolean) => {
    if (!open && allowClose && onClose) {
      onClose();
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvisorId) {
      toast({ title: 'Error', description: 'Please select an advisor.', variant: 'destructive' });
      return;
    }
    const advisor = findAdvisorBySelectValue(advisors, selectedAdvisorId);
    if (advisor) {
      onAdvisorSelect(advisor);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton={!allowClose}>
        <DialogHeader>
          <DialogTitle>Select Your Name</DialogTitle>
          <DialogDescription>
            Please select your name to continue to the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-20 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading advisors...</p>
                </div>
            ) : advisors.length > 0 ? (
                 <Select value={selectedAdvisorId} onValueChange={setSelectedAdvisorId}>
                    <SelectTrigger id="advisor-select">
                        <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px] w-full">
                        {sortedAdvisors.map((adv, index) => (
                        <SelectItem key={getAdvisorSelectValue(adv, index)} value={getAdvisorSelectValue(adv, index)}>
                            {adv.name}
                        </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                </Select>
            ) : (
                <EmptyState
                  icon={Users}
                  title="No advisors in this store"
                  description="Ask a manager to add advisors in Management, or continue as Store Manager if you're setting up."
                  className="py-8"
                />
            )}
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-row-reverse sm:justify-start">
            <Button type="submit" disabled={!selectedAdvisorId || advisors.length === 0 || isLoading} className="w-full sm:w-auto">
              Continue
            </Button>
            <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto" disabled={isLoading}>
              Back to Store Selection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
