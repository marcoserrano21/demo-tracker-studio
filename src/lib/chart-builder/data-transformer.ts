// Data Transformation Layer - High-Performance Data Processing
// Handles aggregations, pivots, filtering, and data preparation for charts

import type { 
  ChartConfig, 
  ChartFilter, 
  DataField, 
  AggregationType,
  TransformedData,
  FilterOperator 
} from './types';

/**
 * Main data transformation engine
 * Optimized for performance with large datasets
 */
export class DataTransformer {
  /**
   * Transform raw data according to chart configuration
   */
  static transform(rawData: any[], config: ChartConfig): TransformedData {
    let processedData = [...rawData];
    
    // Step 1: Apply filters
    if (config.filters.length > 0) {
      processedData = this.applyFilters(processedData, config.filters);
    }
    
    // Step 2: Apply aggregations
    const aggregatedData = this.applyAggregations(processedData, config);
    
    // Step 3: Apply sorting
    if (config.globalSort) {
      aggregatedData.sort((a, b) => {
        const field = config.globalSort!.fieldId;
        const direction = config.globalSort!.direction;
        const aVal = a[field];
        const bVal = b[field];
        
        if (direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    // Step 4: Apply axis limits (top/bottom N)
    let finalData = aggregatedData;
    if (config.xAxis?.limit) {
      finalData = aggregatedData.slice(0, config.xAxis.limit);
    }
    
    return {
      data: finalData,
      fields: config.fields,
      metadata: {
        totalRecords: rawData.length,
        filteredRecords: processedData.length,
        aggregations: this.calculateMetadata(finalData, config.fields)
      }
    };
  }
  
  /**
   * Apply filters to dataset
   */
  private static applyFilters(data: any[], filters: ChartFilter[]): any[] {
    return data.filter(record => {
      return filters.every(filter => {
        if (!filter.enabled) return true;
        
        const fieldValue = this.getNestedValue(record, filter.fieldId);
        return this.evaluateFilter(fieldValue, filter.operator, filter.value);
      });
    });
  }
  
  /**
   * Evaluate a single filter condition
   */
  private static evaluateFilter(fieldValue: any, operator: FilterOperator, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'notEquals':
        return fieldValue !== filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'greaterThan':
        return Number(fieldValue) > Number(filterValue);
      case 'lessThan':
        return Number(fieldValue) < Number(filterValue);
      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(filterValue);
      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(filterValue);
      case 'between':
        return Number(fieldValue) >= Number(filterValue[0]) && Number(fieldValue) <= Number(filterValue[1]);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      default:
        return true;
    }
  }
  
  /**
   * Apply aggregations based on chart type and configuration
   */
  private static applyAggregations(data: any[], config: ChartConfig): any[] {
    // If no aggregation needed (scatter, line with time series), return as is
    if (['scatter', 'bubble'].includes(config.type)) {
      return data;
    }
    
    // Group by dimension(s)
    const dimensions = config.fields.filter(f => f.type === 'dimension');
    const measures = config.fields.filter(f => f.type === 'measure');
    
    if (dimensions.length === 0) {
      // No grouping, just aggregate all data
      return [this.aggregateGroup(data, measures)];
    }
    
    // Group data by dimensions
    const groups = this.groupBy(data, dimensions.map(d => d.id));
    
    // Aggregate each group
    return Object.entries(groups).map(([key, groupData]) => {
      const aggregated = this.aggregateGroup(groupData, measures);
      
      // Add dimension values
      dimensions.forEach(dim => {
        aggregated[dim.id] = groupData[0][dim.id];
        aggregated[dim.name] = groupData[0][dim.id]; // For display
      });
      
      return aggregated;
    });
  }
  
  /**
   * Group data by multiple fields
   */
  private static groupBy(data: any[], fields: string[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    data.forEach(record => {
      const key = fields.map(f => this.getNestedValue(record, f)).join('|');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    
    return groups;
  }
  
  /**
   * Aggregate a group of records based on measure configurations
   */
  private static aggregateGroup(group: any[], measures: DataField[]): any {
    const result: any = {};
    
    measures.forEach(measure => {
      const aggregation = measure.aggregation || (measure.id === '_count' ? 'count' : 'sum');

      if (aggregation === 'count' || measure.id === '_count') {
        result[measure.id] = group.length;
        result[measure.name] = group.length;
        return;
      }

      const values = group.map(r => this.getNestedValue(r, measure.id)).filter(v => v != null);
      result[measure.id] = this.aggregate(values, aggregation);
      result[measure.name] = result[measure.id];
    });
    
    return result;
  }
  
  /**
   * Perform aggregation on array of values
   */
  private static aggregate(values: any[], type: AggregationType): number {
    if (values.length === 0) return 0;
    
    switch (type) {
      case 'sum':
        return values.reduce((sum, val) => sum + Number(val), 0);
      case 'avg':
        return values.reduce((sum, val) => sum + Number(val), 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values.map(Number));
      case 'max':
        return Math.max(...values.map(Number));
      case 'median':
        const sorted = [...values].map(Number).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      case 'distinct':
        return new Set(values).size;
      default:
        return 0;
    }
  }
  
  /**
   * Calculate metadata and summary statistics
   */
  private static calculateMetadata(data: any[], fields: DataField[]): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    fields.filter(f => f.type === 'measure').forEach(field => {
      const values = data.map(d => d[field.id]).filter(v => v != null);
      
      metadata[field.id] = {
        sum: this.aggregate(values, 'sum'),
        avg: this.aggregate(values, 'avg'),
        min: this.aggregate(values, 'min'),
        max: this.aggregate(values, 'max'),
        count: values.length
      };
    });
    
    return metadata;
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Pivot data for specific chart types
   */
  static pivot(data: any[], rowField: string, colField: string, valueField: string, aggregation: AggregationType = 'sum'): any[] {
    const pivoted: Record<string, any> = {};
    
    data.forEach(record => {
      const rowKey = record[rowField];
      const colKey = record[colField];
      const value = record[valueField];
      
      if (!pivoted[rowKey]) {
        pivoted[rowKey] = { [rowField]: rowKey };
      }
      
      if (!pivoted[rowKey][colKey]) {
        pivoted[rowKey][colKey] = [];
      }
      
      pivoted[rowKey][colKey].push(value);
    });
    
    // Aggregate values
    Object.keys(pivoted).forEach(rowKey => {
      Object.keys(pivoted[rowKey]).forEach(colKey => {
        if (colKey !== rowField && Array.isArray(pivoted[rowKey][colKey])) {
          pivoted[rowKey][colKey] = this.aggregate(pivoted[rowKey][colKey], aggregation);
        }
      });
    });
    
    return Object.values(pivoted);
  }
  
  /**
   * Sample large datasets for performance
   */
  static sample(data: any[], maxSize: number, method: 'random' | 'systematic' = 'systematic'): any[] {
    if (data.length <= maxSize) return data;
    
    if (method === 'random') {
      // Random sampling
      const sampled: any[] = [];
      const indices = new Set<number>();
      
      while (indices.size < maxSize) {
        indices.add(Math.floor(Math.random() * data.length));
      }
      
      return Array.from(indices).sort((a, b) => a - b).map(i => data[i]);
    } else {
      // Systematic sampling (every nth record)
      const step = Math.floor(data.length / maxSize);
      return data.filter((_, index) => index % step === 0).slice(0, maxSize);
    }
  }
  
  /**
   * Prepare data for specific chart types
   */
  static prepareForChartType(data: TransformedData, chartType: string): any[] {
    switch (chartType) {
      case 'pie':
      case 'donut':
        // Ensure we have name and value fields
        return data.data.map(d => ({
          name: d[data.fields.find(f => f.type === 'dimension')?.id || 'name'],
          value: d[data.fields.find(f => f.type === 'measure')?.id || 'value']
        }));
        
      case 'heatmap':
        // Heatmap requires x, y, and value
        return data.data.map(d => ({
          x: d[data.fields[0]?.id],
          y: d[data.fields[1]?.id],
          value: d[data.fields.find(f => f.type === 'measure')?.id || 'value']
        }));
        
      default:
        return data.data;
    }
  }
}

/**
 * Performance monitoring utility
 */
export class TransformPerformanceMonitor {
  private static timings: Record<string, number[]> = {};
  
  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (!this.timings[name]) {
      this.timings[name] = [];
    }
    this.timings[name].push(duration);
    
    // Keep only last 100 measurements
    if (this.timings[name].length > 100) {
      this.timings[name].shift();
    }
    
    return result;
  }
  
  static getStats(name: string) {
    const times = this.timings[name] || [];
    if (times.length === 0) return null;
    
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { avg, min, max, count: times.length };
  }
  
  static reset() {
    this.timings = {};
  }
}
