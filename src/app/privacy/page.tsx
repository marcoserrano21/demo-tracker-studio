
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, Github, Linkedin, Play } from 'lucide-react';
import Link from 'next/link';
import { HubLogo } from '@/components/hub-logo';

export default function PrivacyPolicyPage() {
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
            <CardTitle className="text-3xl md:text-4xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <p>
              <strong>Last updated: {new Date().toLocaleDateString()}</strong>
            </p>

            <p className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-foreground">
              Demo Drive Hub is an independent portfolio project by Marco Serrano. It is not
              affiliated with or endorsed by any automotive manufacturer.
            </p>

            <p>
              This Privacy Policy describes how Demo Drive Hub (&quot;Application&quot;, &quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, and discloses information when you use this
              demo application.
            </p>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">1. Information We Collect</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>
                  <strong>User Information:</strong> Name and role (Advisor or Manager) as entered
                  or selected in the app.
                </li>
                <li>
                  <strong>Vehicle &amp; Drive Data:</strong> VIN, model, status, battery level, drive
                  logs, feedback, and ratings entered during check-in/check-out.
                </li>
                <li>
                  <strong>Usage Data:</strong> Anonymous Firebase authentication identifiers and
                  basic session data required to operate the app.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>To manage and track demo vehicle fleet status in real time.</li>
                <li>To facilitate digital check-in and check-out workflows.</li>
                <li>To generate analytics on fleet utilization and advisor performance.</li>
                <li>To flag potential maintenance issues via keyword detection in feedback.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">2a. Analytics</h3>
              <p>
                We use privacy-friendly, cookieless page analytics (Vercel Analytics) to understand
                aggregate traffic to this portfolio demo. No personal information is sold or shared for
                advertising.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">3. Data Sharing</h3>
              <p>
                We do not sell personal information. Data is stored in Google Firebase (Firestore)
                and is accessible only within the scope of the store session you authenticate to.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">4. Data Security</h3>
              <p>
                Store and manager passwords are verified server-side. Session cookies are httpOnly.
                All Firestore access requires Firebase authentication.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">5. Contact</h3>
              <p>
                Questions:{' '}
                <Link href="/contact" className="text-primary underline underline-offset-4">
                  Contact page
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
