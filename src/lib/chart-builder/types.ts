// Chart Builder System - Type Definitions and Configuration Schema
// Enterprise-grade type system for dynamic chart generation

export type ChartType = 
  | 'bar'
  | 'horizontalBar'
  | 'stackedBar'
  | 'line'
  | 'area'
  | 'stackedArea'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'histogram'
  | 'combo';

export type AggregationType = 
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | 'median'
  | 'distinct';

export type DataFieldType = 'dimension' | 'measure';

export type SortDirection = 'asc' | 'desc' | 'none';

export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

// Core data field configuration
export interface DataField {
  id: string;
  name: string;
  type: DataFieldType;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  aggregation?: AggregationType;
  format?: string; // For dates and numbers
}

// Filter configuration
export interface ChartFilter {
  id: string;
  fieldId: string;
  field?: string; // Deprecated: use fieldId instead
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

// Axis configuration
export interface AxisConfig {
  fieldId?: string;
  label?: string;
  show?: boolean;
  scale?: 'linear' | 'log' | 'time' | 'categorical';
  min?: number;
  max?: number;
  format?: string;
  sort?: SortDirection;
  limit?: number; // For top/bottom N
}

// Color configuration
export interface ColorConfig {
  type: 'single' | 'gradient' | 'categorical' | 'sequential';
  value?: string; // For single color
  fieldId?: string; // For categorical coloring
  scheme?: string; // Color scheme name
  customColors?: string[]; // Custom color array
  palette?: string[]; // Custom color palette
  useTheme?: boolean; // Use app theme colors
}

// Interaction configuration
export interface InteractionConfig {
  enabled: boolean;
  tooltip?: boolean;
  zoom?: boolean;
  pan?: boolean;
  drillDown?: boolean;
  clickable?: boolean;
  zoomable?: boolean;
  pannable?: boolean;
  onClick?: (data: any) => void;
  onHover?: (data: any) => void;
}

// Legend configuration
export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  orientation?: 'horizontal' | 'vertical';
}

// Chart styling
export interface ChartStyle {
  width?: string | number;
  height?: string | number;
  margin?: { top: number; right: number; bottom: number; left: number };
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
}

// Main chart configuration
export interface ChartConfig {
  id: string;
  name: string;
  description?: string;
  type: ChartType;
  
  // Data configuration
  dataSource?: string; // Reference to data collection/table
  fields: DataField[];
  
  // Axis mappings
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  zAxis?: AxisConfig; // For bubble charts
  
  // Additional mappings
  colorBy?: ColorConfig;
  sizeBy?: string; // Field ID for bubble size
  groupBy?: string; // Field ID for grouping/stacking
  
  // Filters and sorting
  filters: ChartFilter[];
  globalSort?: { fieldId: string; direction: SortDirection };
  
  // Visual configuration
  style: ChartStyle;
  legend: LegendConfig;
  colors: ColorConfig;
  
  // Interactions
  interactions: InteractionConfig;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  tags?: string[];
}

// Saved chart template
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: ChartType;
  thumbnail?: string;
  config: Partial<ChartConfig>;
  category: 'basic' | 'advanced' | 'business' | 'analytics' | 'comparison' | 'trend' | 'distribution' | 'custom';
}

// Data transformation result
export interface TransformedData {
  data: any[];
  fields: DataField[];
  metadata: {
    totalRecords: number;
    filteredRecords: number;
    aggregations?: Record<string, any>;
  };
}

// Chart factory result
export interface ChartFactoryResult {
  component: React.ComponentType<any>;
  config: ChartConfig;
  data: TransformedData;
  error?: string;
}

// Builder state
export interface ChartBuilderState {
  currentConfig: ChartConfig | null;
  availableFields: DataField[];
  previewData: any[];
  isDirty: boolean;
  validationErrors: string[];
}

// Export for chart library integration
export interface ChartLibraryAdapter {
  type: ChartType;
  render: (config: ChartConfig, data: TransformedData) => React.ReactNode;
  validate: (config: ChartConfig) => string[];
  getDefaults: () => Partial<ChartConfig>;
}
