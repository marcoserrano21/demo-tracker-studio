'use client';

import { CheckCircle2, Circle, Lightbulb, Sparkles } from 'lucide-react';
import type { ChartType } from '@/lib/chart-builder/types';
import type { DataField } from '@/lib/chart-builder/types';
import { cn } from '@/lib/utils';

export interface FieldRecommendations {
  dimensions: string[];
  measures: string[];
  reasoning: string;
  warnings?: string[];
}

interface ConfigureFieldsGuideProps {
  chartType: ChartType;
  recommendations: FieldRecommendations;
  selectedFields: DataField[];
  availableFields: DataField[];
  variant?: 'mobile' | 'desktop';
}

function getSetupChecklist(chartType: ChartType, selectedFields: DataField[]) {
  const dimensions = selectedFields.filter((f) => f.type === 'dimension');
  const measures = selectedFields.filter((f) => f.type === 'measure');

  const needsMeasure = ['bar', 'line', 'area', 'scatter', 'bubble', 'histogram', 'combo', 'horizontalBar'].includes(chartType);
  const needsDimension = !['number'].includes(chartType);
  const pieLike = ['pie', 'donut'].includes(chartType);

  return [
    {
      id: 'chart-type',
      label: 'Chart type selected',
      done: true,
    },
    {
      id: 'dimension',
      label: pieLike
        ? 'Add a category field (Dimension) - e.g. Vehicle Model or Advisor'
        : 'Add at least one Dimension to group data (X-axis or categories)',
      done: dimensions.length > 0,
      required: needsDimension,
    },
    {
      id: 'measure',
      label: needsMeasure
        ? 'Add a Measure (numeric value) - counts auto-aggregate when you drag a dimension only'
        : 'Optional: add a Measure for size or values',
      done: measures.length > 0 || pieLike,
      required: needsMeasure && !pieLike,
    },
    {
      id: 'review',
      label: 'Remove extra fields if the chart looks cluttered - keep 1–2 dimensions and 1 measure for quick charts',
      done: selectedFields.length <= 3 && selectedFields.length > 0,
      required: false,
    },
    {
      id: 'preview',
      label: 'Open the Preview tab to validate, then Save or export',
      done: false,
      required: false,
    },
  ].filter((step) => step.required !== false || step.id === 'preview' || step.id === 'review');
}

export function ConfigureFieldsGuide({
  chartType,
  recommendations,
  selectedFields,
  availableFields,
  variant = 'desktop',
}: ConfigureFieldsGuideProps) {
  const checklist = getSetupChecklist(chartType, selectedFields);
  const dimensionCount = selectedFields.filter((f) => f.type === 'dimension').length;
  const measureCount = selectedFields.filter((f) => f.type === 'measure').length;
  const isCompact = variant === 'mobile';

  const missingDimensionNames = recommendations.dimensions
    .filter((id) => !selectedFields.some((f) => f.id === id))
    .map((id) => availableFields.find((f) => f.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const missingMeasureNames = recommendations.measures
    .filter((id) => !selectedFields.some((f) => f.id === id))
    .map((id) => availableFields.find((f) => f.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className={cn('p-3 md:p-4 bg-background/60 rounded-lg border border-primary/10', isCompact && 'p-3')}>
        <p className={cn('font-semibold text-primary mb-2 flex items-center gap-1.5', isCompact ? 'text-xs' : 'text-sm')}>
          <Sparkles className={cn(isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          Quick Start Guide
        </p>
        <p className={cn('text-muted-foreground mb-3', isCompact ? 'text-xs' : 'text-sm')}>
          {recommendations.reasoning}
        </p>
        <ol className={cn('space-y-1.5 text-muted-foreground', isCompact ? 'text-xs' : 'text-sm')}>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary flex-shrink-0">1.</span>
            <span>
              <strong className="text-foreground">Dimensions (categories):</strong> drag blue fields - group by model, advisor, date, or purpose.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary flex-shrink-0">2.</span>
            <span>
              <strong className="text-foreground">Measures (numbers):</strong> drag green fields - battery used, duration, ratings, or counts.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary flex-shrink-0">3.</span>
            <span>
              <strong className="text-foreground">Edit:</strong> remove fields you do not need; reorder within each drop zone.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-primary flex-shrink-0">4.</span>
            <span>
              <strong className="text-foreground">Preview:</strong> confirm the chart, then save or export.
            </span>
          </li>
        </ol>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 md:p-4">
        <p className={cn('font-semibold mb-2 flex items-center gap-2', isCompact ? 'text-xs' : 'text-sm')}>
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Your setup ({dimensionCount} dimension{dimensionCount !== 1 ? 's' : ''}, {measureCount} measure{measureCount !== 1 ? 's' : ''})
        </p>
        <ul className={cn('space-y-2', isCompact ? 'text-xs' : 'text-sm')}>
          {checklist.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-muted-foreground">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <span className={step.done ? 'text-foreground' : undefined}>{step.label}</span>
            </li>
          ))}
        </ul>
        {(missingDimensionNames.length > 0 || missingMeasureNames.length > 0) && (
          <div className={cn('mt-3 pt-3 border-t text-muted-foreground space-y-1', isCompact ? 'text-xs' : 'text-sm')}>
            <p className="font-medium text-foreground">Suggested next adds:</p>
            {missingDimensionNames.length > 0 && (
              <p>Dimensions: {missingDimensionNames.join(', ')}</p>
            )}
            {missingMeasureNames.length > 0 && (
              <p>Measures: {missingMeasureNames.join(', ')}</p>
            )}
          </div>
        )}
      </div>

      {recommendations.warnings && recommendations.warnings.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-amber-200/30 bg-amber-500/5 p-3">
          <p className={cn('font-semibold text-amber-600 dark:text-amber-400', isCompact ? 'text-xs' : 'text-sm')}>
            Tips
          </p>
          {recommendations.warnings.map((warning, idx) => (
            <p key={idx} className={cn('text-amber-700 dark:text-amber-300 leading-relaxed', isCompact ? 'text-xs' : 'text-sm')}>
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
