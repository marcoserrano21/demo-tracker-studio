# Visual Chart Builder - Integration Guide

## Quick Start (5 Minutes)

### Step 1: Import the Component

```tsx
import { ChartBuilderUI } from '@/components/chart-builder-ui';
import { useState } from 'react';
```

### Step 2: Set Up State

```tsx
const [builderOpen, setBuilderOpen] = useState(false);
```

### Step 3: Prepare Your Data

```tsx
const myData = [
  { category: 'Product A', revenue: 45000, units: 450, region: 'North' },
  { category: 'Product B', revenue: 52000, units: 520, region: 'South' },
  { category: 'Product C', revenue: 48000, units: 480, region: 'East' },
  // ... more data
];
```

### Step 4: Add the Builder

```tsx
<Button onClick={() => setBuilderOpen(true)}>
  Create Chart
</Button>

<ChartBuilderUI
  open={builderOpen}
  onClose={() => setBuilderOpen(false)}
  data={myData}
  onSave={(config) => {
    console.log('Saved chart:', config);
    // Handle save logic
  }}
/>
```

That's it! You now have a fully functional chart builder.

---

## Integration Patterns

### Pattern 1: Dashboard Builder

Create multiple charts and display them in a dashboard:

```tsx
import { ChartFactory, useChartBuilderStore } from '@/lib/chart-builder';

function Dashboard() {
  const { savedConfigs } = useChartBuilderStore();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Load your data
    fetchData().then(setData);
  }, []);
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {savedConfigs.map(config => {
        const chart = ChartFactory.create(config, data);
        return (
          <div key={config.id} className="border rounded p-4">
            <h3>{config.name}</h3>
            <chart.component />
          </div>
        );
      })}
    </div>
  );
}
```

### Pattern 2: Edit Existing Charts

Open the builder with an existing configuration:

```tsx
function ChartCard({ config }) {
  const [builderOpen, setBuilderOpen] = useState(false);
  
  return (
    <>
      <div className="chart-card">
        <Button onClick={() => setBuilderOpen(true)}>
          Edit Chart
        </Button>
      </div>
      
      <ChartBuilderUI
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        data={myData}
        initialConfig={config} // Pre-populate with existing config
        onSave={(updatedConfig) => {
          // Update the chart
        }}
      />
    </>
  );
}
```

### Pattern 3: Export Charts

Add export functionality to your charts:

```tsx
import { ChartExportUtils } from '@/lib/chart-builder';

function ChartWithExport({ config, data }) {
  const chartRef = useRef(null);
  
  const handleExport = async (format) => {
    const elementId = chartRef.current?.id;
    
    switch (format) {
      case 'png':
        await ChartExportUtils.toPNG(elementId, `${config.name}.png`);
        break;
      case 'svg':
        ChartExportUtils.toSVG(elementId, `${config.name}.svg`);
        break;
      case 'csv':
        ChartExportUtils.toCSV(data, `${config.name}.csv`);
        break;
      case 'clipboard':
        await ChartExportUtils.copyToClipboard(elementId);
        break;
    }
  };
  
  return (
    <div>
      <div id="chart-container" ref={chartRef}>
        <ChartFactory.create(config, data).component />
      </div>
      
      <div className="export-buttons">
        <Button onClick={() => handleExport('png')}>Export PNG</Button>
        <Button onClick={() => handleExport('svg')}>Export SVG</Button>
        <Button onClick={() => handleExport('csv')}>Export Data</Button>
        <Button onClick={() => handleExport('clipboard')}>Copy</Button>
      </div>
    </div>
  );
}
```

### Pattern 4: Template Gallery

Let users start from predefined templates:

```tsx
import { useChartBuilderStore } from '@/lib/chart-builder';

function TemplateGallery() {
  const { templates, createFromTemplate } = useChartBuilderStore();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const handleUseTemplate = (template) => {
    createFromTemplate(template.id);
    setSelectedTemplate(template);
    setBuilderOpen(true);
  };
  
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} onClick={() => handleUseTemplate(template)}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      
      <ChartBuilderUI
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        data={myData}
        initialConfig={selectedTemplate}
      />
    </div>
  );
}
```

---

## API Reference

### ChartBuilderUI Props

```tsx
interface ChartBuilderUIProps {
  open: boolean;              // Controls dialog visibility
  onClose: () => void;        // Callback when dialog closes
  data?: any[];               // Data array for the chart
  initialConfig?: Partial<ChartConfig>;  // Pre-populate configuration
  onSave?: (config: ChartConfig) => void; // Callback when chart is saved
}
```

### ChartFactory Methods

```tsx
// Create a chart from configuration
ChartFactory.create(config: ChartConfig, data: any[]): ChartFactoryResult

// Validate a configuration
ChartFactory.validate(config: ChartConfig): string[]

// Result contains:
{
  component: React.ComponentType,  // The chart component
  config: ChartConfig,             // The configuration used
  data: TransformedData,           // Processed data
  error?: string                   // Error message if any
}
```

### ChartExportUtils Methods

```tsx
// Export to PNG
exportToPNG(
  elementId: string,
  filename?: string,
  options?: { backgroundColor?: string; scale?: number }
): Promise<void>

// Export to SVG
exportToSVG(elementId: string, filename?: string): void

// Export to CSV
exportToCSV(
  data: any[],
  filename?: string,
  options?: { delimiter?: string; includeHeaders?: boolean }
): void

// Export to JSON
exportToJSON(data: any, filename?: string, options?: { pretty?: boolean }): void

// Copy to clipboard
copyToClipboard(elementId: string): Promise<void>
```

### Store Hooks

```tsx
// Get all store state and actions
const store = useChartBuilderStore();

// Get specific parts
const activeConfig = useActiveConfig();
const savedConfigs = useSavedConfigs();
const templates = useTemplates();
const { isBuilderOpen, activePanel } = useBuilderUI();
const dataSource = useDataSource();

// Store actions
store.saveConfig(config);
store.deleteConfig(configId);
store.loadConfig(configId);
store.createFromTemplate(templateId);
store.openBuilder();
store.closeBuilder();
```

---

## Common Use Cases

### 1. Analytics Dashboard

```tsx
// Combine with your existing analytics
import { ChartBuilderUI } from '@/components/chart-builder-ui';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

function AnalyticsPage() {
  const [customCharts, setCustomCharts] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  
  return (
    <div>
      {/* Your existing analytics */}
      <AnalyticsDashboard />
      
      {/* Custom user-created charts */}
      <section>
        <h2>Custom Charts</h2>
        <Button onClick={() => setBuilderOpen(true)}>
          Add Custom Chart
        </Button>
        <div className="grid grid-cols-2 gap-4">
          {customCharts.map(config => (
            <ChartFactory.create(config, data).component />
          ))}
        </div>
      </section>
      
      <ChartBuilderUI
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        data={analyticsData}
        onSave={(config) => {
          setCustomCharts([...customCharts, config]);
        }}
      />
    </div>
  );
}
```

### 2. Report Builder

```tsx
// Let users build custom reports
function ReportBuilder() {
  const [reportCharts, setReportCharts] = useState([]);
  
  const addChartToReport = (config) => {
    setReportCharts([...reportCharts, config]);
  };
  
  const exportReport = () => {
    // Export all charts as PDF or presentation
    reportCharts.forEach(config => {
      ChartExportUtils.toPNG(`chart-${config.id}`, `${config.name}.png`);
    });
  };
  
  return (
    <div>
      <h1>Custom Report</h1>
      <Button onClick={() => setBuilderOpen(true)}>Add Chart</Button>
      <Button onClick={exportReport}>Export Report</Button>
      
      <div className="report-content">
        {reportCharts.map(config => (
          <div key={config.id} id={`chart-${config.id}`}>
            <ChartFactory.create(config, data).component />
          </div>
        ))}
      </div>
      
      <ChartBuilderUI onSave={addChartToReport} {...props} />
    </div>
  );
}
```

### 3. Data Exploration Tool

```tsx
// Interactive data exploration
function DataExplorer({ dataset }) {
  const [filters, setFilters] = useState([]);
  const [chartConfig, setChartConfig] = useState(null);
  
  const filteredData = useMemo(() => {
    return dataset.filter(row => {
      // Apply filters
      return filters.every(filter => {
        // Filter logic
      });
    });
  }, [dataset, filters]);
  
  return (
    <div className="flex">
      {/* Left: Data table/preview */}
      <div className="w-1/2">
        <DataTable data={filteredData} />
      </div>
      
      {/* Right: Chart builder */}
      <div className="w-1/2">
        <ChartBuilderUI
          data={filteredData}
          onSave={setChartConfig}
        />
      </div>
    </div>
  );
}
```

---

## Styling & Theming

The chart builder automatically adapts to your theme using CSS custom properties:

```css
/* Your theme should define these variables */
:root {
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
  
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  /* ... other theme variables */
}

.dark {
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  /* ... dark mode variations */
}
```

The builder uses your app's existing color scheme automatically.

---

## Performance Tips

### 1. Large Datasets

Use sampling for datasets > 10,000 records:

```tsx
import { DataSampler } from '@/lib/chart-builder';

const sampledData = DataSampler.reservoirSample(largeDataset, 1000);

<ChartBuilderUI data={sampledData} />
```

### 2. Lazy Loading

Load data on demand:

```tsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  const result = await fetchData();
  setData(result);
  setLoading(false);
};

useEffect(() => {
  if (builderOpen && data.length === 0) {
    loadData();
  }
}, [builderOpen]);
```

### 3. Memoization

Memoize expensive computations:

```tsx
import { useMemoDeep } from '@/lib/chart-builder';

const processedData = useMemoDeep(() => {
  return expensiveDataTransformation(rawData);
}, [rawData]);
```

---

## Troubleshooting

### Issue: Chart not rendering

**Solution**: Check that your data structure matches field IDs:

```tsx
// ❌ Wrong
const data = [{ name: 'A', val: 100 }];
const fields = [{ id: 'category', ... }, { id: 'value', ... }];

// ✅ Correct
const data = [{ category: 'A', value: 100 }];
const fields = [{ id: 'category', ... }, { id: 'value', ... }];
```

### Issue: Validation errors

**Solution**: Each chart type has specific requirements:

- **Bar/Line/Area**: 1+ dimension, 1+ measure
- **Pie/Donut**: 1 dimension, 1 measure
- **Scatter/Bubble**: 0 dimensions, 2+ measures
- **Heatmap**: 2+ dimensions, 1 measure
- **Histogram**: 0 dimensions, 1 measure

### Issue: Export not working

**Solution**: Ensure:
1. Element has an ID
2. Browser supports Clipboard API (HTTPS required)
3. html2canvas is loaded (happens automatically)

### Issue: Performance slow

**Solution**:
1. Use sampling for large datasets
2. Limit number of data points rendered (< 1000 for scatter/bubble)
3. Use debouncing for live preview updates

---

## Next Steps

1. ✅ Try the demo at `/chart-builder`
2. 📖 Read the full documentation in `CHART_BUILDER_PHASE_2_COMPLETE.md`
3. 🎨 Customize theme colors to match your brand
4. 🔧 Integrate into your existing dashboards
5. 📊 Create custom templates for your use cases

---

## Support

- **Documentation**: `/src/lib/chart-builder/README.md`
- **Quick Reference**: `CHART_BUILDER_QUICK_REFERENCE.md`
- **Examples**: `/chart-builder` demo page
- **TypeScript Definitions**: All types are exported from `@/lib/chart-builder`

---

**Happy charting! 📊✨**
