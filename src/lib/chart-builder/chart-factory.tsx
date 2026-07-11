// Chart Factory - Dynamic Chart Generation Engine
// Renders charts from configuration using React and Recharts

'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import type { ChartConfig, TransformedData, ChartFactoryResult } from './types';
import { DataTransformer } from './data-transformer';
import { cn } from '../utils';

/**
 * Chart Factory - Main chart generation component
 */
export class ChartFactory {
  /**
   * Generate chart from configuration
   */
  static create(config: ChartConfig, rawData: any[]): ChartFactoryResult {
    // Validate configuration
    const errors = this.validate(config);
    if (errors.length > 0) {
      return {
        component: () => <ChartError errors={errors} />,
        config,
        data: { data: [], fields: [], metadata: { totalRecords: 0, filteredRecords: 0 } },
        error: errors.join(', ')
      };
    }
    
    // Transform data
    const transformedData = DataTransformer.transform(rawData, config);
    
    // Prepare data for specific chart type
    const chartData = DataTransformer.prepareForChartType(transformedData, config.type);
    
    // Get chart component
    const ChartComponent = this.getChartComponent(config, chartData);
    
    return {
      component: ChartComponent,
      config,
      data: transformedData
    };
  }
  
  /**
   * Validate chart configuration
   */
  private static validate(config: ChartConfig): string[] {
    const errors: string[] = [];
    
    if (!config.type) {
      errors.push('Chart type is required');
    }
    
    if (!config.fields || config.fields.length === 0) {
      errors.push('At least one field is required');
    }
    
    // Chart-specific validation
    switch (config.type) {
      case 'pie':
      case 'donut':
        if (!config.fields.find(f => f.type === 'dimension')) {
          errors.push('Pie/Donut charts require at least one dimension');
        }
        if (!config.fields.find(f => f.type === 'measure')) {
          errors.push('Pie/Donut charts require at least one measure');
        }
        break;
        
      case 'scatter':
      case 'bubble':
        if (config.fields.filter(f => f.type === 'measure').length < 2) {
          errors.push('Scatter/Bubble charts require at least two measures');
        }
        break;
        
      case 'heatmap':
        if (config.fields.filter(f => f.type === 'dimension').length < 2) {
          errors.push('Heatmap requires at least two dimensions');
        }
        if (!config.fields.find(f => f.type === 'measure')) {
          errors.push('Heatmap requires at least one measure');
        }
        break;
        
      case 'histogram':
        if (!config.fields.find(f => f.type === 'measure')) {
          errors.push('Histogram requires at least one measure');
        }
        break;
    }
    
    return errors;
  }
  
  /**
   * Get appropriate chart component based on type
   */
  private static getChartComponent(config: ChartConfig, data: any[]): React.ComponentType<any> {
    switch (config.type) {
      case 'bar':
      case 'stackedBar':
        return () => <BarChartComponent config={config} data={data} />;
        
      case 'horizontalBar':
        return () => <HorizontalBarChartComponent config={config} data={data} />;
        
      case 'line':
        return () => <LineChartComponent config={config} data={data} />;
        
      case 'area':
      case 'stackedArea':
        return () => <AreaChartComponent config={config} data={data} />;
        
      case 'pie':
      case 'donut':
        return () => <PieChartComponent config={config} data={data} />;
        
      case 'scatter':
        return () => <ScatterChartComponent config={config} data={data} />;
        
      case 'bubble':
        return () => <BubbleChartComponent config={config} data={data} />;
        
      case 'heatmap':
        return () => <HeatmapChartComponent config={config} data={data} />;
        
      case 'histogram':
        return () => <HistogramChartComponent config={config} data={data} />;
        
      case 'combo':
        return () => <ComboChartComponent config={config} data={data} />;
        
      default:
        return () => <ChartError errors={[`Unsupported chart type: ${config.type}`]} />;
    }
  }
}

const DEFAULT_THEME_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
];

type ChartStyleExtended = ChartConfig['style'] & {
  showGrid?: boolean;
  gridColor?: string;
  titleFontSize?: number;
  legendFontSize?: number;
};

function resolveChartColors(config: ChartConfig, count: number = 8): string[] {
  const colors = config.colors;
  if (colors?.customColors?.length) return colors.customColors.slice(0, Math.max(count, colors.customColors.length));
  if (Array.isArray(colors?.scheme)) return (colors.scheme as unknown as string[]).slice(0, count);
  if (colors?.palette?.length) return colors.palette.slice(0, count);
  if (colors?.type === 'single' && colors.value) return Array(count).fill(colors.value);
  return DEFAULT_THEME_COLORS.slice(0, count);
}

const useChartColors = (config: ChartConfig, count: number = 8) => {
  return useMemo(
    () => resolveChartColors(config, count),
    [config.colors, config.updatedAt, count],
  );
};

function getTickStyle(config: ChartConfig) {
  const style = config.style as ChartStyleExtended;
  return {
    fontSize: style?.fontSize ?? 12,
    fontFamily: style?.fontFamily,
    fill: 'hsl(var(--muted-foreground))',
  };
}

function getLegendProps(config: ChartConfig) {
  const pos = config.legend?.position ?? 'bottom';
  const style = config.style as ChartStyleExtended;
  const wrapperStyle = {
    fontSize: style?.legendFontSize ?? 11,
    fontFamily: style?.fontFamily,
  };
  if (pos === 'top') return { verticalAlign: 'top' as const, wrapperStyle };
  if (pos === 'left') return { align: 'left' as const, layout: 'vertical' as const, wrapperStyle };
  if (pos === 'right') return { align: 'right' as const, layout: 'vertical' as const, wrapperStyle };
  return { verticalAlign: 'bottom' as const, wrapperStyle };
}

function ChartGrid({ config }: { config: ChartConfig }) {
  const style = config.style as ChartStyleExtended;
  if (style?.showGrid === false) return null;
  return <CartesianGrid strokeDasharray="3 3" stroke={style?.gridColor || 'hsl(var(--border))'} />;
}

function ChartStyleShell({ config, children }: { config: ChartConfig; children: React.ReactNode }) {
  const style = config.style as ChartStyleExtended;
  return (
    <div
      className="w-full"
      style={{
        backgroundColor: style?.backgroundColor || undefined,
        fontFamily: style?.fontFamily,
        padding: style?.padding ? `${style.padding}px` : undefined,
        borderRadius: style?.borderRadius ? `${style.borderRadius}px` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Custom Tooltip Component
 */
const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => {
        // Ensure value is a valid number or convert to string to prevent NaN errors
        const displayValue = typeof entry.value === 'number' && !isNaN(entry.value) 
          ? entry.value.toLocaleString() 
          : String(entry.value || 'N/A');
        
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Bar Chart Component
 */
const BarChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config, data.length);
  const measureField = config.fields.find(f => f.type === 'measure');
  const dimensionField = config.fields.find(f => f.type === 'dimension');
  
  if (!measureField || !dimensionField) {
    return <ChartError errors={['Bar chart requires both dimension and measure fields']} />;
  }
  
  return (
    <ChartStyleShell config={config}>
      <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
        <BarChart data={data} margin={config.style.margin}>
          <ChartGrid config={config} />
          <XAxis
            dataKey={dimensionField.id}
            stroke="hsl(var(--muted-foreground))"
            tick={getTickStyle(config)}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={getTickStyle(config)} />
          <Tooltip content={<ChartTooltipContent />} />
          {config.legend.show && <Legend {...getLegendProps(config)} />}
          <Bar
            dataKey={measureField.id}
            fill={colors[0]}
            radius={[8, 8, 0, 0]}
            onClick={config.interactions.onClick}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            <LabelList dataKey={measureField.id} position="top" fill="hsl(var(--foreground))" fontSize={getTickStyle(config).fontSize} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartStyleShell>
  );
};

/**
 * Horizontal Bar Chart Component
 */
const HorizontalBarChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config, data.length);
  const measureField = config.fields.find(f => f.type === 'measure');
  const dimensionField = config.fields.find(f => f.type === 'dimension');
  
  if (!measureField || !dimensionField) {
    return <ChartError errors={['Horizontal bar chart requires both dimension and measure fields']} />;
  }
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <BarChart data={data} layout="vertical" margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
        <YAxis 
          type="category" 
          dataKey={dimensionField.id}
          stroke="hsl(var(--muted-foreground))"
          width={100}
        />
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        <Bar dataKey={measureField.id} radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Line Chart Component
 */
const LineChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const measureFields = config.fields.filter(f => f.type === 'measure');
  const dimensionField = config.fields.find(f => f.type === 'dimension');
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <LineChart data={data} margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis 
          dataKey={dimensionField?.id}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        {measureFields.map((field, index) => (
          <Line
            key={field.id}
            type="monotone"
            dataKey={field.id}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ fill: colors[index % colors.length], r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Area Chart Component
 */
const AreaChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const measureFields = config.fields.filter(f => f.type === 'measure');
  const dimensionField = config.fields.find(f => f.type === 'dimension');
  const isStacked = config.type === 'stackedArea';
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <AreaChart data={data} margin={config.style.margin}>
        <defs>
          {measureFields.map((field, index) => (
            <linearGradient key={field.id} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <ChartGrid config={config} />
        <XAxis dataKey={dimensionField?.id} stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        {measureFields.map((field, index) => (
          <Area
            key={field.id}
            type="monotone"
            dataKey={field.id}
            stroke={colors[index % colors.length]}
            fill={`url(#color${index})`}
            stackId={isStacked ? '1' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart Component
 */
const PieChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config, data.length);
  const isDonut = config.type === 'donut';
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.name}: ${entry.value}`}
          outerRadius={isDonut ? 120 : 150}
          innerRadius={isDonut ? 80 : 0}
          fill="hsl(var(--primary))"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Scatter Chart Component
 */
const ScatterChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const [xField, yField] = config.fields.filter(f => f.type === 'measure');
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <ScatterChart margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis dataKey={xField?.id} name={xField?.name} stroke="hsl(var(--muted-foreground))" />
        <YAxis dataKey={yField?.id} name={yField?.name} stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        <Scatter name={config.name} data={data} fill={colors[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

/**
 * Combo Chart Component
 */
const ComboChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const measureFields = config.fields.filter(f => f.type === 'measure');
  const dimensionField = config.fields.find(f => f.type === 'dimension');
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <ComposedChart data={data} margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis dataKey={dimensionField?.id} stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        {/* First measure as Bar */}
        {measureFields[0] && (
          <Bar dataKey={measureFields[0].id} fill={colors[0]} radius={[8, 8, 0, 0]} />
        )}
        {/* Additional measures as Lines */}
        {measureFields.slice(1).map((field, index) => (
          <Line
            key={field.id}
            type="monotone"
            dataKey={field.id}
            stroke={colors[(index + 1) % colors.length]}
            strokeWidth={2}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

/**
 * Heatmap Chart Component
 */
const HeatmapChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const measureField = config.fields.find(f => f.type === 'measure');
  const dimensions = config.fields.filter(f => f.type === 'dimension');
  
  // Group data for heatmap
  const heatmapData = useMemo(() => {
    if (!measureField || dimensions.length < 2) return [];
    
    const grouped = data.reduce((acc: any, item) => {
      const key = `${item[dimensions[0].id]}_${item[dimensions[1].id]}`;
      if (!acc[key]) {
        acc[key] = {
          x: item[dimensions[0].id],
          y: item[dimensions[1].id],
          value: 0,
          count: 0
        };
      }
      acc[key].value += Number(item[measureField.id]) || 0;
      acc[key].count += 1;
      return acc;
    }, {});
    
    return Object.values(grouped).map((item: any) => ({
      ...item,
      value: item.value / item.count
    }));
  }, [data, measureField, dimensions]);
  
  const colors = useChartColors(config, 5);
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <ScatterChart margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" />
        <YAxis dataKey="y" stroke="hsl(var(--muted-foreground))" />
        <Tooltip content={<ChartTooltipContent />} />
        <Scatter data={heatmapData} shape="square">
          {heatmapData.map((entry: any, index: number) => {
            const maxValue = Math.max(...heatmapData.map((d: any) => d.value));
            const intensity = (entry.value / maxValue) * colors.length;
            const colorIndex = Math.min(Math.floor(intensity), colors.length - 1);
            return <Cell key={`cell-${index}`} fill={colors[colorIndex]} />;
          })}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

/**
 * Histogram Chart Component
 */
const HistogramChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const measureField = config.fields.find(f => f.type === 'measure');
  
  // Create histogram bins
  const histogramData = useMemo(() => {
    if (!measureField) return [];
    
    const values = data.map(d => Number(d[measureField.id]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const binSize = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
      min: min + i * binSize,
      max: min + (i + 1) * binSize
    }));
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      if (binIndex >= 0) bins[binIndex].count++;
    });
    
    return bins;
  }, [data, measureField]);
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <BarChart data={histogramData} margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: 'Frequency', angle: -90 }} />
        <Tooltip content={<ChartTooltipContent />} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        <Bar dataKey="count" fill={colors[0]} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Bubble Chart Component
 */
const BubbleChartComponent: React.FC<{ config: ChartConfig; data: any[] }> = ({ config, data }) => {
  const colors = useChartColors(config);
  const measureFields = config.fields.filter(f => f.type === 'measure');
  
  if (!measureFields[0] || !measureFields[1]) {
    return <ChartError errors={['Bubble chart requires at least 2 measure fields']} />;
  }
  
  const bubbleData = data.map(item => ({
    x: Number(item[measureFields[0].id]) || 0,
    y: Number(item[measureFields[1].id]) || 0,
    z: measureFields[2] ? Number(item[measureFields[2].id]) || 10 : 10
  }));
  
  return (
    <ResponsiveContainer width={config.style.width || '100%'} height={config.style.height || 400}>
      <ScatterChart margin={config.style.margin}>
        <ChartGrid config={config} />
        <XAxis 
          type="number" 
          dataKey="x" 
          name={measureFields[0].name}
          stroke="hsl(var(--muted-foreground))" 
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          name={measureFields[1].name}
          stroke="hsl(var(--muted-foreground))" 
        />
        <Tooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
        {config.legend.show && <Legend {...getLegendProps(config)} />}
        <Scatter name={measureFields[2]?.name || 'Size'} data={bubbleData} fill={colors[0]}>
          {bubbleData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

/**
 * Error Display Component
 */
const ChartError: React.FC<{ errors: string[] }> = ({ errors }) => {
  return (
    <div className="flex items-center justify-center h-[400px] border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-center p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">Chart Configuration Error</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          {errors.map((error, index) => (
            <li key={index}>• {error}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChartFactory;
