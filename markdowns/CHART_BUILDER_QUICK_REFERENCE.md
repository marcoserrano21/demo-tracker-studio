# Chart Builder Quick Reference

## Import Everything

```typescript
import {
  // Core
  ChartFactory,
  ConfigValidator,
  DataTransformer,
  
  // State Management
  useChartBuilderStore,
  useActiveConfig,
  useSavedConfigs,
  useTemplates,
  
  // Performance
  useDebounce,
  useThrottle,
  useLazyLoad,
  
  // Types
  ChartConfig,
  ChartType,
  DataField,
  ChartFilter
} from '@/lib/chart-builder';
```

## Quick Start Examples

### 1. Create a Simple Bar Chart

```typescript
const config: ChartConfig = {
  id: 'sales-chart',
  name: 'Monthly Sales',
  type: 'bar',
  fields: [
    {
      id: 'month',
      name: 'Month',
      type: 'dimension',
      dataType: 'string'
    },
    {
      id: 'revenue',
      name: 'Revenue',
      type: 'measure',
      dataType: 'number',
      aggregation: 'sum'
    }
  ],
  filters: [],
  xAxis: { fieldId: 'month', label: 'Month' },
  yAxis: { fieldId: 'revenue', label: 'Revenue ($)' },
  colors: { type: 'categorical' },
  legend: { show: true, position: 'bottom' },
  style: { width: '100%', height: 400 },
  interactions: { enabled: true }
};

const data = [
  { month: 'Jan', revenue: 1200 },
  { month: 'Feb', revenue: 1500 },
  { month: 'Mar', revenue: 1800 }
];

// Validate and create
const validation = ConfigValidator.validate(config);
if (validation.valid) {
  const { component: Chart } = ChartFactory.create(config, data);
  return <Chart />;
}
```

### 2. Use Templates

```typescript
function ChartBuilder() {
  const { templates, createFromTemplate } = useChartBuilderStore();
  
  // Get bar chart template
  const barTemplate = templates.find(t => t.id === 'bar-basic');
  
  // Create from template
  createFromTemplate(barTemplate);
}
```

### 3. Add Filters

```typescript
const config: ChartConfig = {
  // ... other config
  filters: [
    {
      id: 'status-filter',
      fieldId: 'status',
      operator: 'equals',
      value: 'completed',
      enabled: true
    },
    {
      id: 'amount-filter',
      fieldId: 'amount',
      operator: 'greaterThan',
      value: 100,
      enabled: true
    }
  ]
};
```

### 4. Multi-Series Line Chart

```typescript
const config: ChartConfig = {
  id: 'trends',
  name: 'Sales vs Expenses',
  type: 'line',
  fields: [
    { id: 'month', name: 'Month', type: 'dimension', dataType: 'string' },
    { id: 'sales', name: 'Sales', type: 'measure', dataType: 'number', aggregation: 'sum' },
    { id: 'expenses', name: 'Expenses', type: 'measure', dataType: 'number', aggregation: 'sum' }
  ],
  // ... rest of config
};
```

### 5. Pie Chart with Aggregation

```typescript
const config: ChartConfig = {
  id: 'region-distribution',
  name: 'Sales by Region',
  type: 'pie',
  fields: [
    { id: 'region', name: 'Region', type: 'dimension', dataType: 'string' },
    { id: 'sales', name: 'Total Sales', type: 'measure', dataType: 'number', aggregation: 'sum' }
  ],
  colors: { type: 'categorical' },
  legend: { show: true, position: 'right' },
  style: { width: '100%', height: 400 },
  interactions: { enabled: true }
};
```

### 6. Performance Optimization

```typescript
import { useDebounce, useLazyLoad } from '@/lib/chart-builder';

function LargeDatasetChart({ data }: { data: any[] }) {
  // Debounce filter changes
  const debouncedFilter = useDebounce((value: string) => {
    applyFilter(value);
  }, 300);
  
  // Lazy load data
  const { items, loadMore, hasMore } = useLazyLoad(data, 100);
  
  return (
    <div>
      <input onChange={(e) => debouncedFilter(e.target.value)} />
      {/* Render first 100 items */}
      {items.map(item => <ChartRow key={item.id} data={item} />)}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

### 7. State Management

```typescript
function ChartManager() {
  const {
    activeConfig,
    setActiveConfig,
    savedConfigs,
    saveConfig,
    deleteConfig,
    loadConfig
  } = useChartBuilderStore();
  
  // Create new chart
  const handleCreate = () => {
    const newConfig = { /* ... */ };
    setActiveConfig(newConfig);
  };
  
  // Save current chart
  const handleSave = () => {
    if (activeConfig) {
      saveConfig(activeConfig);
    }
  };
  
  // Load saved chart
  const handleLoad = (id: string) => {
    loadConfig(id);
  };
  
  return (
    <div>
      <button onClick={handleCreate}>New Chart</button>
      <button onClick={handleSave}>Save Chart</button>
      {savedConfigs.map(config => (
        <button key={config.id} onClick={() => handleLoad(config.id)}>
          {config.name}
        </button>
      ))}
    </div>
  );
}
```

## Chart Types Reference

### Available Types

```typescript
type ChartType = 
  | 'bar'              // Vertical bar chart
  | 'horizontalBar'    // Horizontal bar chart
  | 'stackedBar'       // Stacked bar chart
  | 'line'             // Line chart
  | 'area'             // Area chart
  | 'stackedArea'      // Stacked area chart
  | 'pie'              // Pie chart
  | 'donut'            // Donut chart
  | 'scatter'          // Scatter plot
  | 'bubble'           // Bubble chart (Phase 2)
  | 'heatmap'          // Heatmap (Phase 2)
  | 'histogram'        // Histogram (Phase 2)
  | 'combo';           // Mixed chart types
```

### Field Requirements

| Chart Type | Dimensions | Measures | Notes |
|------------|-----------|----------|-------|
| bar, horizontalBar, stackedBar | 1+ | 1+ | |
| line, area, stackedArea | 1+ | 1+ | Multiple measures supported |
| pie, donut | 1 | 1 | Exactly one of each |
| scatter | 0 | 2+ | Two measures for X and Y |
| combo | 1+ | 2+ | First measure as bar, rest as lines |

## Filter Operators

```typescript
type FilterOperator = 
  | 'equals'                // field === value
  | 'notEquals'             // field !== value
  | 'greaterThan'           // field > value
  | 'lessThan'              // field < value
  | 'greaterThanOrEqual'    // field >= value
  | 'lessThanOrEqual'       // field <= value
  | 'contains'              // field.includes(value)
  | 'notContains'           // !field.includes(value)
  | 'startsWith'            // field.startsWith(value)
  | 'endsWith'              // field.endsWith(value)
  | 'in'                    // value.includes(field)
  | 'notIn'                 // !value.includes(field)
  | 'between'               // value[0] <= field <= value[1]
  | 'notBetween'            // field < value[0] || field > value[1]
  | 'isNull'                // field === null
  | 'isNotNull';            // field !== null
```

## Aggregation Types

```typescript
type AggregationType = 
  | 'sum'       // Sum of values
  | 'avg'       // Average
  | 'count'     // Count of records
  | 'min'       // Minimum value
  | 'max'       // Maximum value
  | 'median'    // Median value
  | 'distinct'; // Count of unique values
```

## Validation

```typescript
// Validate configuration
const result = ConfigValidator.validate(config);

if (!result.valid) {
  console.log('Errors:', result.errors);
  // [{ field: 'fields', message: 'At least one field required', severity: 'error' }]
}

if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings);
  // [{ field: 'filters', message: 'More than 10 filters may impact performance', severity: 'warning' }]
}

// Quick check
const isValid = ConfigValidator.isValid(config);

// Get error messages
const errors = ConfigValidator.getErrorMessages(config);
// ['fields: At least one field required']
```

## Data Transformation

```typescript
// Transform data according to config
const transformed = DataTransformer.transform(rawData, config);

console.log(transformed);
// {
//   data: [...],        // Transformed data array
//   fields: [...],      // Field metadata
//   metadata: {
//     totalRecords: 5000,
//     filteredRecords: 1250,
//     transformDuration: 45,
//     ...
//   }
// }
```

## Common Patterns

### Pattern 1: Dynamic Chart Type

```typescript
function DynamicChart({ type, data }: { type: ChartType; data: any[] }) {
  const config: ChartConfig = {
    id: `chart-${Date.now()}`,
    name: `${type} Chart`,
    type,
    fields: inferFieldsFromData(data),
    // ... rest of config
  };
  
  const { component: Chart } = ChartFactory.create(config, data);
  return <Chart />;
}
```

### Pattern 2: Chart with Click Handler

```typescript
const config: ChartConfig = {
  // ... other config
  interactions: {
    enabled: true,
    onClick: (data) => {
      console.log('Clicked:', data);
      // Navigate to detail view, show modal, etc.
    }
  }
};
```

### Pattern 3: Filtered Chart

```typescript
function FilteredChart({ data, statusFilter }: Props) {
  const config: ChartConfig = {
    // ... other config
    filters: [
      {
        id: 'status',
        fieldId: 'status',
        operator: 'equals',
        value: statusFilter,
        enabled: true
      }
    ]
  };
  
  const { component: Chart } = ChartFactory.create(config, data);
  return <Chart />;
}
```

## Troubleshooting

### Chart Not Rendering?

1. Check validation: `ConfigValidator.validate(config)`
2. Ensure fields match data structure
3. Verify chart type requirements (dimensions/measures)
4. Check console for errors

### Performance Issues?

1. Use data sampling: automatically applies for 10k+ records
2. Reduce number of filters
3. Limit dimensions to 2-3
4. Use `useDebounce` for rapid updates

### Type Errors?

1. Import types from `@/lib/chart-builder`
2. Ensure all required ChartConfig properties are present
3. Check field types match ChartType requirements

## Tips & Best Practices

1. **Always validate** configurations before rendering
2. **Use templates** for common chart patterns
3. **Debounce** user input that triggers chart updates
4. **Save configurations** for reuse across sessions
5. **Monitor performance** with large datasets
6. **Test with sample data** before production data
7. **Use TypeScript** for type safety and autocomplete

## Resources

- Full Documentation: `src/lib/chart-builder/README.md`
- Demo Component: `src/components/chart-builder-demo.tsx`
- Type Definitions: `src/lib/chart-builder/types.ts`
- Examples: See above patterns

---

For more detailed information, refer to the full README in the chart-builder directory.
