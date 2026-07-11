
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Github, Linkedin, Play, Sparkles, Target, Wrench, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { HubLogo } from '@/components/hub-logo';

const METRICS = [
  { label: 'Admin time saved', value: '~50%' },
  { label: 'Drives logged (pilot)', value: '147' },
  { label: 'Advisors onboarded', value: '12 in 2 weeks' },
  { label: 'Double bookings', value: '0 after launch' },
  { label: 'Issues flagged early', value: '8 via keywords' },
];

const ROLES = [
  {
    title: 'UI/UX Design',
    body: 'Mobile-first flows for a loud, fast sales floor — one primary action per screen, preset battery inputs, and high-contrast themes for floor lighting.',
  },
  {
    title: 'Product & Engineering',
    body: 'Next.js 16, Firebase realtime data, PWA install, gamification (XP, Hall of Fame), and manager analytics with demo-to-sale tracking by model/trim.',
  },
  {
    title: 'Digital Marketing & Story',
    body: 'Positioned as a before/after narrative with pilot metrics recruiters can scan in 60 seconds — problem, proof, live demo.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background py-12 md:py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <Button variant="outline" asChild className="mb-8 rounded-xl">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to App
          </Link>
        </Button>

        <div className="mb-10 flex flex-col items-center text-center">
          <HubLogo expanded className="mb-4" />
          <p className="text-sm font-medium text-primary">Portfolio case study</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Demo Drive Hub</h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            I build at the intersection of data, design, and product — this app is proof on the showroom floor.
          </p>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">About Marco Serrano</CardTitle>
            <CardDescription className="text-base leading-relaxed text-foreground/80">
              Customer Experience Specialist and internal product builder in EV retail. I diagnose operational
              friction, design the fix, and ship it — from Figma-level UX to Firebase-backed tools advisors
              actually use. B.S. Digital Marketing (Full Sail, expected 2027). Open to{' '}
              <strong className="font-semibold text-foreground">UI/UX Design</strong>,{' '}
              <strong className="font-semibold text-foreground">AI/product engineering</strong>, and{' '}
              <strong className="font-semibold text-foreground">digital marketing</strong> roles where
              storytelling and systems thinking both matter.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 px-2.5 py-1">Orlando, FL</span>
            <span className="rounded-full border border-border/60 px-2.5 py-1">mserran15@gmail.com</span>
            <a
              href="https://marco-serrano.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border/60 px-2.5 py-1 hover:text-foreground"
            >
              marco-serrano.netlify.app
            </a>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              The problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Demo drives are the peak moment on the sales floor — but teams often track fleet availability on
              whiteboards, group chats, and memory. One availability check took 25 minutes while the customer waited.
            </p>
            <p>
              I built Demo Drive Hub to replace that friction: live fleet status, ~30-second check-in/out,
              advisor gamification, demo-to-sale analytics by model and trim, and manager dashboards — all on a phone.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              What I designed &amp; built
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROLES.map((role) => (
              <div key={role.title} className="rounded-xl border border-border/50 p-4">
                <h3 className="font-semibold text-foreground">{role.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{role.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pilot impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {METRICS.map((m) => (
                <div key={m.label} className="rounded-lg border border-border/50 p-3">
                  <dt className="text-xs text-muted-foreground">{m.label}</dt>
                  <dd className="text-lg font-semibold text-foreground">{m.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stack &amp; craft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              Next.js 16 · React 19 · TypeScript · Firebase Firestore · shadcn/ui · Tailwind CSS · Recharts · PWA ·
              keyword-based issue detection · OEM-neutral visual system
            </p>
            <p className="text-sm">
              Independent portfolio project. Not affiliated with or endorsed by any automotive OEM. Built to
              demonstrate full-stack product design for EV retail operations.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Security &amp; performance notes</CardTitle>
            <CardDescription>
              Portfolio demo setup — focused on UX and workflows, not production multi-tenant isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Store login.</strong> Store and manager access use httpOnly
              cookies set by Server Actions, with optional rate limiting (8 attempts / 15 min). This keeps
              session state off tamperable client storage for the demo login flow.
            </p>
            <p>
              <strong className="text-foreground">Firestore.</strong> Anonymous Firebase Auth gates database
              access. Rules allow any signed-in user to read/write store data — appropriate for a portfolio
              showcase. Per-store isolation is enforced in the app UI, not via custom claims.
            </p>
            <p>
              <strong className="text-foreground">Performance guardrails.</strong> Dashboard listeners cap at 500
              drive logs (30 days), 100 manual awards, and 50 goals. Fleet renders immediately; history and analytics
              show skeletons until the bounded query resolves.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="rounded-xl">
            <Link href="/">
              <Sparkles className="mr-2 h-4 w-4" />
              Try live demo
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a
              href="https://player.vimeo.com/video/1165516041"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch walkthrough
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a href="https://github.com/marcoserrano21" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a
              href="https://www.linkedin.com/in/marco-serrano25/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
