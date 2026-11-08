'use client';

import { useMemo } from 'react';
import { collection, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import type { DemoOutcomeRecord } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Handshake } from 'lucide-react';
import { format } from 'date-fns';

interface DemoOutcomesTabProps {
  storeCode: string;
}

function createdAtDate(record: DemoOutcomeRecord): Date {
  const v = record.createdAt;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

/** Lightweight CRM read-out - soft labels only, no customer PII. */
export function DemoOutcomesTab({ storeCode }: DemoOutcomesTabProps) {
  const { firestore } = useFirebase();

  const outcomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `stores/${storeCode}/demo_outcomes`),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
  }, [firestore, storeCode]);

  const { data: outcomes, isLoading } = useCollection<DemoOutcomeRecord>(outcomesQuery);

  const sorted = useMemo(
    () => [...(outcomes || [])].sort((a, b) => createdAtDate(b).getTime() - createdAtDate(a).getTime()),
    [outcomes],
  );

  const purchaseCount = sorted.filter((o) => o.customerPurchased).length;
  const fsdSubCount = sorted.filter((o) => o.fsdSubscribed).length;
  const fsdActCount = sorted.filter((o) => o.fsdActivated).length;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Handshake className="w-4 h-4 text-primary" />
          </div>
          Demo outcomes
        </CardTitle>
        <CardDescription className="mt-1.5 text-sm">
          Soft CRM hook from check-in - vehicle + advisor labels only. No customer names or contact info.
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{sorted.length} outcomes</Badge>
          <Badge variant="outline">{purchaseCount} purchases</Badge>
          <Badge variant="outline">{fsdSubCount} FSD-sub</Badge>
          <Badge variant="outline">{fsdActCount} FSD activated</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading outcomes…</p>
        ) : sorted.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Outcomes appear after a demo check-in marks purchase, FSD-sub, or FSD activated.
          </p>
        ) : (
          <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Label</TableHead>
                  <TableHead className="hidden sm:table-cell">Advisor</TableHead>
                  <TableHead>Signals</TableHead>
                  <TableHead className="hidden md:table-cell text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>{row.outcomeLabel}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{row.advisorName}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{row.advisorName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.customerPurchased && <Badge className="text-[10px]">Purchase</Badge>}
                        {row.fsdSubscribed && (
                          <Badge variant="secondary" className="text-[10px]">
                            FSD-sub
                          </Badge>
                        )}
                        {row.fsdActivated && (
                          <Badge variant="outline" className="text-[10px]">
                            FSD on
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground tabular-nums">
                      {format(createdAtDate(row), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
