

'use client';

import React, { useState, useMemo } from 'react';
import type { Advisor, ManualAward } from '@/lib/types';
import { achievements } from '@/lib/achievements';
import { useFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Award, Loader2, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
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
import { AchievementIcon } from './achievement-icon';
import { dedupeAdvisors, findAdvisorBySelectValue, getAdvisorSelectValue } from './drive-flow-sheet-ui';

interface AwardsTabProps {
  advisors: Advisor[];
  storeCode: string;
  manualAwards: ManualAward[];
  currentAdvisor: Advisor;
}

const ITEMS_PER_PAGE = 8;

export default function AwardsTab({ advisors, storeCode, manualAwards, currentAdvisor }: AwardsTabProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [selectedAchievementId, setSelectedAchievementId] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardToDelete, setAwardToDelete] = useState<ManualAward | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedAdvisors = useMemo(() => {
    return dedupeAdvisors(advisors).sort((a, b) => a.name.localeCompare(b.name));
  }, [advisors]);

  const sortedManualAwards = useMemo(() => {
    if (!manualAwards) return [];
    return [...manualAwards].sort((a, b) => {
        const timeA = a.awardedAt?.toDate ? a.awardedAt.toDate().getTime() : 0;
        const timeB = b.awardedAt?.toDate ? b.awardedAt.toDate().getTime() : 0;
        return timeB - timeA;
    });
  }, [manualAwards]);
  
  const totalPages = Math.ceil(sortedManualAwards.length / ITEMS_PER_PAGE);
  const paginatedAwards = sortedManualAwards.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isSuperAdmin = currentAdvisor.name === 'Marco Serrano' || currentAdvisor.email === 'serranoma@tesla.com';

  const handleAwardBadge = async () => {
    if (!firestore || !selectedAdvisorId || !selectedAchievementId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an advisor and an achievement.',
      });
      return;
    }
    setIsAwarding(true);

    const advisor = findAdvisorBySelectValue(advisors, selectedAdvisorId);
    const achievement = achievements.find(a => a.id === selectedAchievementId);

    if (!advisor || !achievement) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find selected advisor or achievement.' });
        setIsAwarding(false);
        return;
    }
    
    const awardsColRef = collection(firestore, `stores/${storeCode}/manual_awards`);
    const newAwardData = {
        storeId: storeCode,
        advisorId: advisor.id,
        advisorName: advisor.name,
        achievementId: selectedAchievementId,
        achievementTitle: achievement.title,
        awardedBy: currentAdvisor.name,
        awardedAt: serverTimestamp(),
    };

    try {
        await addDoc(awardsColRef, newAwardData);
        toast({
            title: 'Badge Awarded!',
            description: `Successfully awarded "${achievement.title}" to ${advisor.name}.`,
        });
        setSelectedAdvisorId('');
        setSelectedAchievementId('');
    } catch (error) {
        console.error("Error awarding badge: ", error)
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: "You do not have permission to award badges."
        })
    } finally {
        setIsAwarding(false);
    }
  };

  const handleDeleteAward = (awardId: string) => {
    if (!firestore) return;
    const awardRef = doc(firestore, `stores/${storeCode}/manual_awards/${awardId}`);
    deleteDocumentNonBlocking(awardRef);
    setAwardToDelete(null);
    toast({ title: 'Success', description: 'Manual award has been revoked.' });
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Award a Badge</CardTitle>
              <CardDescription>Manually grant an achievement to an advisor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label>Select Advisor</label>
                <Select value={selectedAdvisorId} onValueChange={setSelectedAdvisorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an advisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedAdvisors.map((adv, index) => (
                      <SelectItem key={getAdvisorSelectValue(adv, index)} value={getAdvisorSelectValue(adv, index)}>{adv.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label>Select Achievement</label>
                <Select value={selectedAchievementId} onValueChange={setSelectedAchievementId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a badge..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-72">
                      {achievements.map(ach => (
                          <SelectItem key={ach.id} value={ach.id}>
                            <div className="flex items-center gap-2">
                                <AchievementIcon src={ach.iconUrl} alt={ach.title} width={20} height={20} />
                                <span>{ach.title}</span>
                            </div>
                          </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAwardBadge} disabled={!selectedAdvisorId || !selectedAchievementId || isAwarding} className="w-full">
                {isAwarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                {isAwarding ? 'Awarding...' : 'Award Badge'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Manual Awards Log</CardTitle>
              <CardDescription>A record of all manually granted achievements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Advisor</TableHead>
                      <TableHead>Achievement</TableHead>
                      <TableHead>Date</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAwards.length > 0 ? (
                      paginatedAwards.map(award => (
                        <TableRow key={award.id}>
                          <TableCell>{award.advisorName}</TableCell>
                          <TableCell>{award.achievementTitle}</TableCell>
                          <TableCell>{award.awardedAt?.toDate ? format(award.awardedAt.toDate(), 'MMM d, yyyy') : 'Just now'}</TableCell>
                          {isSuperAdmin && (
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently revoke the "{award.achievementTitle}" badge from {award.advisorName}. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteAward(award.id)}>Delete Award</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 4 : 3} className="text-center h-24">
                          No badges have been manually awarded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
