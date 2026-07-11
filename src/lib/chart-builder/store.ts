// Chart Builder Store - State Management using Zustand
// Manages chart configurations, templates, and builder UI state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ChartConfig, 
  ChartTemplate, 
  ChartType,
  DataField 
} from './types';

/**
 * Chart Builder State Interface
 */
interface ChartBuilderState {
  // Active chart configuration
  activeConfig: ChartConfig | null;
  
  // Saved chart configurations
  savedConfigs: ChartConfig[];
  
  // Chart templates
  templates: ChartTemplate[];
  
  // UI state
  isBuilderOpen: boolean;
  activePanel: 'fields' | 'filters' | 'style' | 'preview';
  
  // Data source
  dataSource: any[] | null;
  
  // Actions
  setActiveConfig: (config: ChartConfig | null) => void;
  updateActiveConfig: (updates: Partial<ChartConfig>) => void;
  saveConfig: (config: ChartConfig) => void;
  deleteConfig: (id: string) => void;
  loadConfig: (id: string) => void;
  createFromTemplate: (template: ChartTemplate) => void;
  setDataSource: (data: any[]) => void;
  openBuilder: () => void;
  closeBuilder: () => void;
  setActivePanel: (panel: 'fields' | 'filters' | 'style' | 'preview') => void;
  resetBuilder: () => void;
  
  // Template management
  saveAsTemplate: (config: ChartConfig, name: string, description?: string) => void;
  deleteTemplate: (id: string) => void;
}

/**
 * Default chart configuration
 */
const createDefaultConfig = (): ChartConfig => ({
  id: `chart-${Date.now()}`,
  name: 'New Chart',
  type: 'bar',
  fields: [],
  filters: [],
  xAxis: {
    fieldId: '',
    label: '',
    show: true
  },
  yAxis: {
    fieldId: '',
    label: '',
    show: true
  },
  colors: {
    type: 'categorical',
    scheme: 'default',
    customColors: []
  },
  legend: {
    show: true,
    position: 'bottom'
  },
  style: {
    width: '100%',
    height: 400,
    margin: { top: 20, right: 30, bottom: 20, left: 30 }
  },
  interactions: {
    enabled: true,
    clickable: true,
    zoomable: false,
    pannable: false
  }
});

/**
 * Built-in chart templates
 */
const defaultTemplates: ChartTemplate[] = [
  {
    id: 'bar-basic',
    name: 'Basic Bar Chart',
    description: 'Simple bar chart with one dimension and one measure',
    type: 'bar',
    config: {
      ...createDefaultConfig(),
      type: 'bar',
      name: 'Bar Chart'
    },
    thumbnail: '/templates/bar-basic.png',
    category: 'basic'
  },
  {
    id: 'line-trend',
    name: 'Trend Line Chart',
    description: 'Line chart for showing trends over time',
    type: 'line',
    config: {
      ...createDefaultConfig(),
      type: 'line',
      name: 'Trend Line'
    },
    thumbnail: '/templates/line-trend.png',
    category: 'basic'
  },
  {
    id: 'pie-distribution',
    name: 'Distribution Pie Chart',
    description: 'Pie chart for showing proportions',
    type: 'pie',
    config: {
      ...createDefaultConfig(),
      type: 'pie',
      name: 'Distribution Pie'
    },
    thumbnail: '/templates/pie-distribution.png',
    category: 'basic'
  },
  {
    id: 'stacked-bar-comparison',
    name: 'Stacked Bar Comparison',
    description: 'Stacked bar chart for comparing multiple measures',
    type: 'stackedBar',
    config: {
      ...createDefaultConfig(),
      type: 'stackedBar',
      name: 'Stacked Comparison'
    },
    thumbnail: '/templates/stacked-bar.png',
    category: 'advanced'
  },
  {
    id: 'area-timeline',
    name: 'Area Timeline',
    description: 'Area chart for timeline visualizations',
    type: 'area',
    config: {
      ...createDefaultConfig(),
      type: 'area',
      name: 'Timeline Area'
    },
    thumbnail: '/templates/area-timeline.png',
    category: 'advanced'
  },
  {
    id: 'scatter-correlation',
    name: 'Scatter Plot',
    description: 'Scatter plot for showing correlations',
    type: 'scatter',
    config: {
      ...createDefaultConfig(),
      type: 'scatter',
      name: 'Scatter Correlation'
    },
    thumbnail: '/templates/scatter-correlation.png',
    category: 'advanced'
  }
];

/**
 * Chart Builder Store
 */
export const useChartBuilderStore = create<ChartBuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeConfig: null,
      savedConfigs: [],
      templates: defaultTemplates,
      isBuilderOpen: false,
      activePanel: 'fields',
      dataSource: null,
      
      // Set active configuration
      setActiveConfig: (config) => {
        set({ activeConfig: config });
      },
      
      // Update active configuration
      updateActiveConfig: (updates) => {
        const { activeConfig } = get();
        if (!activeConfig) return;
        
        set({
          activeConfig: {
            ...activeConfig,
            ...updates
          }
        });
      },
      
      // Save configuration
      saveConfig: (config) => {
        const { savedConfigs } = get();
        const existingIndex = savedConfigs.findIndex(c => c.id === config.id);
        
        if (existingIndex >= 0) {
          // Update existing
          const updated = [...savedConfigs];
          updated[existingIndex] = config;
          set({ savedConfigs: updated });
        } else {
          // Add new
          set({ savedConfigs: [...savedConfigs, config] });
        }
      },
      
      // Delete configuration
      deleteConfig: (id) => {
        const { savedConfigs } = get();
        set({
          savedConfigs: savedConfigs.filter(c => c.id !== id)
        });
      },
      
      // Load configuration
      loadConfig: (id) => {
        const { savedConfigs } = get();
        const config = savedConfigs.find(c => c.id === id);
        if (config) {
          set({ activeConfig: { ...config } });
        }
      },
      
      // Create chart from template
      createFromTemplate: (template) => {
        const baseConfig = createDefaultConfig();
        const newConfig: ChartConfig = {
          ...baseConfig,
          ...template.config,
          id: `chart-${Date.now()}`,
          name: template.name,
          type: template.type
        };
        set({ activeConfig: newConfig });
      },
      
      // Set data source
      setDataSource: (data) => {
        set({ dataSource: data });
      },
      
      // Open builder
      openBuilder: () => {
        set({ isBuilderOpen: true });
      },
      
      // Close builder
      closeBuilder: () => {
        set({ isBuilderOpen: false });
      },
      
      // Set active panel
      setActivePanel: (panel) => {
        set({ activePanel: panel });
      },
      
      // Reset builder
      resetBuilder: () => {
        set({
          activeConfig: createDefaultConfig(),
          activePanel: 'fields'
        });
      },
      
      // Save as template
      saveAsTemplate: (config, name, description) => {
        const { templates } = get();
        const newTemplate: ChartTemplate = {
          id: `template-${Date.now()}`,
          name,
          description: description || '',
          type: config.type,
          config: { ...config },
          category: 'custom'
        };
        
        set({
          templates: [...templates, newTemplate]
        });
      },
      
      // Delete template
      deleteTemplate: (id) => {
        const { templates } = get();
        set({
          templates: templates.filter(t => t.id !== id)
        });
      }
    }),
    {
      name: 'chart-builder-storage',
      partialize: (state) => ({
        savedConfigs: state.savedConfigs,
        templates: state.templates.filter(t => t.category === 'custom')
      })
    }
  )
);

/**
 * Utility hooks for specific state slices
 */

// Get active config only
export const useActiveConfig = () => useChartBuilderStore(state => state.activeConfig);

// Get saved configs only
export const useSavedConfigs = () => useChartBuilderStore(state => state.savedConfigs);

// Get templates only
export const useTemplates = () => useChartBuilderStore(state => state.templates);

// Get builder UI state
export const useBuilderUI = () => useChartBuilderStore(state => ({
  isOpen: state.isBuilderOpen,
  activePanel: state.activePanel
}));

// Get data source
export const useDataSource = () => useChartBuilderStore(state => state.dataSource);

export default useChartBuilderStore;
