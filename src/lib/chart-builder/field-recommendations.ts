import type { ChartType, DataField } from './types';

export interface FieldRecommendations {
  dimensions: string[];
  measures: string[];
  reasoning: string;
  warnings?: string[];
}

const DIMENSION_PRIORITY: Record<string, string[]> = {
  default: ['vehicleModel', 'coPilot', 'purpose', 'dayOfWeek', 'date', 'dateShort', 'month', 'vehicleTrim', 'status', 'advisorIn'],
  temporal: ['date', 'dateShort', 'month', 'dayOfWeek', 'year', 'startTime'],
  categorical: ['vehicleModel', 'coPilot', 'purpose', 'vehicleTrim', 'status'],
};

const MEASURE_PRIORITY: Record<string, string[]> = {
  count: ['_count', 'rating', 'batteryUsed', 'actualDuration'],
  numeric: ['batteryUsed', 'actualDuration', 'expectedDuration', 'rating', 'startBattery', 'endBattery', 'durationDifference'],
  distribution: ['actualDuration', 'expectedDuration', 'batteryUsed', 'rating', 'startBattery'],
};

const FIELD_LABELS: Record<string, string> = {
  vehicleModel: 'Vehicle Model',
  coPilot: 'Advisor (Co-Pilot)',
  purpose: 'Drive Purpose',
  dayOfWeek: 'Day of Week',
  date: 'Date',
  dateShort: 'Date (Short)',
  month: 'Month',
  vehicleTrim: 'Vehicle Trim',
  status: 'Drive Status',
  advisorIn: 'Check-in Advisor',
  _count: 'Drive Count',
  batteryUsed: 'Battery Used (%)',
  actualDuration: 'Actual Duration (min)',
  expectedDuration: 'Expected Duration (min)',
  rating: 'Customer Rating',
  startBattery: 'Start Battery (%)',
  endBattery: 'End Battery (%)',
};

function findField(availableFields: DataField[], id: string): DataField | undefined {
  return availableFields.find((f) => f.id === id);
}

function pickFields(
  availableFields: DataField[],
  priorityIds: string[],
  count: number,
  options?: { dataType?: DataField['dataType'] },
): string[] {
  const picked: string[] = [];

  for (const id of priorityIds) {
    const field = findField(availableFields, id);
    if (!field) continue;
    if (options?.dataType && field.dataType !== options.dataType) continue;
    if (!picked.includes(id)) {
      picked.push(id);
      if (picked.length >= count) return picked;
    }
  }

  for (const field of availableFields) {
    if (picked.includes(field.id)) continue;
    if (options?.dataType && field.dataType !== options.dataType) continue;
    picked.push(field.id);
    if (picked.length >= count) break;
  }

  return picked;
}

function labelFor(id: string, availableFields: DataField[]): string {
  return findField(availableFields, id)?.name ?? FIELD_LABELS[id] ?? id;
}

export function getSmartRecommendations(
  chartType: ChartType,
  availableFields: DataField[],
): FieldRecommendations {
  const warnings: string[] = [];
  const stringFields = availableFields.filter((f) => f.dataType === 'string' || f.dataType === 'boolean');
  const dateFields = availableFields.filter(
    (f) =>
      f.dataType === 'date' ||
      ['date', 'dateshort', 'month', 'dayofweek', 'year', 'starttime'].some((k) =>
        f.id.toLowerCase().includes(k),
      ),
  );

  switch (chartType) {
    case 'line':
    case 'area':
    case 'stackedArea': {
      const dimensions = pickFields(
        availableFields,
        dateFields.length > 0 ? DIMENSION_PRIORITY.temporal : DIMENSION_PRIORITY.categorical,
        1,
      );
      const measures = pickFields(availableFields, MEASURE_PRIORITY.count, chartType === 'stackedArea' ? 2 : 1);

      if (dateFields.length === 0) {
        warnings.push('Tip: Line charts work best with a date field on the X-axis. Try Date or Day of Week.');
      }

      return {
        dimensions,
        measures: measures.length > 0 ? measures : ['_count'],
        reasoning: `Trend chart: use ${dimensions.map((d) => labelFor(d, availableFields)).join(', ') || 'a category'} on the X-axis and ${measures.map((m) => labelFor(m, availableFields)).join(', ') || 'Drive Count'} as the value.`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    case 'bar':
    case 'horizontalBar': {
      const dimensions = pickFields(availableFields, DIMENSION_PRIORITY.categorical, 1);
      const measures = pickFields(availableFields, MEASURE_PRIORITY.count, 1);

      return {
        dimensions,
        measures: measures.length > 0 ? measures : ['_count'],
        reasoning: `${chartType === 'horizontalBar' ? 'Horizontal bar' : 'Bar'} chart: compare ${labelFor(dimensions[0] ?? 'vehicleModel', availableFields)} categories using ${labelFor(measures[0] ?? '_count', availableFields)}.`,
        warnings:
          stringFields.length === 0
            ? ['Add a dimension like Vehicle Model or Advisor to group your bars.']
            : undefined,
      };
    }

    case 'stackedBar':
      return {
        dimensions: pickFields(availableFields, ['vehicleModel', 'coPilot', 'purpose', 'dayOfWeek'], 2),
        measures: pickFields(availableFields, MEASURE_PRIORITY.count, 1),
        reasoning:
          'Stacked bar: first dimension groups bars, second stacks segments (e.g. Model + Purpose). Measure: Drive Count.',
      };

    case 'pie':
    case 'donut': {
      const dimensions = pickFields(availableFields, ['purpose', 'vehicleModel', 'coPilot', 'expectedDuration'], 1);
      const measures = pickFields(availableFields, MEASURE_PRIORITY.count, 1);

      return {
        dimensions,
        measures: measures.length > 0 ? measures : ['_count'],
        reasoning: `${chartType === 'donut' ? 'Donut' : 'Pie'} chart: slice by ${labelFor(dimensions[0] ?? 'vehicleModel', availableFields)}, sized by Drive Count. Keep to 3–7 categories.`,
        warnings: ['Best practice: limit slices to 3–7 for readability.'],
      };
    }

    case 'scatter':
    case 'bubble': {
      const dimensions = pickFields(availableFields, ['vehicleModel', 'coPilot', 'purpose'], 1);
      const measures = pickFields(availableFields, MEASURE_PRIORITY.numeric, chartType === 'bubble' ? 3 : 2);

      if (measures.length < 2) {
        warnings.push('Scatter charts need two numeric measures (e.g. Actual Duration vs Battery Used).');
      }

      return {
        dimensions,
        measures,
        reasoning: `${chartType === 'bubble' ? 'Bubble' : 'Scatter'} plot: X = ${labelFor(measures[0] ?? 'actualDuration', availableFields)}, Y = ${labelFor(measures[1] ?? 'batteryUsed', availableFields)}${chartType === 'bubble' ? `, size = ${labelFor(measures[2] ?? 'rating', availableFields)}` : ''}. Optional color: ${labelFor(dimensions[0] ?? 'vehicleModel', availableFields)}.`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    case 'histogram': {
      const measures = pickFields(availableFields, MEASURE_PRIORITY.distribution, 1);
      return {
        dimensions: [],
        measures,
        reasoning: `Histogram: distribution of ${labelFor(measures[0] ?? 'actualDuration', availableFields)} across value ranges.`,
      };
    }

    case 'heatmap':
      return {
        dimensions: pickFields(availableFields, ['dayOfWeek', 'coPilot', 'vehicleModel', 'purpose', 'hour'], 2),
        measures: pickFields(availableFields, MEASURE_PRIORITY.count, 1),
        reasoning:
          'Heatmap: row = Day of Week or Advisor, column = Vehicle Model or Purpose, color = Drive Count.',
      };

    case 'combo':
      return {
        dimensions: pickFields(
          availableFields,
          dateFields.length > 0 ? DIMENSION_PRIORITY.temporal : DIMENSION_PRIORITY.categorical,
          1,
        ),
        measures: pickFields(availableFields, ['_count', 'batteryUsed', 'rating', 'actualDuration'], 3),
        reasoning:
          'Combo chart: one date/category axis with multiple metrics - e.g. Drive Count (bars) + Avg Battery Used (line).',
      };

    default:
      return {
        dimensions: pickFields(availableFields, DIMENSION_PRIORITY.default, 1),
        measures: pickFields(availableFields, MEASURE_PRIORITY.count, 1),
        reasoning: 'Start with a category dimension and Drive Count as your measure.',
      };
  }
}

export function getRecommendedAggregation(measureId: string): 'count' | 'sum' | 'avg' | undefined {
  if (measureId === '_count') return 'count';
  if (['rating', 'batteryUsed', 'actualDuration', 'expectedDuration', 'durationDifference'].includes(measureId)) {
    return 'avg';
  }
  return 'sum';
}
