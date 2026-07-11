import type { DriveLog } from './types';

export interface PurchaseByModelTrim {
  model: string;
  trim: string;
  label: string;
  count: number;
}

export interface AdvisorPurchaseSummary {
  advisor: string;
  demoCount: number;
  purchaseCount: number;
  conversionRate: number;
  byModelTrim: PurchaseByModelTrim[];
}

function modelTrimLabel(model: string, trim: string): string {
  return `${model} · ${trim}`;
}

export function getAdvisorPurchaseSummaries(driveLogs: DriveLog[]): AdvisorPurchaseSummary[] {
  const completedDemos = driveLogs.filter(
    (log) => log.endTime && log.purpose === 'Demo' && log.coPilot,
  );

  const byAdvisor = new Map<string, DriveLog[]>();
  completedDemos.forEach((log) => {
    const name = log.coPilot!;
    const list = byAdvisor.get(name) ?? [];
    list.push(log);
    byAdvisor.set(name, list);
  });

  return Array.from(byAdvisor.entries())
    .map(([advisor, logs]) => {
      const purchases = logs.filter((log) => log.customerPurchased);
      const modelTrimMap = new Map<string, PurchaseByModelTrim>();

      purchases.forEach((log) => {
        const model = log.purchaseModel || log.vehicleModel;
        const trim = log.purchaseTrim || log.vehicleTrim;
        const key = `${model}::${trim}`;
        const existing = modelTrimMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          modelTrimMap.set(key, {
            model,
            trim,
            label: modelTrimLabel(model, trim),
            count: 1,
          });
        }
      });

      return {
        advisor,
        demoCount: logs.length,
        purchaseCount: purchases.length,
        conversionRate: logs.length > 0 ? (purchases.length / logs.length) * 100 : 0,
        byModelTrim: Array.from(modelTrimMap.values()).sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.purchaseCount - a.purchaseCount || b.conversionRate - a.conversionRate);
}

/** Chart rows: one bar segment per advisor + model/trim combo with purchases */
export function getPurchaseChartData(driveLogs: DriveLog[]): Array<{ name: string; purchases: number; advisor: string }> {
  const summaries = getAdvisorPurchaseSummaries(driveLogs);
  const rows: Array<{ name: string; purchases: number; advisor: string }> = [];

  summaries.forEach((summary) => {
    summary.byModelTrim.forEach((item) => {
      rows.push({
        name: `${summary.advisor.split(' ')[0]} · ${item.label}`,
        purchases: item.count,
        advisor: summary.advisor,
      });
    });
  });

  return rows.sort((a, b) => b.purchases - a.purchases).slice(0, 12);
}

export function getStorePurchaseConversionRate(driveLogs: DriveLog[]): number {
  const demos = driveLogs.filter((log) => log.endTime && log.purpose === 'Demo');
  if (demos.length === 0) return 0;
  return (demos.filter((log) => log.customerPurchased).length / demos.length) * 100;
}

export function getAdvisorPurchaseCount(driveLogs: DriveLog[], advisorName: string): number {
  return driveLogs.filter(
    (log) => log.endTime && log.customerPurchased && log.coPilot === advisorName,
  ).length;
}

export function getAdvisorConversionRate(driveLogs: DriveLog[], advisorName: string): number {
  const demos = driveLogs.filter(
    (log) => log.endTime && log.purpose === 'Demo' && log.coPilot === advisorName,
  );
  if (demos.length === 0) return 0;
  return (demos.filter((log) => log.customerPurchased).length / demos.length) * 100;
}

/** Chart rows: order count per advisor from completed demo drives with a purchase */
export function getAdvisorOrdersChartData(
  driveLogs: DriveLog[],
  advisors: { name: string }[],
): Array<{ name: string; orders: number }> {
  const ordersByAdvisor: Record<string, number> = {};

  advisors.forEach((adv) => {
    ordersByAdvisor[adv.name] = 0;
  });

  driveLogs
    .filter((log) => log.purpose === 'Demo' && log.endTime && log.customerPurchased && log.coPilot)
    .forEach((log) => {
      ordersByAdvisor[log.coPilot!] = (ordersByAdvisor[log.coPilot!] || 0) + 1;
    });

  return Object.entries(ordersByAdvisor).map(([name, orders]) => ({ name, orders }));
}
