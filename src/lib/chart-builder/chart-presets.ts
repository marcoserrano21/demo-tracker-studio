/**
 * Chart Builder Presets - Drive Log Analytics
 * Pre-configured chart templates optimized for EV demo drive log data
 * Award-winning recommendations based on data analysis best practices
 */

import type { ChartConfig, ChartType } from './types';

export interface ChartPreset {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'efficiency' | 'trends' | 'operations' | 'insights';
  chartType: ChartType;
  config: Partial<ChartConfig>;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  insights: string[];
  useCases: string[];
  requiredFields: string[];
}

/**
 * Pre-configured chart templates for drive log analytics
 */
export const DRIVE_LOG_CHART_PRESETS: ChartPreset[] = [
  // ========================================
  // PERFORMANCE ANALYTICS
  // ========================================
  {
    id: 'demo-drives-by-model',
    name: 'Demo Drives by Vehicle Model',
    description: 'Compare demo drive volume across different EV models',
    category: 'performance',
    chartType: 'bar',
    icon: '🚗',
    difficulty: 'beginner',
    config: {
      name: 'Demo Drives by Vehicle Model',
      type: 'bar',
      fields: [
        { id: 'vehicleModel', name: 'Vehicle Model', type: 'dimension', dataType: 'string' },
        { id: 'purpose', name: 'Purpose', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'bottom' },
    },
    insights: [
      'Identify most popular models for demo drives',
      'Optimize inventory based on demand',
      'Track seasonal model preferences',
      'Compare Model 3/Y vs Model S/X/Cybertruck popularity'
    ],
    useCases: [
      'Fleet management decisions',
      'Marketing focus allocation',
      'Inventory optimization',
      'Customer preference analysis'
    ],
    requiredFields: ['vehicleModel', 'purpose']
  },

  {
    id: 'advisor-performance-ranking',
    name: 'Advisor Performance Ranking',
    description: 'Rank advisors by total demo drives completed',
    category: 'performance',
    chartType: 'horizontalBar',
    icon: '🏆',
    difficulty: 'beginner',
    config: {
      name: 'Top Performing Advisors',
      type: 'horizontalBar',
      fields: [
        { id: 'coPilot', name: 'Advisor', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'gradient', customColors: ['#3b82f6', '#8b5cf6'] },
      legend: { show: false, position: 'right' },
    },
    insights: [
      'Identify top performers for recognition',
      'Spot coaching opportunities',
      'Track individual productivity',
      'Compare performance across team members'
    ],
    useCases: [
      'Performance reviews',
      'Team leaderboards',
      'Incentive programs',
      'Training needs assessment'
    ],
    requiredFields: ['coPilot', 'purpose']
  },

  {
    id: 'issue-detection-rate',
    name: 'Issue Detection Analysis',
    description: 'Track percentage of drives with detected issues',
    category: 'performance',
    chartType: 'pie',
    icon: '⚠️',
    difficulty: 'beginner',
    config: {
      name: 'Issues Detected vs Clean Drives',
      type: 'pie',
      fields: [
        { id: 'issueDetected', name: 'Issue Status', type: 'dimension', dataType: 'string' },
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'right' },
    },
    insights: [
      'Monitor vehicle quality trends',
      'Identify maintenance needs',
      'Track issue resolution rates',
      'Measure customer experience quality'
    ],
    useCases: [
      'Quality control monitoring',
      'Preventive maintenance scheduling',
      'Customer satisfaction analysis',
      'Service department coordination'
    ],
    requiredFields: ['issueDetected']
  },

  // ========================================
  // EFFICIENCY ANALYTICS
  // ========================================
  {
    id: 'battery-efficiency-scatter',
    name: 'Battery Usage Efficiency',
    description: 'Analyze relationship between drive duration and battery consumption',
    category: 'efficiency',
    chartType: 'scatter',
    icon: '🔋',
    difficulty: 'intermediate',
    config: {
      name: 'Drive Duration vs Battery Usage',
      type: 'scatter',
      fields: [
        { id: 'expectedDuration', name: 'Expected Duration (min)', type: 'measure', dataType: 'number' },
        { id: 'batteryDelta', name: 'Battery Used (%)', type: 'measure', dataType: 'number' },
        { id: 'vehicleModel', name: 'Model', type: 'dimension', dataType: 'string' }
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'bottom' },
    },
    insights: [
      'Identify optimal drive duration for battery efficiency',
      'Compare efficiency across models',
      'Detect unusual battery drain patterns',
      'Plan charging schedules based on usage'
    ],
    useCases: [
      'Fleet efficiency optimization',
      'Charging infrastructure planning',
      'Customer education on range',
      'Energy cost management'
    ],
    requiredFields: ['expectedDuration', 'startBattery', 'endBattery', 'vehicleModel']
  },

  {
    id: 'charging-completion-time',
    name: 'Charging Session Duration Analysis',
    description: 'Track actual vs expected charging times',
    category: 'efficiency',
    chartType: 'bar',
    icon: '⚡',
    difficulty: 'intermediate',
    config: {
      name: 'Charging Session Durations',
      type: 'bar',
      fields: [
        { id: 'vehicleModel', name: 'Vehicle Model', type: 'dimension', dataType: 'string' },
        { id: 'actualDuration', name: 'Actual Duration (min)', type: 'measure', dataType: 'number', aggregation: 'avg' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Charging', enabled: true }
      ],
      colors: { type: 'single', value: '#22c55e' },
      legend: { show: false, position: 'bottom' },
    },
    insights: [
      'Optimize charging station allocation',
      'Identify slow-charging vehicles',
      'Plan charging schedules efficiently',
      'Track battery health indicators'
    ],
    useCases: [
      'Charging infrastructure management',
      'Fleet availability optimization',
      'Maintenance scheduling',
      'Battery health monitoring'
    ],
    requiredFields: ['vehicleModel', 'purpose', 'startTime', 'endTime']
  },

  {
    id: 'battery-gain-analysis',
    name: 'Battery Charge Gained per Session',
    description: 'Measure charging efficiency by battery percentage gained',
    category: 'efficiency',
    chartType: 'horizontalBar',
    icon: '📊',
    difficulty: 'beginner',
    config: {
      name: 'Average Battery Gain by Model',
      type: 'horizontalBar',
      fields: [
        { id: 'vehicleModel', name: 'Vehicle Model', type: 'dimension', dataType: 'string' },
        { id: 'batteryGain', name: 'Battery Gained (%)', type: 'measure', dataType: 'number', aggregation: 'avg' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Charging', enabled: true }
      ],
      colors: { type: 'gradient', customColors: ['#22c55e', '#10b981'] },
      legend: { show: false, position: 'right' },
    },
    insights: [
      'Compare charging rates across models',
      'Identify underperforming chargers',
      'Optimize charge scheduling',
      'Track charging infrastructure health'
    ],
    useCases: [
      'Charging efficiency monitoring',
      'Infrastructure maintenance',
      'Model-specific charging analysis',
      'Energy cost optimization'
    ],
    requiredFields: ['vehicleModel', 'startBattery', 'endBattery', 'purpose']
  },

  // ========================================
  // TREND ANALYTICS
  // ========================================
  {
    id: 'daily-demo-volume-trend',
    name: 'Daily Demo Drive Volume',
    description: 'Track demo drive volume trends over time',
    category: 'trends',
    chartType: 'line',
    icon: '📈',
    difficulty: 'intermediate',
    config: {
      name: 'Demo Drives Over Time',
      type: 'line',
      fields: [
        { id: 'startDate', name: 'Date', type: 'dimension', dataType: 'date' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'single', value: '#3b82f6' },
      legend: { show: true, position: 'bottom' },
    },
    insights: [
      'Identify peak demand periods',
      'Spot seasonal trends',
      'Plan staffing needs',
      'Track marketing campaign effectiveness'
    ],
    useCases: [
      'Demand forecasting',
      'Staff scheduling',
      'Marketing ROI tracking',
      'Seasonal planning'
    ],
    requiredFields: ['startTime', 'purpose']
  },

  {
    id: 'hourly-activity-heatmap',
    name: 'Peak Activity Hours Heatmap',
    description: 'Visualize busiest times by day of week and hour',
    category: 'trends',
    chartType: 'heatmap',
    icon: '🔥',
    difficulty: 'advanced',
    config: {
      name: 'Activity Heatmap by Day & Hour',
      type: 'heatmap',
      fields: [
        { id: 'dayOfWeek', name: 'Day', type: 'dimension', dataType: 'string' },
        { id: 'hourOfDay', name: 'Hour', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'gradient', customColors: ['#dbeafe', '#1e40af'] },
      legend: { show: true, position: 'bottom' },
    },
    insights: [
      'Identify optimal staffing hours',
      'Plan break schedules efficiently',
      'Optimize marketing timing',
      'Understand customer behavior patterns'
    ],
    useCases: [
      'Staff scheduling optimization',
      'Marketing campaign timing',
      'Customer traffic analysis',
      'Resource allocation'
    ],
    requiredFields: ['startTime', 'purpose']
  },

  {
    id: 'weekly-performance-comparison',
    name: 'Week-over-Week Performance',
    description: 'Compare current week performance against previous weeks',
    category: 'trends',
    chartType: 'area',
    icon: '📊',
    difficulty: 'intermediate',
    config: {
      name: 'Weekly Demo Drive Trends',
      type: 'area',
      fields: [
        { id: 'weekNumber', name: 'Week', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'gradient', customColors: ['#8b5cf6', '#ec4899'] },
      legend: { show: true, position: 'top' },
    },
    insights: [
      'Track growth trends',
      'Identify performance dips',
      'Measure improvement over time',
      'Set realistic goals based on history'
    ],
    useCases: [
      'Performance tracking',
      'Goal setting',
      'Trend analysis',
      'Business intelligence reporting'
    ],
    requiredFields: ['startTime', 'purpose']
  },

  // ========================================
  // OPERATIONAL INSIGHTS
  // ========================================
  {
    id: 'advisor-specialization-matrix',
    name: 'Advisor Vehicle Specialization',
    description: 'See which advisors excel with which models',
    category: 'operations',
    chartType: 'heatmap',
    icon: '🎯',
    difficulty: 'advanced',
    config: {
      name: 'Advisor × Model Performance Matrix',
      type: 'heatmap',
      fields: [
        { id: 'coPilot', name: 'Advisor', type: 'dimension', dataType: 'string' },
        { id: 'vehicleModel', name: 'Model', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'gradient', customColors: ['#fef3c7', '#f59e0b'] },
      legend: { show: true, position: 'right' },
    },
    insights: [
      'Match advisors to customer preferences',
      'Identify training needs',
      'Optimize assignment strategies',
      'Build model expertise centers'
    ],
    useCases: [
      'Advisor assignment optimization',
      'Training program development',
      'Customer experience enhancement',
      'Expertise tracking'
    ],
    requiredFields: ['coPilot', 'vehicleModel', 'purpose']
  },

  {
    id: 'feedback-sentiment-distribution',
    name: 'Customer Feedback Sentiment',
    description: 'Analyze feedback themes and sentiment distribution',
    category: 'insights',
    chartType: 'donut',
    icon: '💬',
    difficulty: 'intermediate',
    config: {
      name: 'Feedback Categories',
      type: 'donut',
      fields: [
        { id: 'feedbackCategory', name: 'Category', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'pastel' },
      legend: { show: true, position: 'right' },
    },
    insights: [
      'Identify common customer concerns',
      'Track positive experience trends',
      'Spot training opportunities',
      'Measure service quality'
    ],
    useCases: [
      'Customer satisfaction tracking',
      'Service improvement',
      'Training gap identification',
      'Quality assurance'
    ],
    requiredFields: ['feedback', 'purpose']
  },

  {
    id: 'vehicle-utilization-bubble',
    name: 'Vehicle Utilization Analysis',
    description: 'Compare drive frequency, duration, and battery impact',
    category: 'operations',
    chartType: 'bubble',
    icon: '🎈',
    difficulty: 'advanced',
    config: {
      name: 'Vehicle Usage Patterns',
      type: 'bubble',
      fields: [
        { id: 'driveCount', name: 'Number of Drives', type: 'measure', dataType: 'number', aggregation: 'count' },
        { id: 'avgDuration', name: 'Avg Duration (min)', type: 'measure', dataType: 'number', aggregation: 'avg' },
        { id: 'batteryUsage', name: 'Avg Battery Used (%)', type: 'measure', dataType: 'number', aggregation: 'avg' },
        { id: 'vehicleModel', name: 'Model', type: 'dimension', dataType: 'string' }
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'bottom' },
    },
    insights: [
      'Balance fleet utilization',
      'Identify underutilized vehicles',
      'Optimize vehicle rotation',
      'Plan maintenance based on usage'
    ],
    useCases: [
      'Fleet management optimization',
      'Maintenance scheduling',
      'Utilization balancing',
      'ROI analysis per vehicle'
    ],
    requiredFields: ['vehicleModel', 'startTime', 'expectedDuration', 'startBattery', 'endBattery']
  },

  {
    id: 'drive-duration-distribution',
    name: 'Drive Duration Breakdown',
    description: 'Compare popularity of 40min, 24hr, and 48hr drives',
    category: 'operations',
    chartType: 'pie',
    icon: '⏱️',
    difficulty: 'beginner',
    config: {
      name: 'Demo Drive Duration Preferences',
      type: 'pie',
      fields: [
        { id: 'expectedDuration', name: 'Duration Type', type: 'dimension', dataType: 'string' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'right' },
    },
    insights: [
      'Understand customer preferences',
      'Plan vehicle availability',
      'Optimize pricing strategies',
      'Track conversion by duration'
    ],
    useCases: [
      'Product offering optimization',
      'Pricing strategy',
      'Availability planning',
      'Customer preference analysis'
    ],
    requiredFields: ['expectedDuration', 'purpose']
  },

  // ========================================
  // COMBO & ADVANCED
  // ========================================
  {
    id: 'multi-metric-performance',
    name: 'Comprehensive Performance Dashboard',
    description: 'Combined view of drives, battery, issues, and duration',
    category: 'insights',
    chartType: 'combo',
    icon: '🎛️',
    difficulty: 'advanced',
    config: {
      name: 'Multi-Metric Performance Overview',
      type: 'combo',
      fields: [
        { id: 'startDate', name: 'Date', type: 'dimension', dataType: 'date' },
        { id: 'driveCount', name: 'Drives', type: 'measure', dataType: 'number', aggregation: 'count' },
        { id: 'avgBattery', name: 'Avg Battery Used', type: 'measure', dataType: 'number', aggregation: 'avg' },
        { id: 'issueRate', name: 'Issue Rate', type: 'measure', dataType: 'number', aggregation: 'count' },
      ],
      filters: [
        { id: 'f1', fieldId: 'purpose', operator: 'equals', value: 'Demo', enabled: true }
      ],
      colors: { type: 'categorical', scheme: 'default' },
      legend: { show: true, position: 'top' },
    },
    insights: [
      'Holistic performance overview',
      'Identify correlations between metrics',
      'Track multiple KPIs simultaneously',
      'Executive-level reporting'
    ],
    useCases: [
      'Executive dashboards',
      'Comprehensive reporting',
      'Multi-dimensional analysis',
      'Strategic planning'
    ],
    requiredFields: ['startTime', 'purpose', 'startBattery', 'endBattery', 'issueDetected']
  }
];

/**
 * Get presets filtered by category
 */
export function getPresetsByCategory(category: ChartPreset['category']): ChartPreset[] {
  return DRIVE_LOG_CHART_PRESETS.filter(preset => preset.category === category);
}

/**
 * Get presets filtered by difficulty
 */
export function getPresetsByDifficulty(difficulty: ChartPreset['difficulty']): ChartPreset[] {
  return DRIVE_LOG_CHART_PRESETS.filter(preset => preset.difficulty === difficulty);
}

/**
 * Get presets filtered by chart type
 */
export function getPresetsByChartType(chartType: ChartType): ChartPreset[] {
  return DRIVE_LOG_CHART_PRESETS.filter(preset => preset.chartType === chartType);
}

/**
 * Get a specific preset by ID
 */
export function getPresetById(id: string): ChartPreset | undefined {
  return DRIVE_LOG_CHART_PRESETS.find(preset => preset.id === id);
}

/**
 * Check if all required fields are available in the dataset
 */
export function isPresetAvailable(preset: ChartPreset, availableFields: string[]): boolean {
  return preset.requiredFields.every(field => 
    availableFields.some(available => available.toLowerCase().includes(field.toLowerCase()))
  );
}
