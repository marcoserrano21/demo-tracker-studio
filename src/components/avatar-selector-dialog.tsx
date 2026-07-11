
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import avatarData from '../../public/media/avatars.json';
import type { Advisor } from '@/lib/types';
import { useMemo } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { TooltipContent } from '@radix-ui/react-tooltip';

interface AvatarSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentAvatar: string | null;
  advisors: Advisor[];
  currentAdvisorId: string;
}

export function AvatarSelectorDialog({ isOpen, onClose, onSelect, currentAvatar, advisors, currentAdvisorId }: AvatarSelectorDialogProps) {
  
  const usedAvatars = useMemo(() => {
    return new Map(
      advisors
        .filter(adv => adv.id !== currentAdvisorId && adv.avatarUrl)
        .map(adv => [adv.avatarUrl, adv.name])
    );
  }, [advisors, currentAdvisorId]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
          <DialogDescription>
            Select a profile picture from the gallery below. Taken avatars are disabled.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <div className="grid grid-cols-3 gap-4">
            {avatarData.avatars.map((avatarUrl: string) => {
              const takenBy = usedAvatars.get(avatarUrl);
              const isTaken = !!takenBy;
              
              return (
                <TooltipProvider key={avatarUrl}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <div
                          className={cn(
                            'relative aspect-square rounded-full transition-all duration-200 group avatar-zoom-container',
                            isTaken 
                              ? 'cursor-not-allowed' 
                              : 'cursor-pointer ring-2 ring-transparent hover:ring-primary',
                            currentAvatar === avatarUrl && !isTaken && 'ring-primary ring-offset-2'
                          )}
                          onClick={() => !isTaken && onSelect(avatarUrl)}
                        >
                          <figure className={cn('h-full w-full', isTaken && 'avatar-grayscale')}>
                             <Image src={avatarUrl} alt="Avatar" layout="fill" objectFit="cover" />
                          </figure>
                          {isTaken && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                <Avatar className="h-8 w-8 border-2 border-white/50">
                                    <AvatarFallback className="text-xs bg-black/70 text-white">
                                        {getInitials(takenBy)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                          )}
                        </div>
                    </TooltipTrigger>
                    {isTaken && (
                      <TooltipContent>
                        <p>Taken by {takenBy}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
