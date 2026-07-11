// Chart Builder Demo - Example usage of the chart builder system
// Shows how to create and customize charts

'use client';

import React, { useState } from 'react';
import { ChartFactory, ConfigValidator, useChartBuilderStore } from '@/lib/chart-builder';
import type { ChartConfig, ChartType } from '@/lib/chart-builder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Sample data for demonstration
 */
const sampleData = [
  { month: 'Jan', sales: 4200, expenses: 2400, profit: 1800, region: 'North' },
  { month: 'Feb', sales: 5100, expenses: 2800, profit: 2300, region: 'North' },
  { month: 'Mar', sales: 4800, expenses: 2600, profit: 2200, region: 'North' },
  { month: 'Apr', sales: 6200, expenses: 3200, profit: 3000, region: 'South' },
  { month: 'May', sales: 7100, expenses: 3600, profit: 3500, region: 'South' },
  { month: 'Jun', sales: 6800, expenses: 3400, profit: 3400, region: 'South' },
  { month: 'Jul', sales: 8200, expenses: 4200, profit: 4000, region: 'East' },
  { month: 'Aug', sales: 7800, expenses: 4000, profit: 3800, region: 'East' },
  { month: 'Sep', sales: 6900, expenses: 3500, profit: 3400, region: 'West' },
  { month: 'Oct', sales: 7500, expenses: 3800, profit: 3700, region: 'West' },
  { month: 'Nov', sales: 8100, expenses: 4100, profit: 4000, region: 'West' },
  { month: 'Dec', sales: 9200, expenses: 4600, profit: 4600, region: 'North' }
];

/**
 * Chart Builder Demo Component
 */
export default function ChartBuilderDemo() {
  const { templates, createFromTemplate } = useChartBuilderStore();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Create chart configuration based on selected type
  const createConfig = (type: ChartType): ChartConfig => {
    const baseConfig: ChartConfig = {
      id: `demo-${type}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart Demo`,
      type,
      fields: [],
      filters: [],
      xAxis: { fieldId: '', label: 'Month', show: true },
      yAxis: { fieldId: '', label: 'Amount ($)', show: true },
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'bottom' },
      style: { width: '100%', height: 400, margin: { top: 20, right: 30, bottom: 20, left: 30 } },
      interactions: { enabled: true, clickable: true, zoomable: false, pannable: false }
    };

    // Configure fields based on chart type
    switch (type) {
      case 'bar':
      case 'horizontalBar':
      case 'stackedBar':
        return {
          ...baseConfig,
          fields: [
            { id: 'month', name: 'Month', type: 'dimension', dataType: 'string' },
            { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' }
          ]
        };

      case 'line':
      case 'area':
      case 'stackedArea':
        return {
          ...baseConfig,
          fields: [
            { id: 'month', name: 'Month', type: 'dimension', dataType: 'string' },
            { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' },
            { id: 'expenses', name: 'Expenses', type: 'measure', dataType: 'number', aggregation: 'sum' }
          ]
        };

      case 'pie':
      case 'donut':
        return {
          ...baseConfig,
          fields: [
            { id: 'region', name: 'Region', type: 'dimension', dataType: 'string' },
            { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' }
          ]
        };

      case 'scatter':
        return {
          ...baseConfig,
          fields: [
            { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' },
            { id: 'profit', name: 'Profit', type: 'measure', dataType: 'number', aggregation: 'sum' }
          ]
        };

      case 'combo':
        return {
          ...baseConfig,
          fields: [
            { id: 'month', name: 'Month', type: 'dimension', dataType: 'string' },
            { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' },
            { id: 'profit', name: 'Profit', type: 'measure', dataType: 'number', aggregation: 'sum' }
          ]
        };

      default:
        return baseConfig;
    }
  };

  // Generate chart
  const config = createConfig(chartType);
  const validation = ConfigValidator.validate(config);
  
  React.useEffect(() => {
    if (!validation.valid) {
      setValidationErrors(validation.errors.map(e => e.message));
    } else {
      setValidationErrors([]);
    }
  }, [validation]);

  const chartResult = validation.valid 
    ? ChartFactory.create(config, sampleData)
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Chart Builder Demo</h1>
        <p className="text-muted-foreground">
          Explore different chart types and see how they visualize the same data
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Controls</CardTitle>
          <CardDescription>Select a chart type to visualize the sample data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Chart Type</label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="horizontalBar">Horizontal Bar</SelectItem>
                  <SelectItem value="stackedBar">Stacked Bar</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="stackedArea">Stacked Area</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="donut">Donut Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                  <SelectItem value="combo">Combo Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-semibold text-destructive mb-2">Configuration Errors:</h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Display */}
      <Card>
        <CardHeader>
          <CardTitle>{config.name}</CardTitle>
          <CardDescription>
            Showing {sampleData.length} records • {config.fields.filter(f => f.type === 'measure').length} measures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartResult ? (
            <chartResult.component />
          ) : (
            <div className="flex items-center justify-center h-[400px] border border-dashed rounded-lg">
              <p className="text-muted-foreground">Chart configuration is invalid</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>Pre-configured chart templates ready to use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.slice(0, 6).map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 space-y-2 hover:border-primary transition-colors cursor-pointer"
                onClick={() => setChartType(template.type)}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">{template.name}</h4>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  Preview
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Data</CardTitle>
          <CardDescription>Preview of the data being visualized</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Sales</th>
                  <th className="text-right p-2">Expenses</th>
                  <th className="text-right p-2">Profit</th>
                  <th className="text-left p-2">Region</th>
                </tr>
              </thead>
              <tbody>
                {sampleData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{row.month}</td>
                    <td className="text-right p-2">${row.sales.toLocaleString()}</td>
                    <td className="text-right p-2">${row.expenses.toLocaleString()}</td>
                    <td className="text-right p-2">${row.profit.toLocaleString()}</td>
                    <td className="p-2">{row.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 5 of {sampleData.length} records
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Details</CardTitle>
          <CardDescription>Technical details of the current chart configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Chart Type:</span>
              <span>{config.type}</span>
              
              <span className="text-muted-foreground">Dimensions:</span>
              <span>{config.fields.filter(f => f.type === 'dimension').length}</span>
              
              <span className="text-muted-foreground">Measures:</span>
              <span>{config.fields.filter(f => f.type === 'measure').length}</span>
              
              <span className="text-muted-foreground">Filters:</span>
              <span>{config.filters?.length || 0}</span>
              
              <span className="text-muted-foreground">Validation:</span>
              <span className={validation.valid ? 'text-green-600' : 'text-destructive'}>
                {validation.valid ? '✓ Valid' : '✗ Invalid'}
              </span>
              
              <span className="text-muted-foreground">Warnings:</span>
              <span>{validation.warnings.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
