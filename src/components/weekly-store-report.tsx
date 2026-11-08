'use client';

import { useMemo, useRef, useState } from 'react';
import type { Advisor, DriveLog, Vehicle } from '@/lib/types';
import { buildWeeklyStoreReport } from '@/lib/ops-reports';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  Share2,
  Loader2,
  BarChart3,
  FileText,
} from 'lucide-react';

interface WeeklyStoreReportProps {
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  storeName: string;
  storeCode: string;
  className?: string;
}

export default function WeeklyStoreReport({
  vehicles,
  driveLogs,
  advisors,
  storeName,
  storeCode,
  className,
}: WeeklyStoreReportProps) {
  const { toast } = useToast();
  const reportRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState<'png' | 'share' | 'pdf' | null>(null);

  const report = useMemo(
    () => buildWeeklyStoreReport({ vehicles, driveLogs, advisors }),
    [vehicles, driveLogs, advisors]
  );

  const metrics = [
    { label: 'Demos completed', value: String(report.demosCompleted) },
    { label: 'Avg duration', value: `${report.avgDurationMin} min` },
    { label: 'Utilization', value: `${report.utilizationPct}%` },
    { label: 'Overdue now', value: String(report.overdueCount) },
    { label: 'Demos / advisor', value: String(report.demosPerAdvisor) },
    { label: 'FSD activation', value: `${report.fsdActivationRate}%` },
    { label: 'FSD-sub rate', value: `${report.fsdSubRate}%` },
    { label: 'Purchases', value: String(report.purchaseCount) },
  ];

  const exportPng = async () => {
    if (!reportRef.current) return;
    setBusy('png');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor:
          getComputedStyle(reportRef.current).backgroundColor || '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
        // Prevent descender / line-box clipping on advisor names
        onclone: (_doc, element) => {
          element.style.overflow = 'visible';
          element.querySelectorAll('li, span, p').forEach((node) => {
            const el = node as HTMLElement;
            el.style.overflow = 'visible';
            el.style.lineHeight = '1.5';
            el.style.paddingBottom = '2px';
          });
        },
      });
      const link = document.createElement('a');
      link.download = `weekly-report_${storeCode}_${report.periodStart.toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Report exported', description: 'PNG downloaded - ready to forward.' });
    } catch {
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate PNG.' });
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = () => {
    if (!reportRef.current) return;
    setBusy('pdf');
    try {
      const article = reportRef.current;
      const printWin = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
      if (!printWin) {
        // Popup blocked - fall back to in-page print of the article
        article.classList.add('weekly-report-print-root');
        const style = document.createElement('style');
        style.id = 'weekly-report-print-style';
        style.textContent = `
          @media print {
            body * { visibility: hidden !important; }
            .weekly-report-print-root, .weekly-report-print-root * { visibility: visible !important; }
            .weekly-report-print-root {
              position: absolute !important;
              left: 0; top: 0; width: 100%;
              background: white !important;
              color: black !important;
              padding: 24px !important;
            }
          }
        `;
        document.head.appendChild(style);
        window.print();
        style.remove();
        article.classList.remove('weekly-report-print-root');
        toast({ title: 'Print dialog opened', description: 'Choose Save as PDF in the printer list.' });
        return;
      }

      const bg = getComputedStyle(article).backgroundColor || '#ffffff';
      printWin.document.write(`<!DOCTYPE html><html><head><title>${storeName} Weekly Report</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 24px; color: #111; background: #fff; }
          h1 { font-size: 1.25rem; margin: 0 0 4px; }
          .meta { color: #555; font-size: 0.875rem; margin-bottom: 16px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
          @media (min-width: 640px) { .grid { grid-template-columns: repeat(4, 1fr); } }
          .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 12px; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
          .value { font-size: 1.25rem; font-weight: 700; margin-top: 4px; }
          .section { border: 1px solid #e5e5e5; border-radius: 12px; padding: 12px; }
          .section h2 { font-size: 0.75rem; text-transform: uppercase; color: #666; margin: 0 0 8px; }
          li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.875rem; }
          @media print { body { margin: 12px; } }
        </style></head><body>
        <h1>${storeName} · Weekly store report</h1>
        <p class="meta">${report.weekLabel}</p>
        <div class="grid">
          ${metrics.map((m) => `<div class="card"><div class="label">${m.label}</div><div class="value">${m.value}</div></div>`).join('')}
        </div>
        <div class="section">
          <h2>Top advisors this week</h2>
          ${
            report.topAdvisors.length === 0
              ? '<p>No completed demos this week yet.</p>'
              : `<ul>${report.topAdvisors
                  .map(
                    (row, i) =>
                      `<li><span>${i + 1}. ${row.name}</span><span>${row.demos} demos · ${row.fsdSubs} FSD-sub</span></li>`,
                  )
                  .join('')}</ul>`
          }
          <p class="meta" style="margin-top:12px">Feedback logged on ${report.feedbackCount} of ${report.demosCompleted} demos.</p>
        </div>
        </body></html>`);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        toast({ title: 'Print dialog opened', description: 'Choose Save as PDF in the printer list.' });
      }, 250);
    } catch {
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not open print dialog.' });
    } finally {
      setBusy(null);
    }
  };

  const shareReport = async () => {
    const summary = [
      `${storeName} · Weekly store report`,
      report.weekLabel,
      `Demos: ${report.demosCompleted} · Avg ${report.avgDurationMin} min`,
      `FSD activation: ${report.fsdActivationRate}% · FSD-sub: ${report.fsdSubRate}%`,
      `Utilization: ${report.utilizationPct}% · Purchases: ${report.purchaseCount}`,
      report.topAdvisors.length
        ? `Top: ${report.topAdvisors.map((a) => `${a.name} (${a.demos})`).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    setBusy('share');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${storeName} weekly report`, text: summary });
        toast({ title: 'Shared', description: 'Weekly report sent.' });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        toast({ title: 'Copied', description: 'Weekly report summary copied to clipboard.' });
      } else {
        toast({ title: 'Weekly summary', description: summary });
      }
    } catch {
      // user cancelled share - ignore
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      className={cn('rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm', className)}
      aria-label="Weekly store report"
    >
      <header className="flex flex-col gap-3 border-b border-border/50 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Weekly store report
          </p>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">{storeName}</h2>
          <p className="text-sm text-muted-foreground">{report.weekLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy !== null}
            onClick={shareReport}
          >
            {busy === 'share' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Share
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy !== null}
            onClick={exportPdf}
          >
            {busy === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="mr-2 h-4 w-4" aria-hidden />
            )}
            Export PDF
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={busy !== null}
            onClick={exportPng}
          >
            {busy === 'png' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            Export PNG
          </Button>
        </div>
      </header>

      <article ref={reportRef} className="bg-card p-4 sm:p-5 space-y-4 overflow-visible">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-normal">
                {m.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums leading-normal">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 overflow-visible">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-normal pb-1">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Top advisors this week
          </div>
          {report.topAdvisors.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground leading-normal">No completed demos this week yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 overflow-visible">
              {report.topAdvisors.map((row, i) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 text-sm leading-normal py-0.5 overflow-visible"
                >
                  <span className="font-medium min-w-0 leading-normal break-words">
                    <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                    {row.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0 leading-normal">
                    {row.demos} demos · {row.fsdSubs} FSD-sub
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground leading-normal">
            Feedback logged on {report.feedbackCount} of {report.demosCompleted} demos.
          </p>
        </div>
      </article>
    </section>
  );
}

