
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { regions as allRegions, loginStores as allStores } from '@/lib/data';
import { isHideStorePasswordLogin } from '@/lib/local-demo/config';
import { Input } from './ui/input';
import { verifyStoreAccess, tryDemoStoreAccess } from '@/app/auth/actions';
import { invokeServerAction } from '@/lib/server-action-client';
import { DDHUB_KEYS, setSessionItem, removeSessionItem } from '@/lib/auth/session-keys';
import { HubLogo, PRODUCT_SUBTITLE } from './hub-logo';
import { Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StoreSelectorProps {
  onStoreSelect: (storeCode: string, options?: { demo?: boolean }) => void;
}

export default function StoreSelector({ onStoreSelect }: StoreSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showStoreLogin, setShowStoreLogin] = useState(false);
  const { toast } = useToast();
  const hideStoreLogin = isHideStorePasswordLogin();

  const filteredStores = useMemo(() => {
    if (!selectedRegion) return [];
    return allStores.filter((store) => store.region === selectedRegion);
  }, [selectedRegion]);

  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setSelectedStore('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) {
      toast({ title: 'Error', description: 'Please select a store.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await invokeServerAction(() =>
        verifyStoreAccess(selectedStore, password)
      );
      if (result.success) {
        removeSessionItem(DDHUB_KEYS.demoMode);
        onStoreSelect(selectedStore);
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'Incorrect password for this store.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not reach the server. Refresh the page and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryDemo = async () => {
    setIsDemoLoading(true);
    try {
      const result = await invokeServerAction(tryDemoStoreAccess);
      if (result.success && result.storeCode) {
        setSessionItem(DDHUB_KEYS.demoMode, 'true');
        toast({ title: 'Demo ready', description: 'Pick an advisor, then tap Start on an available vehicle in Floor Mode.' });
        onStoreSelect(result.storeCode, { demo: true });
      } else {
        toast({
          title: 'Demo unavailable',
          description: result.error ?? 'Could not start demo session.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not reach the server. Refresh the page and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <HubLogo expanded showSubtitle className="mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Demo Drive Hub
        </h1>
        <p className="mt-2 text-base font-medium text-primary sm:text-lg">
          {PRODUCT_SUBTITLE}
        </p>
        <p className="mt-3 max-w-md text-muted-foreground">
          Find a car. Start the demo. Finish with FSD logged in seconds, not minutes.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Discontinued independent pilot by Marco Serrano. Sample data only. Not a Tesla product.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border/60 px-2.5 py-1">Next.js 16</span>
          <span className="rounded-full border border-border/60 px-2.5 py-1">147 drives (pilot obs.)</span>
          <span className="rounded-full border border-border/60 px-2.5 py-1">15 advisors / 2 wk</span>
          <span className="rounded-full border border-border/60 px-2.5 py-1">57 min avg drive</span>
        </div>
      </div>

      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Get started</CardTitle>
          <CardDescription>
          One tap opens the isolated demo-hub store with sample advisors, vehicles, and drive history. No live showroom data.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="h-14 w-full rounded-xl text-base font-semibold"
            onClick={handleTryDemo}
            disabled={isDemoLoading || isSubmitting}
          >
            {isDemoLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            Try Demo Store
          </Button>

          {!hideStoreLogin && (
          <Collapsible open={showStoreLogin} onOpenChange={setShowStoreLogin}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between rounded-xl">
                Store password login
                <ChevronDown className={`h-4 w-4 transition-transform ${showStoreLogin ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region-select">Region</Label>
              <Select value={selectedRegion} onValueChange={handleRegionChange}>
                <SelectTrigger id="region-select">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(allRegions).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-select">Store Location</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={!selectedRegion}>
                <SelectTrigger id="store-select">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStores.map((store) => (
                    <SelectItem key={store.code} value={store.code}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-password">Store Password</Label>
              <Input
                id="store-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!selectedStore}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={!selectedStore || !password || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enter Store
            </Button>
          </form>
            </CollapsibleContent>
          </Collapsible>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
              About this project
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
