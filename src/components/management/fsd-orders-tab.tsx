'use client';

import React, { useMemo, useState } from 'react';
import type { Advisor, FsdOrderRecord, FsdOrderSource } from '@/lib/types';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Pencil, Trash2, Sparkles } from 'lucide-react';
import { stripUndefined } from '@/lib/utils';
import { getFsdTakeRate } from '@/lib/fsd-analytics';

interface FsdOrdersTabProps {
  storeCode: string;
  advisors: Advisor[];
  fsdOrders: FsdOrderRecord[];
  currentAdvisorName: string;
}

const SOURCE_OPTIONS: { value: FsdOrderSource; label: string }[] = [
  { value: 'order_placement', label: 'Order placement' },
  { value: 'follow_up_call', label: 'Follow-up call' },
  { value: 'demo_checkin', label: 'Demo check-in' },
];

function sourceLabel(source: FsdOrderSource): string {
  return SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
}

function orderedAtDate(record: FsdOrderRecord): Date {
  const v = record.orderedAt;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

export function FsdOrdersTab({
  storeCode,
  advisors,
  fsdOrders,
  currentAdvisorName,
}: FsdOrdersTabProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FsdOrderRecord | null>(null);
  const [customerLabel, setCustomerLabel] = useState('');
  const [orderedAt, setOrderedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [fsdSubscribed, setFsdSubscribed] = useState(true);
  const [source, setSource] = useState<FsdOrderSource>('order_placement');
  const [advisorName, setAdvisorName] = useState('');
  const [notes, setNotes] = useState('');

  const takeRate = useMemo(() => getFsdTakeRate(fsdOrders), [fsdOrders]);

  const sorted = useMemo(
    () =>
      [...fsdOrders].sort(
        (a, b) => orderedAtDate(b).getTime() - orderedAtDate(a).getTime(),
      ),
    [fsdOrders],
  );

  const resetForm = () => {
    setEditing(null);
    setCustomerLabel('');
    setOrderedAt(new Date().toISOString().slice(0, 10));
    setFsdSubscribed(true);
    setSource('order_placement');
    setAdvisorName(currentAdvisorName || '');
    setNotes('');
  };

  const openCreate = () => {
    resetForm();
    setAdvisorName(currentAdvisorName || '');
    setDialogOpen(true);
  };

  const openEdit = (record: FsdOrderRecord) => {
    setEditing(record);
    setCustomerLabel(record.customerLabel);
    setOrderedAt(orderedAtDate(record).toISOString().slice(0, 10));
    setFsdSubscribed(record.fsdSubscribed);
    setSource(record.source);
    setAdvisorName(record.advisorName || '');
    setNotes(record.notes || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Not connected.' });
      return;
    }
    if (!customerLabel.trim()) {
      toast({ variant: 'destructive', title: 'Label required', description: 'Use initials or an order ref.' });
      return;
    }

    const advisor = advisors.find((a) => a.name === advisorName);
    const orderedDate = new Date(`${orderedAt}T12:00:00`);
    const payload = stripUndefined({
      storeId: storeCode,
      customerLabel: customerLabel.trim(),
      orderedAt: Timestamp.fromDate(orderedDate),
      fsdSubscribed,
      source,
      advisorId: advisor?.id,
      advisorName: advisorName || undefined,
      notes: notes.trim() || undefined,
      createdBy: currentAdvisorName || 'manager',
      ...(fsdSubscribed && source === 'follow_up_call' && editing && !editing.fsdSubscribed
        ? { convertedAt: serverTimestamp() }
        : {}),
      ...(editing ? {} : { createdAt: serverTimestamp() }),
    });

    if (editing) {
      updateDocumentNonBlocking(
        doc(firestore, `stores/${storeCode}/fsd_orders`, editing.id),
        payload,
      );
      toast({ title: 'Updated', description: 'FSD order record saved.' });
    } else {
      addDocumentNonBlocking(collection(firestore, `stores/${storeCode}/fsd_orders`), payload);
      toast({ title: 'Added', description: 'FSD order recorded for take-rate tracking.' });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (record: FsdOrderRecord) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, `stores/${storeCode}/fsd_orders`, record.id));
    toast({ title: 'Deleted', description: 'FSD order record removed.' });
  };

  const markConverted = (record: FsdOrderRecord) => {
    if (!firestore || record.fsdSubscribed) return;
    updateDocumentNonBlocking(doc(firestore, `stores/${storeCode}/fsd_orders`, record.id), {
      fsdSubscribed: true,
      convertedAt: serverTimestamp(),
      source: record.source === 'order_placement' ? 'follow_up_call' : record.source,
    });
    toast({ title: 'Converted', description: 'Marked as FSD subscribed from follow-up.' });
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              FSD Orders
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm">
              Track Full Self-Driving (Supervised) Monthly Subscription take rate — from order
              placement, follow-up calls, or demo check-in. Store take rate:{' '}
              <span className="font-medium text-foreground">{takeRate}%</span> ({fsdOrders.length}{' '}
              records)
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Customer / ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Advisor</TableHead>
                <TableHead>FSD</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No FSD order records yet. Add one from the order config checkbox or a follow-up
                    call list.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.customerLabel}</TableCell>
                    <TableCell>{orderedAtDate(record).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabel(record.source)}</Badge>
                    </TableCell>
                    <TableCell>{record.advisorName || '—'}</TableCell>
                    <TableCell>
                      {record.fsdSubscribed ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Subscribed</Badge>
                      ) : (
                        <Badge variant="secondary">Not subscribed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {!record.fsdSubscribed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => markConverted(record)}
                          >
                            Convert
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(record)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(record)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit FSD order' : 'Add FSD order'}</DialogTitle>
            <DialogDescription>
              Soft ops labels only — no real customer names, emails, or phones (keeps this PII-free).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fsd-label">Ops label / order ref (no PII)</Label>
              <Input
                id="fsd-label"
                value={customerLabel}
                onChange={(e) => setCustomerLabel(e.target.value)}
                placeholder="e.g. ORD-4821 · Model Y"
              />
              <p className="text-xs text-muted-foreground">
                Use an order ref or initials — never full name, email, or phone.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fsd-date">Order date</Label>
              <Input
                id="fsd-date"
                type="date"
                value={orderedAt}
                onChange={(e) => setOrderedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as FsdOrderSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Advisor</Label>
              <Select value={advisorName || '__none'} onValueChange={(v) => setAdvisorName(v === '__none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {advisors.map((a) => (
                    <SelectItem key={a.id} value={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="fsd-sub"
                checked={fsdSubscribed}
                onCheckedChange={(c) => setFsdSubscribed(c === true)}
              />
              <Label htmlFor="fsd-sub" className="font-normal cursor-pointer">
                FSD Monthly Subscription attached
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fsd-notes">Notes (optional)</Label>
              <Textarea
                id="fsd-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Call outcome, order config notes…"
                className="min-h-[72px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
