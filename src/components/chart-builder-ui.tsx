// Visual Chart Builder UI - Interactive drag-and-drop chart creation
// Enterprise-grade builder interface similar to Power BI/Tableau

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChartFactory, ConfigValidator, useChartBuilderStore, type ChartConfig, type ChartType, type DataField, type ChartFilter } from '@/lib/chart-builder';
import { DRIVE_LOG_CHART_PRESETS, type ChartPreset } from '@/lib/chart-builder/chart-presets';
import { ConfigureFieldsGuide } from '@/components/chart-builder/configure-fields-guide';
import { getSmartRecommendations, getRecommendedAggregation } from '@/lib/chart-builder/field-recommendations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart,
  Activity,
  TrendingUp,
  Grid3x3,
  Layers,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  Eye,
  Settings,
  Filter,
  Palette,
  ChevronRight,
  GripVertical,
  X,
  CheckCircle,
  Sparkles,
  Lightbulb,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartBuilderUIProps {
  open: boolean;
  onClose: () => void;
  data?: any[];
  initialConfig?: Partial<ChartConfig>;
  onSave?: (config: ChartConfig) => void;
}

/**
 * Visual Chart Builder - Main Component
 */
export function ChartBuilderUI({ open, onClose, data = [], initialConfig, onSave }: ChartBuilderUIProps) {
  const { activeConfig, setActiveConfig, saveConfig, templates } = useChartBuilderStore();
  const [activeTab, setActiveTab] = useState<'type' | 'fields' | 'filters' | 'style' | 'preview'>('type');
  const [config, setConfig] = useState<Partial<ChartConfig>>(initialConfig || {});
  const [availableFields, setAvailableFields] = useState<DataField[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPresets, setShowPresets] = useState(!initialConfig?.type);
  const [styleRevision, setStyleRevision] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setConfig(initialConfig);
      setShowPresets(false);
      if (initialConfig.fields?.length) {
        setActiveTab('fields');
      } else if (initialConfig.type) {
        setActiveTab('fields');
      }
    }
  }, [open, initialConfig]);

  // Infer fields from data on mount
  useEffect(() => {
    if (data.length > 0) {
      const fields = inferFieldsFromData(data);
      setAvailableFields(fields);
    }
  }, [data]);

  // Validate configuration on changes
  useEffect(() => {
    if (config.type && config.fields) {
      const fullConfig = buildFullConfig(config);
      const validation = ConfigValidator.validate(fullConfig);
      setValidationErrors(validation.errors.map(e => e.message));
    }
  }, [config]);

  const buildFullConfig = (partial: Partial<ChartConfig>): ChartConfig => {
    return {
      id: partial.id || `chart-${Date.now()}`,
      name: partial.name || 'New Chart',
      type: partial.type || 'bar',
      fields: partial.fields || [],
      filters: partial.filters || [],
      xAxis: partial.xAxis || { fieldId: '' },
      yAxis: partial.yAxis || { fieldId: '' },
      colors: partial.colors || { type: 'categorical' },
      legend: partial.legend || { show: true, position: 'bottom' },
      style: partial.style || { width: '100%', height: 400 },
      interactions: partial.interactions || { enabled: true }
    };
  };

  const handleSave = async () => {
    const fullConfig = buildFullConfig(config);
    const validation = ConfigValidator.validate(fullConfig);
    
    if (validation.valid) {
      saveConfig(fullConfig);
      onSave?.(fullConfig);
      
      // Export chart as image if on preview tab
      if (activeTab === 'preview') {
        try {
          // Find the chart container
          const chartElement = document.querySelector('[data-chart-preview]');
          if (chartElement) {
            // Dynamically import html2canvas to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            
            // Convert SVG elements to canvas before capturing
            // This ensures bars and chart elements are properly rendered
            const canvas = await html2canvas(chartElement as HTMLElement, {
              backgroundColor: '#ffffff',
              scale: 2, // Higher quality
              logging: false,
              useCORS: true, // Allow cross-origin images
              allowTaint: true, // Allow cross-origin content
              foreignObjectRendering: true, // Better SVG support
              width: chartElement.scrollWidth,
              height: chartElement.scrollHeight,
              windowWidth: chartElement.scrollWidth,
              windowHeight: chartElement.scrollHeight,
              onclone: (clonedDoc) => {
                // Ensure all SVG elements have proper dimensions
                const svgs = clonedDoc.querySelectorAll('svg');
                svgs.forEach((svg: any) => {
                  if (!svg.getAttribute('width')) {
                    svg.setAttribute('width', svg.getBoundingClientRect().width);
                  }
                  if (!svg.getAttribute('height')) {
                    svg.setAttribute('height', svg.getBoundingClientRect().height);
                  }
                });
              }
            });
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `${config.name || 'chart'}-${Date.now()}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
              }
            });
          }
        } catch (error) {
          console.error('Failed to export chart:', error);
        }
      }
      
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] md:max-w-[92vw] lg:max-w-[88vw] xl:max-w-[85vw] w-full h-[96vh] md:h-[92vh] lg:h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b bg-gradient-to-r from-background via-muted/20 to-background">
          <DialogTitle className="text-lg md:text-xl lg:text-2xl flex items-center gap-2 font-bold">
            <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 border border-primary/20">
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <span className="hidden sm:inline">Visual Chart Builder</span>
            <span className="sm:hidden">Chart Builder</span>
            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[10px] md:text-xs px-1.5 md:px-2">
              2026
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            <span className="hidden md:inline">Create and customize interactive charts with drag-and-drop ease • </span>Touch-optimized
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Navigation - Horizontal on mobile, Vertical on desktop */}
          <div className="md:w-16 lg:w-20 border-b md:border-b-0 md:border-r bg-muted/30 flex flex-row md:flex-col items-center py-2 md:py-4 gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible scrollbar-thin">
            <BuilderNavButton
              icon={Grid3x3}
              label="Type"
              active={activeTab === 'type'}
              onClick={() => setActiveTab('type')}
            />
            <BuilderNavButton
              icon={Layers}
              label="Fields"
              active={activeTab === 'fields'}
              onClick={() => setActiveTab('fields')}
            />
            <BuilderNavButton
              icon={Filter}
              label="Filters"
              active={activeTab === 'filters'}
              onClick={() => setActiveTab('filters')}
            />
            <BuilderNavButton
              icon={Palette}
              label="Style"
              active={activeTab === 'style'}
              onClick={() => setActiveTab('style')}
            />
            <BuilderNavButton
              icon={Eye}
              label="Preview"
              active={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} className="h-full flex flex-col">
              <TabsContent value="type" className="flex-1 m-0 p-3 md:p-4 lg:p-6 overflow-y-auto">
                {showPresets && (
                  <ChartPresetGallery
                    onSelectPreset={(preset) => {
                      setConfig({
                        ...config,
                        type: preset.chartType,
                        name: preset.name,
                        ...preset.config
                      });
                      setShowPresets(false);
                    }}
                    onSkip={() => setShowPresets(false)}
                  />
                )}
                {!showPresets && (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPresets(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        View Templates
                      </Button>
                    </div>
                    <ChartTypeSelector
                      selected={config.type}
                      onSelect={(type) => setConfig({ ...config, type })}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="fields" className="flex-1 m-0 p-3 md:p-4 lg:p-6 overflow-y-auto">
                <FieldMapper
                  chartType={config.type}
                  availableFields={availableFields}
                  selectedFields={config.fields || []}
                  onChange={(fields) => setConfig({ ...config, fields })}
                />
              </TabsContent>

              <TabsContent value="filters" className="flex-1 m-0 p-3 md:p-4 lg:p-6 overflow-y-auto">
                <FilterBuilder
                  availableFields={availableFields}
                  filters={config.filters || []}
                  onChange={(filters) => setConfig({ ...config, filters })}
                />
              </TabsContent>

              <TabsContent value="style" className="flex-1 m-0 p-3 md:p-4 lg:p-6 overflow-y-auto">
                <StyleCustomizer
                  config={config}
                  onChange={(updates) => setConfig({ ...config, ...updates })}
                  onApply={() => setStyleRevision((n) => n + 1)}
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 m-0 p-3 md:p-4 lg:p-6 overflow-y-auto">
                <ChartPreview
                  key={styleRevision}
                  config={buildFullConfig(config)}
                  data={data}
                  errors={validationErrors}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions - Progressive Disclosure Navigation */}
        <div className="border-t px-3 md:px-4 lg:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-muted/30 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            {validationErrors.length > 0 && (
              <span className="text-xs md:text-sm text-destructive font-medium">
                {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}
              </span>
            )}
            {activeTab !== 'preview' && validationErrors.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {activeTab === 'type' && 'Choose a chart type to continue'}
                {activeTab === 'fields' && 'Map your data fields'}
                {activeTab === 'filters' && 'Add filters (optional)'}
                {activeTab === 'style' && 'Customize appearance'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Type Tab: Only Next */}
            {activeTab === 'type' && (
              <Button 
                onClick={() => setActiveTab('fields')} 
                className="flex-1 sm:flex-none h-10 md:h-9"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {/* Fields Tab: Back and Next */}
            {activeTab === 'fields' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('type')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  <span>Back</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('filters')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* Filters Tab: Back and Next */}
            {activeTab === 'filters' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('fields')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  <span>Back</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('style')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* Style Tab: Back and Next */}
            {activeTab === 'style' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('filters')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  <span>Back</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('preview')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <span>Preview</span>
                  <Eye className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* Preview Tab: Back, Cancel, and Save Chart */}
            {activeTab === 'preview' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('style')} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  <span>Back</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={validationErrors.length > 0} 
                  className="flex-1 sm:flex-none h-10 md:h-9"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Save Chart</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Navigation Button Component - Touch-optimized
 */
function BuilderNavButton({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-w-[48px] md:w-12 lg:w-14 h-12 md:h-12 lg:h-14 rounded-lg flex flex-col md:flex-row items-center justify-center transition-all px-2 md:px-0',
        'hover:bg-primary/10 active:scale-95 relative group touch-manipulation',
        active && 'bg-primary text-primary-foreground hover:bg-primary shadow-md'
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-5 w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" />
      <span className="text-[10px] mt-0.5 md:hidden font-medium">{label}</span>
      {/* Desktop tooltip */}
      <div className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border shadow-lg">
        {label}
      </div>
    </button>
  );
}

/**
 * Chart Preset Gallery - Quick start templates
 */
function ChartPresetGallery({ onSelectPreset, onSkip }: {
  onSelectPreset: (preset: ChartPreset) => void;
  onSkip: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ChartPreset['category'] | 'all'>('all');
  
  const categories: Array<{ value: ChartPreset['category'] | 'all'; label: string; icon: React.ElementType; color: string }> = [
    { value: 'all', label: 'All Templates', icon: Sparkles, color: 'text-purple-500' },
    { value: 'performance', label: 'Performance', icon: TrendingUp, color: 'text-blue-500' },
    { value: 'efficiency', label: 'Efficiency', icon: Zap, color: 'text-green-500' },
    { value: 'trends', label: 'Trends', icon: LineChart, color: 'text-pink-500' },
    { value: 'operations', label: 'Operations', icon: Settings, color: 'text-orange-500' },
    { value: 'insights', label: 'Insights', icon: Lightbulb, color: 'text-amber-500' },
  ];

  const filteredPresets = selectedCategory === 'all' 
    ? DRIVE_LOG_CHART_PRESETS 
    : DRIVE_LOG_CHART_PRESETS.filter(p => p.category === selectedCategory);

  const getDifficultyColor = (difficulty: ChartPreset['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400';
      case 'intermediate': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
      case 'advanced': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400';
    }
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 md:space-y-6 pb-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick Start Templates
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Pre-configured charts optimized for drive log analytics
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Build Custom →
            </Button>
          </div>
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(({ value, label, icon: Icon, color }) => (
              <Button
                key={value}
                variant={selectedCategory === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(value)}
                className="h-8 gap-1.5"
              >
                <Icon className={cn('h-3.5 w-3.5', selectedCategory === value ? '' : color)} />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredPresets.map((preset) => (
            <Card
              key={preset.id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-lg active:scale-[0.98] group relative overflow-hidden"
              onClick={() => onSelectPreset(preset)}
            >
              {/* Difficulty Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0.5', getDifficultyColor(preset.difficulty))}>
                  {preset.difficulty}
                </Badge>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-3xl" role="img" aria-label={preset.name}>
                    {preset.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold mb-1 line-clamp-1">
                      {preset.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {preset.chartType}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs leading-relaxed line-clamp-2">
                  {preset.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5 pt-0">
                {/* Key Insights Preview */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Key Insights
                  </p>
                  <ul className="space-y-0.5">
                    {preset.insights.slice(0, 2).map((insight, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{insight}</span>
                      </li>
                    ))}
                    {preset.insights.length > 2 && (
                      <li className="text-xs text-muted-foreground/60">
                        +{preset.insights.length - 2} more insights
                      </li>
                    )}
                  </ul>
                </div>

                {/* Hover Action */}
                <div className="pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between text-xs text-primary font-medium">
                    <span>Use this template</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredPresets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No templates found in this category</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="mt-3"
            >
              View All Templates
            </Button>
          </div>
        )}

        {/* Quick Tip */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                Pro Tip
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Templates are pre-configured with smart defaults. You can customize any aspect after selection, including filters, colors, and field mappings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/**
 * Chart Type Selector Component
 */
function ChartTypeSelector({ selected, onSelect }: {
  selected?: ChartType;
  onSelect: (type: ChartType) => void;
}) {
  const chartTypes: Array<{
    type: ChartType;
    name: string;
    description: string;
    icon: React.ElementType;
    category: 'basic' | 'advanced' | 'specialized';
  }> = [
    { type: 'bar', name: 'Bar Chart', description: 'Compare values across categories', icon: BarChart3, category: 'basic' },
    { type: 'horizontalBar', name: 'Horizontal Bar', description: 'Horizontal category comparison', icon: BarChart3, category: 'basic' },
    { type: 'stackedBar', name: 'Stacked Bar', description: 'Compare part-to-whole relationships', icon: Layers, category: 'basic' },
    { type: 'line', name: 'Line Chart', description: 'Show trends over time', icon: LineChart, category: 'basic' },
    { type: 'area', name: 'Area Chart', description: 'Emphasize magnitude of change', icon: Activity, category: 'basic' },
    { type: 'stackedArea', name: 'Stacked Area', description: 'Show cumulative totals', icon: Layers, category: 'advanced' },
    { type: 'pie', name: 'Pie Chart', description: 'Show proportions of a whole', icon: PieChart, category: 'basic' },
    { type: 'donut', name: 'Donut Chart', description: 'Pie chart with center space', icon: PieChart, category: 'basic' },
    { type: 'scatter', name: 'Scatter Plot', description: 'Show correlation between variables', icon: ScatterChart, category: 'advanced' },
    { type: 'bubble', name: 'Bubble Chart', description: 'Three-dimensional data visualization', icon: ScatterChart, category: 'specialized' },
    { type: 'heatmap', name: 'Heatmap', description: 'Show patterns in matrix data', icon: Grid3x3, category: 'specialized' },
    { type: 'histogram', name: 'Histogram', description: 'Show distribution of data', icon: BarChart3, category: 'specialized' },
    { type: 'combo', name: 'Combo Chart', description: 'Combine multiple chart types', icon: TrendingUp, category: 'advanced' },
  ];

  const categories = ['basic', 'advanced', 'specialized'] as const;

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 md:space-y-6 pb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">Select Chart Type</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Choose the visualization that best represents your data
          </p>
        </div>

        {categories.map(category => (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 md:mb-3">
              {category} Charts
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
              {chartTypes.filter(ct => ct.category === category).map(({ type, name, description, icon: Icon }) => (
                <Card
                  key={type}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary hover:shadow-md active:scale-95 touch-manipulation',
                    selected === type && 'border-primary bg-primary/5 shadow-md'
                  )}
                  onClick={() => onSelect(type)}
                >
                  <CardHeader className="pb-1.5 pt-2 px-2.5 md:pb-1.5 md:pt-2 md:px-2">
                    <div className="flex items-start justify-between mb-1">
                      <Icon className={cn(
                        'h-4 w-4 md:h-4 md:w-4',
                        selected === type ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      {selected === type && (
                        <div className="h-3 w-3 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <div className="h-1 w-1 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-xs leading-tight">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 px-2.5 pt-0 md:pb-2 md:px-2">
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-snug line-clamp-2">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Field Mapper Component - Drag and drop field assignment with reordering
 * Mobile/Tablet: Trello-like card interface with tap-to-add buttons
 * Desktop: Traditional drag-and-drop with reordering support
 */
function FieldMapper({ chartType, availableFields, selectedFields, onChange }: {
  chartType?: ChartType;
  availableFields: DataField[];
  selectedFields: DataField[];
  onChange: (fields: DataField[]) => void;
}) {
  const [draggedField, setDraggedField] = useState<DataField | null>(null);
  const [draggedFromSelected, setDraggedFromSelected] = useState<boolean>(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverType, setDragOverType] = useState<'dimension' | 'measure' | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('all');

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragStart = (field: DataField, fromSelected: boolean = false) => {
    setDraggedField(field);
    setDraggedFromSelected(fromSelected);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'dimension' | 'measure') => {
    e.preventDefault();
    setDragOverIndex(index);
    setDragOverType(type);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDragOverType(null);
  };

  const handleDrop = (type: 'dimension' | 'measure', dropIndex?: number) => {
    if (draggedField) {
      const aggregation = type === 'measure' ? getRecommendedAggregation(draggedField.id) : undefined;
      const newField = { ...draggedField, type, ...(aggregation ? { aggregation } : {}) };
      
      if (draggedFromSelected) {
        // Reordering within or between drop zones
        const filtered = selectedFields.filter(f => f.id !== draggedField.id);
        const sameTypeFields = filtered.filter(f => f.type === type);
        const otherTypeFields = filtered.filter(f => f.type !== type);
        
        if (dropIndex !== undefined && dropIndex >= 0) {
          // Insert at specific position
          sameTypeFields.splice(dropIndex, 0, newField);
        } else {
          // Add to end
          sameTypeFields.push(newField);
        }
        
        onChange([...sameTypeFields, ...otherTypeFields]);
      } else {
        // Adding new field
        const existing = selectedFields.findIndex(f => f.id === newField.id);
        
        if (existing >= 0) {
          const updated = [...selectedFields];
          updated[existing] = newField;
          onChange(updated);
        } else {
          onChange([...selectedFields, newField]);
        }
      }
    }
    setDraggedField(null);
    setDraggedFromSelected(false);
    setDragOverIndex(null);
    setDragOverType(null);
  };

  const handleRemoveField = (fieldId: string) => {
    onChange(selectedFields.filter(f => f.id !== fieldId));
  };

  // Mobile/Tablet: Tap to add field
  const handleTapToAdd = (field: DataField, type: 'dimension' | 'measure') => {
    const aggregation = type === 'measure' ? getRecommendedAggregation(field.id) : undefined;
    const newField = { ...field, type, ...(aggregation ? { aggregation } : {}) };
    const existing = selectedFields.findIndex(f => f.id === newField.id);
    
    if (existing >= 0) {
      const updated = [...selectedFields];
      updated[existing] = newField;
      onChange(updated);
    } else {
      onChange([...selectedFields, newField]);
    }
  };

  // Mobile/Tablet: Move field up/down
  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = selectedFields.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    
    const field = selectedFields[index];
    const sameTypeFields = selectedFields.filter(f => f.type === field.type);
    const otherTypeFields = selectedFields.filter(f => f.type !== field.type);
    const indexInType = sameTypeFields.findIndex(f => f.id === fieldId);
    
    if (direction === 'up' && indexInType > 0) {
      [sameTypeFields[indexInType], sameTypeFields[indexInType - 1]] = 
      [sameTypeFields[indexInType - 1], sameTypeFields[indexInType]];
    } else if (direction === 'down' && indexInType < sameTypeFields.length - 1) {
      [sameTypeFields[indexInType], sameTypeFields[indexInType + 1]] = 
      [sameTypeFields[indexInType + 1], sameTypeFields[indexInType]];
    }
    
    onChange([...sameTypeFields, ...otherTypeFields]);
  };

  if (!chartType) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <ChevronRight className="h-12 w-12 mx-auto" />
          <p>Select a chart type first</p>
        </div>
      </div>
    );
  }

  // Get smart recommendations based on chart type
  const recommendations = getSmartRecommendations(chartType, availableFields);

  // Mobile/Tablet Trello-like Interface
  if (isMobile) {
    return (
      <ScrollArea className="h-full w-full">
        <div className="space-y-4 pb-4">
          <div>
            <h3 className="text-base font-semibold mb-1">Configure Fields</h3>
            <p className="text-xs text-muted-foreground">
              Tap to add fields, swipe to reorder
            </p>
          </div>

        {/* Smart Recommendations Banner */}
        {(recommendations.dimensions.length > 0 || recommendations.measures.length > 0) && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Smart Recommendations
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed mb-3">
                {recommendations.reasoning}
              </CardDescription>

              <ConfigureFieldsGuide
                chartType={chartType}
                recommendations={recommendations}
                selectedFields={selectedFields}
                availableFields={availableFields}
                variant="mobile"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.dimensions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested Dimensions:</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.dimensions.map(fieldId => {
                      const field = availableFields.find(f => f.id === fieldId);
                      if (!field) return null;
                      const isSelected = selectedFields.some(sf => sf.id === fieldId);
                      return (
                        <Button
                          key={fieldId}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => !isSelected && handleTapToAdd(field, 'dimension')}
                          disabled={isSelected}
                          className="h-auto py-1.5 px-3 text-xs"
                        >
                          {isSelected && <CheckCircle className="h-3 w-3 mr-1" />}
                          {!isSelected && <Plus className="h-3 w-3 mr-1" />}
                          {field.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {recommendations.measures.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested Measures:</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.measures.map(fieldId => {
                      const field = availableFields.find(f => f.id === fieldId);
                      if (!field) return null;
                      const isSelected = selectedFields.some(sf => sf.id === fieldId);
                      return (
                        <Button
                          key={fieldId}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => !isSelected && handleTapToAdd(field, 'measure')}
                          disabled={isSelected}
                          className="h-auto py-1.5 px-3 text-xs"
                        >
                          {isSelected && <CheckCircle className="h-3 w-3 mr-1" />}
                          {!isSelected && <Plus className="h-3 w-3 mr-1" />}
                          {field.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dimensions Section */}
        <Card className="border-2 border-dashed border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Dimensions (Categories)
            </CardTitle>
            <CardDescription className="text-xs">
              Tap fields below to add as dimensions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Selected Dimensions */}
            {selectedFields.filter(f => f.type === 'dimension').length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedFields.filter(f => f.type === 'dimension').map((field, index, arr) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveField(field.id, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3 -rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveField(field.id, 'down')}
                        disabled={index === arr.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.name}</p>
                      <p className="text-xs text-muted-foreground">{field.dataType}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Available Fields for Dimensions */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Available Fields:</p>
              <div className="flex flex-wrap gap-2">
                {availableFields
                  .filter(f => !selectedFields.find(sf => sf.id === f.id && sf.type === 'dimension'))
                  .map(field => (
                    <Button
                      key={field.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTapToAdd(field, 'dimension')}
                      className="h-auto py-2 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {field.name}
                    </Button>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Measures Section */}
        <Card className="border-2 border-dashed border-green-200 dark:border-green-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Measures (Values)
            </CardTitle>
            <CardDescription className="text-xs">
              Tap fields below to add as measures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Selected Measures */}
            {selectedFields.filter(f => f.type === 'measure').length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedFields.filter(f => f.type === 'measure').map((field, index, arr) => (
                  <div
                    key={field.id}
                    className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveField(field.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="h-3 w-3 -rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveField(field.id, 'down')}
                          disabled={index === arr.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{field.name}</p>
                        <p className="text-xs text-muted-foreground">{field.dataType}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      value={field.aggregation}
                      onValueChange={(agg: any) => {
                        const updated = selectedFields.map(f =>
                          f.id === field.id ? { ...f, aggregation: agg } : f
                        );
                        onChange(updated);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select aggregation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="min">Min</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                        <SelectItem value="median">Median</SelectItem>
                        <SelectItem value="distinct">Distinct Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {/* Available Fields for Measures */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Available Fields:</p>
              <div className="flex flex-wrap gap-2">
                {availableFields
                  .filter(f => !selectedFields.find(sf => sf.id === f.id && sf.type === 'measure'))
                  .map(field => (
                    <Button
                      key={field.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTapToAdd(field, 'measure')}
                      className="h-auto py-2 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {field.name}
                    </Button>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
    );
  }

  // Desktop: Traditional drag-and-drop interface
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Fields</h3>
        <p className="text-sm text-muted-foreground">
          Drag fields from available data to dimensions and measures
        </p>
      </div>

      <ConfigureFieldsGuide
        chartType={chartType}
        recommendations={recommendations}
        selectedFields={selectedFields}
        availableFields={availableFields}
        variant="desktop"
      />

      {/* Smart Recommendations Banner - Desktop */}
      {(recommendations.dimensions.length > 0 || recommendations.measures.length > 0) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Smart Recommendations for {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed mt-1">
                  {recommendations.reasoning}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.dimensions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recommended Dimensions
                  </p>
                  <div className="space-y-2">
                    {recommendations.dimensions.map(fieldId => {
                      const field = availableFields.find(f => f.id === fieldId);
                      if (!field) return null;
                      const isSelected = selectedFields.some(sf => sf.id === fieldId);
                      return (
                        <div
                          key={fieldId}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-sm transition-all",
                            isSelected 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-background border-border hover:border-primary/50 cursor-pointer"
                          )}
                          onClick={() => !isSelected && handleTapToAdd(field, 'dimension')}
                        >
                          {isSelected ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{field.name}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{field.dataType}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {recommendations.measures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recommended Measures
                  </p>
                  <div className="space-y-2">
                    {recommendations.measures.map(fieldId => {
                      const field = availableFields.find(f => f.id === fieldId);
                      if (!field) return null;
                      const isSelected = selectedFields.some(sf => sf.id === fieldId);
                      return (
                        <div
                          key={fieldId}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-sm transition-all",
                            isSelected 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-background border-border hover:border-primary/50 cursor-pointer"
                          )}
                          onClick={() => !isSelected && handleTapToAdd(field, 'measure')}
                        >
                          {isSelected ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{field.name}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{field.dataType}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Fields</CardTitle>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: 'All', value: 'all' },
                { label: 'Boolean', value: 'boolean' },
                { label: 'String', value: 'string' },
                { label: 'Number', value: 'number' },
                { label: 'Date', value: 'date' },
                { label: 'Array', value: 'array' },
                { label: 'Object', value: 'object' }
              ].map((filter) => (
                <Button
                  key={filter.value}
                  variant={fieldTypeFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFieldTypeFilter(filter.value)}
                  className={cn(
                    "h-7 px-3 text-xs transition-all",
                    fieldTypeFilter === filter.value && "bg-primary text-primary-foreground shadow-sm"
                  )}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-[400px]">
              {availableFields
                .filter(field => fieldTypeFilter === 'all' || field.dataType === fieldTypeFilter)
                .map(field => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(field)}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted cursor-move mb-2 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{field.name}</p>
                    <p className="text-xs text-muted-foreground">{field.dataType}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dimensions */}
        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('dimension')}
          className="border-dashed"
        >
          <CardHeader>
            <CardTitle className="text-sm">Dimensions (Categories)</CardTitle>
            <CardDescription className="text-xs">
              Fields for grouping and categorizing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-[400px]">
              {selectedFields.filter(f => f.type === 'dimension').map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(field, true)}
                  onDragOver={(e) => handleDragOver(e, index, 'dimension')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop('dimension', index);
                  }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded bg-primary/10 mb-2 transition-all",
                    "cursor-move hover:bg-primary/15 hover:shadow-md",
                    dragOverType === 'dimension' && dragOverIndex === index && "border-2 border-primary border-dashed"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{field.name}</p>
                      <p className="text-xs text-muted-foreground">{field.dataType}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {selectedFields.filter(f => f.type === 'dimension').length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Drop dimension fields here
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Measures */}
        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('measure')}
          className="border-dashed"
        >
          <CardHeader>
            <CardTitle className="text-sm">Measures (Values)</CardTitle>
            <CardDescription className="text-xs">
              Numeric fields for calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-[400px]">
              {selectedFields.filter(f => f.type === 'measure').map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(field, true)}
                  onDragOver={(e) => handleDragOver(e, index, 'measure')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop('measure', index);
                  }}
                  className={cn(
                    "space-y-2 p-2 rounded bg-primary/10 mb-2 transition-all",
                    "cursor-move hover:bg-primary/15 hover:shadow-md",
                    dragOverType === 'measure' && dragOverIndex === index && "border-2 border-primary border-dashed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{field.name}</p>
                        <p className="text-xs text-muted-foreground">{field.dataType}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={field.aggregation}
                    onValueChange={(agg: any) => {
                      const updated = selectedFields.map(f =>
                        f.id === field.id ? { ...f, aggregation: agg } : f
                      );
                      onChange(updated);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Aggregation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                      <SelectItem value="distinct">Distinct Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {selectedFields.filter(f => f.type === 'measure').length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Drop measure fields here
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Filter Builder Component
 */
function FilterBuilder({ availableFields, filters, onChange }: {
  availableFields: DataField[];
  filters: ChartFilter[];
  onChange: (filters: ChartFilter[]) => void;
}) {
  const addFilter = () => {
    const newFilter: ChartFilter = {
      id: `filter-${Date.now()}`,
      fieldId: availableFields[0]?.id || '',
      operator: 'equals',
      value: '',
      enabled: true
    };
    onChange([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<ChartFilter>) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 md:space-y-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold">Data Filters</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Filter your data before visualization
            </p>
          </div>
          <Button onClick={addFilter} className="w-full sm:w-auto h-10 md:h-9">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </div>

        <div className="space-y-3 md:space-y-4">
          {filters.map((filter, index) => (
            <Card key={filter.id}>
              <CardContent className="pt-4 md:pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs font-medium">Field</Label>
                  <Select
                    value={filter.fieldId}
                    onValueChange={(fieldId) => updateFilter(index, { fieldId })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field.id} value={field.id} className="text-sm">
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium">Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(operator: any) => updateFilter(index, { operator })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="notEquals">Not Equals</SelectItem>
                      <SelectItem value="greaterThan">Greater Than</SelectItem>
                      <SelectItem value="lessThan">Less Than</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="in">In List</SelectItem>
                      <SelectItem value="between">Between</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium">Value</Label>
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Filter value"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={filter.enabled}
                      onCheckedChange={(enabled) => updateFilter(index, { enabled })}
                    />
                    <Label className="text-xs">Enabled</Label>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeFilter(index)}
                    className="h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>

        {filters.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 md:py-12 text-center text-muted-foreground">
              <Filter className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-sm md:text-base">No filters added</p>
              <p className="text-xs md:text-sm">Click "Add Filter" to filter your data</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Style Customizer Component - Comprehensive styling with typography, colors, and themes
 * Mobile: Accordion-based collapsible sections for less scrolling
 * Desktop: Traditional grid layout
 */
function StyleCustomizer({ config, onChange, onApply }: {
  config: Partial<ChartConfig>;
  onChange: (updates: Partial<ChartConfig>) => void;
  onApply?: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Color schemes
  const colorSchemes = [
    { name: 'Default', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'] },
    { name: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22d3ee', '#2dd4bf', '#5eead4'] },
    { name: 'Forest', colors: ['#22c55e', '#84cc16', '#a3e635', '#65a30d', '#16a34a', '#15803d'] },
    { name: 'Sunset', colors: ['#f97316', '#fb923c', '#fdba74', '#f59e0b', '#fbbf24', '#fcd34d'] },
    { name: 'Purple', colors: ['#a855f7', '#c084fc', '#d8b4fe', '#8b5cf6', '#9333ea', '#7c3aed'] },
    { name: 'Monochrome', colors: ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'] },
    { name: 'Vibrant', colors: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7'] },
    { name: 'Pastel', colors: ['#fca5a5', '#fcd34d', '#bef264', '#7dd3fc', '#c4b5fd', '#f9a8d4'] },
  ];

  // Font families
  const fontFamilies = [
    { name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Open Sans', value: '"Open Sans", sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier', value: '"Courier New", monospace' },
  ];

  const applyStyles = () => {
    onChange({
      ...config,
      updatedAt: new Date(),
    });
    onApply?.();
  };

  const updateStyle = (updates: Record<string, unknown>) => {
    onChange({ style: { ...config.style, ...updates } as ChartConfig['style'] });
  };

  const updateColors = (updates: Partial<ChartConfig['colors']>) => {
    onChange({ colors: { ...config.colors, ...updates } as ChartConfig['colors'] });
  };

  // Mobile: Accordion-based UI for less scrolling
  if (isMobile) {
    return (
      <ScrollArea className="h-full w-full">
        <div className="space-y-3 pb-4">
          <div>
            <h3 className="text-base font-semibold mb-1">Chart Styling</h3>
            <p className="text-xs text-muted-foreground">
              Tap sections to expand and customize
            </p>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {/* Chart Identity */}
            <AccordionItem value="identity" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                📋 Chart Identity
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs font-medium">Chart Title</Label>
                  <Input
                    value={config.name || ''}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="My Chart"
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Height (px)</Label>
                  <Input
                    type="number"
                    min="200"
                    max="1200"
                    value={config.style?.height || 400}
                    onChange={(e) => updateStyle({ height: parseInt(e.target.value) || 400 })}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Color Scheme */}
            <AccordionItem value="colors" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                🎨 Color Scheme
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {colorSchemes.map(scheme => (
                    <button
                      key={scheme.name}
                      onClick={() => updateColors({ type: 'categorical', customColors: scheme.colors })}
                      className={cn(
                        'p-2 rounded-lg border-2 transition-all active:scale-95',
                        JSON.stringify(config.colors?.customColors) === JSON.stringify(scheme.colors)
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className="flex gap-0.5 mb-1.5">
                        {scheme.colors.slice(0, 6).map((color, i) => (
                          <div
                            key={i}
                            className="flex-1 h-4 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] font-medium text-center">{scheme.name}</p>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Typography */}
            <AccordionItem value="typography" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                A Typography
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs font-medium">Font Family</Label>
                  <Select
                    value={config.style?.fontFamily || fontFamilies[0].value}
                    onValueChange={(fontFamily) => updateStyle({ fontFamily })}
                  >
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map(font => (
                        <SelectItem key={font.value} value={font.value} className="text-sm">
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium">Base Size</Label>
                    <Input
                      type="number"
                      min="8"
                      max="24"
                      value={config.style?.fontSize || 12}
                      onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 12 })}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Title Size</Label>
                    <Input
                      type="number"
                      min="10"
                      max="32"
                      value={(config.style as any)?.titleFontSize || 16}
                      onChange={(e) => updateStyle({ titleFontSize: parseInt(e.target.value) || 16 })}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Background & Grid */}
            <AccordionItem value="background" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                🖼️ Background & Grid
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs font-medium">Background Color</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <Input
                      type="color"
                      value={config.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="h-9 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="h-9 flex-1 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Grid Color</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <Input
                      type="color"
                      value={(config.style as any)?.gridColor || '#e5e7eb'}
                      onChange={(e) => updateStyle({ gridColor: e.target.value })}
                      className="h-9 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={(config.style as any)?.gridColor || '#e5e7eb'}
                      onChange={(e) => updateStyle({ gridColor: e.target.value })}
                      className="h-9 flex-1 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Label className="text-xs font-medium">Show Grid</Label>
                  <Switch
                    checked={(config.style as any)?.showGrid ?? true}
                    onCheckedChange={(showGrid) => updateStyle({ showGrid })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Axes */}
            <AccordionItem value="axes" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                📊 Axes
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs font-medium">X-Axis Label</Label>
                  <Input
                    value={config.xAxis?.label || ''}
                    onChange={(e) => onChange({
                      xAxis: { ...config.xAxis, fieldId: config.xAxis?.fieldId || '', label: e.target.value } as any
                    })}
                    placeholder="Horizontal axis"
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Y-Axis Label</Label>
                  <Input
                    value={config.yAxis?.label || ''}
                    onChange={(e) => onChange({
                      yAxis: { ...config.yAxis, fieldId: config.yAxis?.fieldId || '', label: e.target.value } as any
                    })}
                    placeholder="Vertical axis"
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Legend */}
            <AccordionItem value="legend" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                📝 Legend
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs font-medium">Legend Title</Label>
                  <Input
                    value={(config.legend as any)?.title || ''}
                    onChange={(e) => onChange({
                      legend: { ...config.legend, show: config.legend?.show ?? true, position: config.legend?.position || 'bottom', title: e.target.value } as any
                    })}
                    placeholder="Legend"
                    className="h-9 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Position</Label>
                  <Select
                    value={config.legend?.position || 'bottom'}
                    onValueChange={(position: any) => onChange({
                      legend: { ...config.legend, position, show: config.legend?.show ?? true }
                    })}
                  >
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Label className="text-xs font-medium">Show Legend</Label>
                  <Switch
                    checked={config.legend?.show ?? true}
                    onCheckedChange={(show) => onChange({
                      legend: { ...config.legend, show, position: config.legend?.position || 'bottom' }
                    })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Interactions */}
            <AccordionItem value="interactions" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                ⚡ Interactions
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Enable All</Label>
                    <Switch
                      checked={config.interactions?.enabled ?? true}
                      onCheckedChange={(enabled) => onChange({
                        interactions: { ...config.interactions, enabled }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Clickable</Label>
                    <Switch
                      checked={config.interactions?.clickable ?? true}
                      onCheckedChange={(clickable) => onChange({
                        interactions: { ...config.interactions, enabled: true, clickable }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Zoomable</Label>
                    <Switch
                      checked={config.interactions?.zoomable ?? false}
                      onCheckedChange={(zoomable) => onChange({
                        interactions: { ...config.interactions, enabled: true, zoomable }
                      })}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          {/* Apply Button */}
          <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t">
            <Button 
              className="w-full" 
              size="lg"
              onClick={applyStyles}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Apply Styles
            </Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Desktop: Traditional grid layout
  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 md:space-y-6 pb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">Chart Styling</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Customize colors, typography, and appearance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {/* Chart Identity */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Chart Identity</CardTitle>
              <CardDescription className="text-xs">Basic information and dimensions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs font-medium">Chart Title</Label>
                  <Input
                    value={config.name || ''}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="My Awesome Chart"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Height (px)</Label>
                  <Input
                    type="number"
                    min="200"
                    max="1200"
                    value={config.style?.height || 400}
                    onChange={(e) => updateStyle({ height: parseInt(e.target.value) || 400 })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">A</span>
                Typography
              </CardTitle>
              <CardDescription className="text-xs">Font family and text sizing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs font-medium">Font Family</Label>
                  <Select
                    value={config.style?.fontFamily || fontFamilies[0].value}
                    onValueChange={(fontFamily) => updateStyle({ fontFamily })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map(font => (
                        <SelectItem key={font.value} value={font.value} className="text-sm">
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Base Font Size (px)</Label>
                  <Input
                    type="number"
                    min="8"
                    max="24"
                    value={config.style?.fontSize || 12}
                    onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 12 })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs font-medium">Title Size (px)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="32"
                    value={(config.style as any)?.titleFontSize || 16}
                    onChange={(e) => updateStyle({ titleFontSize: parseInt(e.target.value) || 16 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Axis Label Size</Label>
                  <Input
                    type="number"
                    min="8"
                    max="20"
                    value={(config.style as any)?.axisLabelFontSize || 12}
                    onChange={(e) => updateStyle({ axisLabelFontSize: parseInt(e.target.value) || 12 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Legend Size</Label>
                  <Input
                    type="number"
                    min="8"
                    max="18"
                    value={(config.style as any)?.legendFontSize || 11}
                    onChange={(e) => updateStyle({ legendFontSize: parseInt(e.target.value) || 11 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Label Size</Label>
                  <Input
                    type="number"
                    min="8"
                    max="16"
                    value={(config.style as any)?.labelFontSize || 10}
                    onChange={(e) => updateStyle({ labelFontSize: parseInt(e.target.value) || 10 })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Scheme
              </CardTitle>
              <CardDescription className="text-xs">Predefined color palettes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2 md:gap-3">
                {colorSchemes.map(scheme => (
                  <button
                    key={scheme.name}
                    onClick={() => updateColors({ type: 'categorical', customColors: scheme.colors })}
                    className={cn(
                      'p-2 md:p-3 rounded-lg border-2 transition-all hover:shadow-md active:scale-95',
                      JSON.stringify(config.colors?.customColors) === JSON.stringify(scheme.colors)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex gap-0.5 md:gap-1 mb-1.5 md:mb-2">
                      {scheme.colors.slice(0, 6).map((color, i) => (
                        <div
                          key={i}
                          className="flex-1 h-4 md:h-5 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-center">{scheme.name}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Background & Grid Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Background</CardTitle>
              <CardDescription className="text-xs">Chart background styling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs font-medium">Background Color</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="color"
                    value={config.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="h-9 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={config.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    placeholder="#ffffff"
                    className="h-9 flex-1 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Background Opacity</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(config.style as any)?.backgroundOpacity || 100}
                    onChange={(e) => updateStyle({ backgroundOpacity: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-medium w-10 text-right">
                    {(config.style as any)?.backgroundOpacity || 100}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid & Axis Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Grid & Axes</CardTitle>
              <CardDescription className="text-xs">Grid lines and axis colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs font-medium">Grid Color</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="color"
                    value={(config.style as any)?.gridColor || '#e5e7eb'}
                    onChange={(e) => updateStyle({ gridColor: e.target.value })}
                    className="h-9 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={(config.style as any)?.gridColor || '#e5e7eb'}
                    onChange={(e) => updateStyle({ gridColor: e.target.value })}
                    placeholder="#e5e7eb"
                    className="h-9 flex-1 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Axis Color</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="color"
                    value={(config.style as any)?.axisColor || '#6b7280'}
                    onChange={(e) => updateStyle({ axisColor: e.target.value })}
                    className="h-9 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={(config.style as any)?.axisColor || '#6b7280'}
                    onChange={(e) => updateStyle({ axisColor: e.target.value })}
                    placeholder="#6b7280"
                    className="h-9 flex-1 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-xs font-medium">Show Grid Lines</Label>
                <Switch
                  checked={(config.style as any)?.showGrid ?? true}
                  onCheckedChange={(showGrid) => updateStyle({ showGrid })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Axis Labels - Editable */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">X-Axis</CardTitle>
              <CardDescription className="text-xs">Horizontal axis customization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs font-medium">Axis Label</Label>
                <Input
                  value={config.xAxis?.label || ''}
                  onChange={(e) => onChange({
                    xAxis: { ...config.xAxis, fieldId: config.xAxis?.fieldId || '', label: e.target.value } as any
                  })}
                  placeholder="e.g., Time Period"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Show Label</Label>
                <Switch
                  checked={(config.xAxis as any)?.showLabel ?? true}
                  onCheckedChange={(showLabel) => onChange({
                    xAxis: { ...config.xAxis, fieldId: config.xAxis?.fieldId || '', showLabel } as any
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Y-Axis</CardTitle>
              <CardDescription className="text-xs">Vertical axis customization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs font-medium">Axis Label</Label>
                <Input
                  value={config.yAxis?.label || ''}
                  onChange={(e) => onChange({
                    yAxis: { ...config.yAxis, fieldId: config.yAxis?.fieldId || '', label: e.target.value } as any
                  })}
                  placeholder="e.g., Sales ($)"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Show Label</Label>
                <Switch
                  checked={(config.yAxis as any)?.showLabel ?? true}
                  onCheckedChange={(showLabel) => onChange({
                    yAxis: { ...config.yAxis, fieldId: config.yAxis?.fieldId || '', showLabel } as any
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legend Settings */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
              <CardDescription className="text-xs">Legend display and positioning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs font-medium">Legend Title (Optional)</Label>
                  <Input
                    value={(config.legend as any)?.title || ''}
                    onChange={(e) => onChange({
                      legend: { ...config.legend, show: config.legend?.show ?? true, position: config.legend?.position || 'bottom', title: e.target.value } as any
                    })}
                    placeholder="Legend"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Position</Label>
                  <Select
                    value={config.legend?.position || 'bottom'}
                    onValueChange={(position: any) => onChange({
                      legend: { ...config.legend, position, show: config.legend?.show ?? true }
                    })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between w-full">
                    <Label className="text-xs font-medium">Show Legend</Label>
                    <Switch
                      checked={config.legend?.show ?? true}
                      onCheckedChange={(show) => onChange({
                        legend: { ...config.legend, show, position: config.legend?.position || 'bottom' }
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactions */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Interactions</CardTitle>
              <CardDescription className="text-xs">Enable interactive features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.interactions?.enabled ?? true}
                    onCheckedChange={(enabled) => onChange({
                      interactions: { ...config.interactions, enabled }
                    })}
                  />
                  <Label className="text-xs">Enable All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.interactions?.clickable ?? true}
                    onCheckedChange={(clickable) => onChange({
                      interactions: { ...config.interactions, enabled: true, clickable }
                    })}
                  />
                  <Label className="text-xs">Clickable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.interactions?.zoomable ?? false}
                    onCheckedChange={(zoomable) => onChange({
                      interactions: { ...config.interactions, enabled: true, zoomable }
                    })}
                  />
                  <Label className="text-xs">Zoomable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.interactions?.pannable ?? false}
                    onCheckedChange={(pannable) => onChange({
                      interactions: { ...config.interactions, enabled: true, pannable }
                    })}
                  />
                  <Label className="text-xs">Pannable</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Apply Button */}
        <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t">
          <Button 
            className="w-full" 
            size="lg"
            onClick={applyStyles}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Apply Styles
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

/**
 * Chart Preview Component
 */
function ChartPreview({ config, data, errors }: {
  config: ChartConfig;
  data: any[];
  errors: string[];
}) {
  if (errors.length > 0) {
    return (
      <ScrollArea className="h-full w-full">
        <div className="flex items-center justify-center min-h-[400px] py-8">
          <Card className="max-w-md border-destructive/50 mx-4">
            <CardHeader>
              <CardTitle className="text-destructive text-base md:text-lg">Configuration Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-xs md:text-sm text-destructive flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  const chartResult = ChartFactory.create(config, data);

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 md:space-y-6 pb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold">{config.name}</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Preview your chart with live data
          </p>
        </div>

        <Card
          style={{
            backgroundColor: (config.style as { backgroundColor?: string })?.backgroundColor || undefined,
            fontFamily: config.style?.fontFamily,
          }}
        >
          <CardContent className="pt-4 md:pt-6" data-chart-preview>
            <chartResult.component />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Chart Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{config.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dimensions</p>
                <p className="font-medium">{config.fields.filter(f => f.type === 'dimension').length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Measures</p>
                <p className="font-medium">{config.fields.filter(f => f.type === 'measure').length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Filters</p>
                <p className="font-medium">{config.filters?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

/**
 * Utility function to infer fields from data
 * Samples multiple rows to better detect data types
 */
function inferFieldsFromData(data: any[]): DataField[] {
  if (data.length === 0) return [];

  // Sample multiple rows for better type inference (up to 10 rows)
  const sampleSize = Math.min(10, data.length);
  const samples = data.slice(0, sampleSize);
  const fieldMap = new Map<string, { dataType: string; count: number }>();

  // Analyze each sample row
  for (const sample of samples) {
    for (const [key, value] of Object.entries(sample)) {
      const dataType = typeof value === 'number' ? 'number' :
                       value instanceof Date ? 'date' :
                       typeof value === 'boolean' ? 'boolean' : 'string';

      if (fieldMap.has(key)) {
        const existing = fieldMap.get(key)!;
        // Prioritize more specific types (number > string, date > string)
        if (dataType !== existing.dataType) {
          if (dataType === 'number' || (dataType === 'date' && existing.dataType === 'string')) {
            existing.dataType = dataType;
          }
        }
        existing.count++;
      } else {
        fieldMap.set(key, { dataType, count: 1 });
      }
    }
  }

  // Convert map to fields array
  const fields: DataField[] = [
    {
      id: '_count',
      name: 'Drive Count',
      type: 'dimension',
      dataType: 'number',
      aggregation: 'count',
    },
  ];
  for (const [key, { dataType }] of fieldMap.entries()) {
    fields.push({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      type: 'dimension',
      dataType: dataType as 'string' | 'number' | 'boolean' | 'date'
    });
  }

  // Sort by data type: number first, then string, then boolean, then date
  const typeOrder = { number: 1, string: 2, boolean: 3, date: 4 };
  fields.sort((a, b) => {
    const orderA = typeOrder[a.dataType] || 5;
    const orderB = typeOrder[b.dataType] || 5;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  return fields;
}

export default ChartBuilderUI;
