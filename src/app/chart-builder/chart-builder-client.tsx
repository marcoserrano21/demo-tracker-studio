// Chart Builder Integration Demo - dev only

'use client';

import React, { useState } from 'react';
import { ChartBuilderUI } from '@/components/chart-builder-ui';
import { ChartFactory, useChartBuilderStore, type ChartConfig } from '@/lib/chart-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, BarChart3 } from 'lucide-react';

const sampleData = [
  { month: 'January', sales: 45000, expenses: 28000, profit: 17000, region: 'North', units: 450 },
  { month: 'February', sales: 52000, expenses: 31000, profit: 21000, region: 'South', units: 520 },
  { month: 'March', sales: 48000, expenses: 29000, profit: 19000, region: 'East', units: 480 },
  { month: 'April', sales: 61000, expenses: 34000, profit: 27000, region: 'West', units: 610 },
  { month: 'May', sales: 55000, expenses: 32000, profit: 23000, region: 'North', units: 550 },
  { month: 'June', sales: 67000, expenses: 38000, profit: 29000, region: 'South', units: 670 },
  { month: 'July', sales: 71000, expenses: 42000, profit: 29000, region: 'East', units: 710 },
  { month: 'August', sales: 64000, expenses: 39000, profit: 25000, region: 'West', units: 640 },
  { month: 'September', sales: 58000, expenses: 35000, profit: 23000, region: 'North', units: 580 },
  { month: 'October', sales: 72000, expenses: 43000, profit: 29000, region: 'South', units: 720 },
  { month: 'November', sales: 68000, expenses: 41000, profit: 27000, region: 'East', units: 680 },
  { month: 'December', sales: 79000, expenses: 47000, profit: 32000, region: 'West', units: 790 },
];

export default function ChartBuilderClient() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ChartConfig | null>(null);
  const { savedConfigs, deleteConfig } = useChartBuilderStore();

  const handleOpenBuilder = (config?: ChartConfig) => {
    setEditingConfig(config || null);
    setBuilderOpen(true);
  };

  const handleCloseBuilder = () => {
    setBuilderOpen(false);
    setEditingConfig(null);
  };

  const handleSaveChart = (config: ChartConfig) => {
    console.log('Chart saved:', config);
  };

  const handleDeleteChart = (configId: string) => {
    if (confirm('Are you sure you want to delete this chart?')) {
      deleteConfig(configId);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visual Chart Builder</h1>
          <p className="text-muted-foreground mt-2">Create interactive charts with drag-and-drop ease</p>
        </div>
        <Button onClick={() => handleOpenBuilder()} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create New Chart
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Charts</h2>
        {savedConfigs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No charts yet</h3>
              <p className="text-muted-foreground mb-4">Create your first chart using the visual builder</p>
              <Button onClick={() => handleOpenBuilder()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Chart
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedConfigs.map((config) => {
              const chartResult = ChartFactory.create(config, sampleData);
              return (
                <Card key={config.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {config.type.replace(/([A-Z])/g, ' $1').trim()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenBuilder(config)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChart(config.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="bg-muted/30 rounded-lg p-4 h-[300px]">
                      <chartResult.component />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ChartBuilderUI
        open={builderOpen}
        onClose={handleCloseBuilder}
        data={sampleData}
        initialConfig={editingConfig || undefined}
        onSave={handleSaveChart}
      />
    </div>
  );
}
