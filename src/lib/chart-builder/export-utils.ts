// Chart Export Utilities - Export charts to various formats
// Support for PNG, JPG, PDF export

import type { ChartConfig } from './types';

/**
 * Export chart to PNG using html2canvas
 */
export async function exportToPNG(
  elementId: string,
  filename: string = 'chart.png',
  options?: {
    backgroundColor?: string;
    scale?: number;
  }
): Promise<void> {
  try {
    // Dynamically import html2canvas to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: options?.backgroundColor || '#ffffff',
      scale: options?.scale || 2,
      logging: false,
      useCORS: true
    });

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw new Error('Failed to export chart to PNG');
  }
}

/**
 * Export chart to JPG/JPEG
 */
export async function exportToJPG(
  elementId: string,
  filename: string = 'chart.jpg',
  options?: {
    backgroundColor?: string;
    scale?: number;
    quality?: number;
  }
): Promise<void> {
  try {
    // Dynamically import html2canvas to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: options?.backgroundColor || '#ffffff',
      scale: options?.scale || 2,
      logging: false,
      useCORS: true
    });

    // Convert canvas to JPG blob and download
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      },
      'image/jpeg',
      options?.quality || 0.95
    );
  } catch (error) {
    console.error('Error exporting to JPG:', error);
    throw new Error('Failed to export chart to JPG');
  }
}

/**
 * Export chart to PDF
 */
export async function exportToPDF(
  elementId: string,
  filename: string = 'chart.pdf',
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: string;
  }
): Promise<void> {
  try {
    // Dynamically import html2canvas and jsPDF to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: options?.orientation || 'landscape',
      unit: 'mm',
      format: options?.format || 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export chart to PDF');
  }
}

/**
 * Export chart to SVG (deprecated - use PNG, JPG, or PDF instead)
 */
export function exportToSVG(
  elementId: string,
  filename: string = 'chart.svg'
): void {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Find SVG element within the chart
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in chart');
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Add XML declaration and styling
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`],
      { type: 'image/svg+xml;charset=utf-8' }
    );

    // Download
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw new Error('Failed to export chart to SVG');
  }
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  data: any[],
  filename: string = 'chart-data.csv',
  options?: {
    delimiter?: string;
    includeHeaders?: boolean;
  }
): void {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const delimiter = options?.delimiter || ',';
    const includeHeaders = options?.includeHeaders !== false;

    // Get headers from first row
    const headers = Object.keys(data[0]);
    
    // Build CSV content
    let csvContent = '';
    
    if (includeHeaders) {
      csvContent += headers.join(delimiter) + '\n';
    }
    
    // Add data rows
    csvContent += data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(delimiter);
    }).join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export data to CSV');
  }
}

/**
 * Export data to JSON
 */
export function exportToJSON(
  data: any[] | ChartConfig,
  filename: string = 'chart-data.json',
  options?: {
    pretty?: boolean;
  }
): void {
  try {
    const jsonContent = options?.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw new Error('Failed to export to JSON');
  }
}

/**
 * Export chart configuration
 */
export function exportConfig(
  config: ChartConfig,
  filename: string = 'chart-config.json'
): void {
  exportToJSON(config, filename, { pretty: true });
}

/**
 * Copy chart image to clipboard
 */
export async function copyToClipboard(elementId: string): Promise<void> {
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!));
    });

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    throw new Error('Failed to copy chart to clipboard');
  }
}

/**
 * Export utilities collection
 * Supported formats: PNG, JPG, PDF
 */
export const ChartExportUtils = {
  toPNG: exportToPNG,
  toJPG: exportToJPG,
  toPDF: exportToPDF,
  // Legacy exports (deprecated)
  toSVG: exportToSVG,
  toCSV: exportToCSV,
  toJSON: exportToJSON,
  config: exportConfig,
  copyToClipboard
};

export default ChartExportUtils;
