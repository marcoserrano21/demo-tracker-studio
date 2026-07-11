
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import type { Advisor } from '@/lib/types';

interface CopilotBannerProps {
  title: string;
  advisors: { name: string, avatarUrl: string | null }[];
  drives: number;
}

export default function CopilotBanner({ title, advisors, drives }: CopilotBannerProps) {
  return (
    <Card className="copilot-banner relative overflow-hidden">
      <div className="lines">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="line"></div>
        ))}
      </div>
      <CardHeader className="text-center relative z-10">
        <div className="mx-auto bg-primary-foreground/20 rounded-full p-3 w-fit">
          <Trophy className="w-8 h-8 text-yellow-300" />
        </div>
        <CardTitle className="dark:text-white text-black">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center relative z-10">
        <div className="flex justify-center items-center gap-4 flex-wrap">
          {advisors.map((advisor, index) => (
            <div key={`${advisor.name}-${index}`}>
              <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-primary-foreground/50">
                <AvatarImage src={advisor.avatarUrl ?? undefined} />
                <AvatarFallback className="text-2xl bg-primary-foreground text-primary">{advisor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <p className="text-2xl font-bold dark:text-white text-black">{advisor.name}</p>
            </div>
          ))}
        </div>
        <p className="text-lg mt-2 dark:text-white text-black">{drives} Completed Drives</p>
      </CardContent>
    </Card>
  );
}
