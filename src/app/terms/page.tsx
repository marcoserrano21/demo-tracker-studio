
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="bg-background text-foreground min-h-screen py-12 md:py-24">
      <div className="absolute top-4 left-4">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to App
          </Link>
        </Button>
      </div>
      <div className="container mx-auto px-4 pt-12 md:pt-0">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <p>
              <strong>Last updated: {new Date().toLocaleDateString()}</strong>
            </p>

            <p className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-foreground">
              Demo Drive Hub is an independent portfolio project. It is not affiliated with or
              endorsed by any automotive manufacturer or retailer.
            </p>

            <p>
              By accessing Demo Drive Hub, you agree to these Terms of Service for demonstration
              and portfolio evaluation purposes.
            </p>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">1. Acceptable Use</h3>
              <p>You agree to use this Application only to explore and evaluate demo fleet management features. You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Use the Application for any unlawful purpose.</li>
                <li>Enter false or misleading data intentionally.</li>
                <li>Attempt to access stores or features without authorization.</li>
                <li>Tamper with or circumvent security features.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">2. Demo Data</h3>
              <p>
                This application may contain seeded demo data. Do not enter real customer PII. Data
                may be reset without notice in demo environments.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">3. Disclaimer</h3>
              <p>
                The Application is provided &quot;as is&quot; without warranties of any kind. The creator
                is not liable for indirect or consequential damages arising from use of this demo.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">4. Image Attribution</h3>
              <p>
                Vehicle imagery is sourced from Unsplash and similar royalty-free providers for
                portfolio demonstration. Achievement and avatar assets may use licensed stock
                graphics as noted in the project repository.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">5. Changes</h3>
              <p>We may update these terms at any time. Continued use constitutes acceptance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
