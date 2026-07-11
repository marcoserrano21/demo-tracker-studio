import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Omit keys whose values are `undefined` — Firestore rejects undefined field values. */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function formatMinutesToHoursAndMinutes(minutes: number): string {
  if (minutes < 0) {
    return '0m';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let result = '';
  if (hours > 0) {
    result += `${hours}h`;
  }
  if (remainingMinutes > 0 || hours === 0) {
    if (hours > 0) result += ' ';
    result += `${remainingMinutes}m`;
  }
  
  return result.trim() === '' ? '0m' : result;
}

export function convertJsonToCsv<T extends Record<string, any>>(jsonData: T[], headers: (keyof T)[]): string {
    const headerRow = headers.join(',');
    const rows = jsonData.map(row => {
        return headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                return '""';
            }
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
}
