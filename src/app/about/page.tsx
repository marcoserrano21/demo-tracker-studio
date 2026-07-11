
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft,
  BookOpen,
  Github,
  Linkedin,
  Play,
  Sparkles,
  Target,
  Wrench,
  BarChart3,
  Cpu,
} from 'lucide-react';
import Link from 'next/link';
import { HubLogo } from '@/components/hub-logo';

const NOTION_CASE_STUDY_URL =
  'https://app.notion.com/p/The-Demo-Drive-Hub-28dc2787689780abbd0dda2d88ff91c4?source=copy_link';

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
    body: 'Mobile-first flows for a loud, fast sales floor. One primary action per screen, preset battery inputs, high-contrast themes for weird floor lighting. I overanalyzed the check-in flow until it felt obvious. Took a few wrong versions to get there.',
  },
  {
    title: 'Product & Engineering',
    body: 'Next.js 16, Firebase realtime data, PWA install, XP and Hall of Fame gamification, manager analytics with demo-to-sale tracking by model and trim. I am not a traditionalist coder. I use AI-assisted dev tools to move faster on boilerplate and iteration, but I still own architecture, debugging, and what actually ships.',
  },
  {
    title: 'Digital Marketing & Story',
    body: 'Positioned as a before/after narrative with pilot metrics recruiters can scan in 60 seconds. Problem, proof, live demo. The story had to work for designers, engineers, and hiring managers in one pass.',
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
            I build where data, design, and product overlap. This app is the receipt from the showroom floor.
          </p>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">About Marco Serrano</CardTitle>
            <CardDescription className="text-base leading-relaxed text-foreground/80">
              Customer Experience Specialist and internal product builder in EV retail. I find operational friction,
              design around it, and ship tools advisors actually open on a busy Saturday. From Figma-level UX to
              Firebase-backed flows that survive real floor chaos. B.S. Digital Marketing (Full Sail, expected 2027).
              Open to{' '}
              <strong className="font-semibold text-foreground">UI/UX Design</strong>,{' '}
              <strong className="font-semibold text-foreground">AI/product engineering</strong>, and{' '}
              <strong className="font-semibold text-foreground">digital marketing</strong> roles where storytelling
              and systems thinking both matter.
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
              Demo drives are the peak moment on the sales floor. But availability still lived on whiteboards, group
              chats, and whoever remembered last. One check took 25 minutes while the customer waited. That is not a
              UX problem. That is a trust problem.
            </p>
            <p>
              Demo Drive Hub replaces that friction with live fleet status, ~30-second check-in/out, advisor
              gamification, demo-to-sale analytics by model and trim, and manager dashboards. All on a phone. Still
              not perfect, but the before/after is hard to argue with.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              What I designed and built
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
              <Cpu className="h-5 w-5 text-primary" />
              How I build (honestly)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              I am not trying to win a purity contest about how code gets written. I use AI-assisted coding tools the
              way a good editor uses a sharp knife: faster cuts, fewer dumb mistakes, more room for the hard parts.
            </p>
            <p>
              That means I still read the diff, still trace bugs, still decide what belongs in production. The tools
              help me scaffold, refactor, and stress-test ideas. They do not replace product judgment. Actually, wait.
              The real skill is knowing when to ignore the suggestion and ship the simpler version anyway.
            </p>
            <p className="text-sm">
              Full write-up with process notes, screenshots, and iteration history lives in Notion. Link below if you
              want the longer version.
            </p>
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
            <CardTitle>Stack and craft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              Next.js 16 · React 19 · TypeScript · Firebase Firestore · shadcn/ui · Tailwind CSS · Recharts · PWA ·
              keyword-based issue detection · OEM-neutral visual system
            </p>
            <p className="text-sm">
              Independent portfolio project. Not affiliated with or endorsed by any automotive OEM. Built to show
              full-stack product design for EV retail operations, not to pretend I run a factory floor at scale.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Security and performance notes</CardTitle>
            <CardDescription>
              Portfolio demo setup. UX and workflows first, not production multi-tenant isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Store login.</strong> Store and manager access use httpOnly cookies
              set by Server Actions, with optional rate limiting (8 attempts / 15 min). Session state stays off
              tamperable client storage for the demo login flow.
            </p>
            <p>
              <strong className="text-foreground">Firestore.</strong> Anonymous Firebase Auth gates database access.
              Rules allow any signed-in user to read/write store data, which fits a portfolio showcase. Per-store
              isolation is enforced in the app UI, not custom claims.
            </p>
            <p>
              <strong className="text-foreground">Performance guardrails.</strong> Dashboard listeners cap at 500 drive
              logs (30 days), 100 manual awards, and 50 goals. Fleet renders immediately. History and analytics show
              skeletons until the bounded query resolves.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button asChild size="lg" className="rounded-xl">
            <Link href="/">
              <Sparkles className="mr-2 h-4 w-4" />
              Try live demo
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a href={NOTION_CASE_STUDY_URL} target="_blank" rel="noopener noreferrer">
              <BookOpen className="mr-2 h-4 w-4" />
              Full case study (Notion)
            </a>
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
