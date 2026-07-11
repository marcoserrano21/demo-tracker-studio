// Configuration Validator - Schema validation and error checking
// Ensures chart configurations are valid before rendering

import type { 
  ChartConfig, 
  ChartType, 
  DataField, 
  ChartFilter,
  AggregationType,
  FilterOperator 
} from './types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

/**
 * Configuration Validator - Main validation class
 */
export class ConfigValidator {
  /**
   * Validate complete chart configuration
   */
  static validate(config: ChartConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic validation
    errors.push(...this.validateBasicStructure(config));
    
    // Field validation
    errors.push(...this.validateFields(config.fields, config.type));
    
    // Filter validation
    errors.push(...this.validateFilters(config.filters || []));
    
    // Aggregation validation
    errors.push(...this.validateAggregations(config));
    
    // Axis validation
    errors.push(...this.validateAxes(config));
    
    // Performance warnings
    warnings.push(...this.checkPerformance(config));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate basic structure
   */
  private static validateBasicStructure(config: ChartConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.name || config.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Chart name is required',
        severity: 'error'
      });
    }
    
    if (!config.type) {
      errors.push({
        field: 'type',
        message: 'Chart type is required',
        severity: 'error'
      });
    }
    
    if (!this.isValidChartType(config.type)) {
      errors.push({
        field: 'type',
        message: `Invalid chart type: ${config.type}`,
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Validate fields configuration
   */
  private static validateFields(fields: DataField[], chartType: ChartType): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!fields || fields.length === 0) {
      errors.push({
        field: 'fields',
        message: 'At least one field is required',
        severity: 'error'
      });
      return errors;
    }
    
    const dimensions = fields.filter(f => f.type === 'dimension');
    const measures = fields.filter(f => f.type === 'measure');
    
    // Chart type specific validation
    switch (chartType) {
      case 'bar':
      case 'horizontalBar':
      case 'stackedBar':
      case 'line':
      case 'area':
      case 'stackedArea':
        if (dimensions.length === 0) {
          errors.push({
            field: 'fields',
            message: `${chartType} charts require at least one dimension`,
            severity: 'error'
          });
        }
        if (measures.length === 0) {
          errors.push({
            field: 'fields',
            message: `${chartType} charts require at least one measure`,
            severity: 'error'
          });
        }
        break;
        
      case 'pie':
      case 'donut':
        if (dimensions.length === 0) {
          errors.push({
            field: 'fields',
            message: 'Pie/Donut charts require exactly one dimension',
            severity: 'error'
          });
        }
        if (dimensions.length > 1) {
          errors.push({
            field: 'fields',
            message: 'Pie/Donut charts support only one dimension',
            severity: 'error'
          });
        }
        if (measures.length === 0) {
          errors.push({
            field: 'fields',
            message: 'Pie/Donut charts require exactly one measure',
            severity: 'error'
          });
        }
        if (measures.length > 1) {
          errors.push({
            field: 'fields',
            message: 'Pie/Donut charts support only one measure',
            severity: 'error'
          });
        }
        break;
        
      case 'scatter':
      case 'bubble':
        if (measures.length < 2) {
          errors.push({
            field: 'fields',
            message: 'Scatter/Bubble charts require at least two measures',
            severity: 'error'
          });
        }
        break;
        
      case 'heatmap':
        if (dimensions.length < 2) {
          errors.push({
            field: 'fields',
            message: 'Heatmap charts require at least two dimensions',
            severity: 'error'
          });
        }
        if (measures.length === 0) {
          errors.push({
            field: 'fields',
            message: 'Heatmap charts require at least one measure',
            severity: 'error'
          });
        }
        break;
    }
    
    // Validate individual fields
    fields.forEach((field, index) => {
      if (!field.id || field.id.trim() === '') {
        errors.push({
          field: `fields[${index}].id`,
          message: 'Field ID is required',
          severity: 'error'
        });
      }
      
      if (!field.name || field.name.trim() === '') {
        errors.push({
          field: `fields[${index}].name`,
          message: 'Field name is required',
          severity: 'error'
        });
      }
      
      if (field.type === 'measure' && field.aggregation && 
          !this.isValidAggregationType(field.aggregation)) {
        errors.push({
          field: `fields[${index}].aggregation`,
          message: `Invalid aggregation type: ${field.aggregation}`,
          severity: 'error'
        });
      }
    });
    
    // Check for duplicate field IDs
    const fieldIds = fields.map(f => f.id);
    const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push({
        field: 'fields',
        message: `Duplicate field IDs found: ${duplicates.join(', ')}`,
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Validate filters configuration
   */
  private static validateFilters(filters: ChartFilter[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    filters.forEach((filter, index) => {
      const field = filter.field || filter.fieldId;
      if (!field || field.trim() === '') {
        errors.push({
          field: `filters[${index}].fieldId`,
          message: 'Filter field is required',
          severity: 'error'
        });
      }
      
      if (!this.isValidFilterOperator(filter.operator)) {
        errors.push({
          field: `filters[${index}].operator`,
          message: `Invalid filter operator: ${filter.operator}`,
          severity: 'error'
        });
      }
      
      // Validate value based on operator
      if (['between', 'notBetween'].includes(filter.operator)) {
        if (!Array.isArray(filter.value) || filter.value.length !== 2) {
          errors.push({
            field: `filters[${index}].value`,
            message: `${filter.operator} operator requires array of two values`,
            severity: 'error'
          });
        }
      } else if (['in', 'notIn'].includes(filter.operator)) {
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          errors.push({
            field: `filters[${index}].value`,
            message: `${filter.operator} operator requires non-empty array`,
            severity: 'error'
          });
        }
      } else if (!['isNull', 'isNotNull'].includes(filter.operator)) {
        if (filter.value === undefined || filter.value === null) {
          errors.push({
            field: `filters[${index}].value`,
            message: 'Filter value is required',
            severity: 'error'
          });
        }
      }
    });
    
    return errors;
  }
  
  /**
   * Validate aggregations
   */
  private static validateAggregations(config: ChartConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const measures = config.fields.filter(f => f.type === 'measure');
    
    measures.forEach((measure, index) => {
      if (measure.aggregation && !this.isValidAggregationType(measure.aggregation)) {
        errors.push({
          field: `fields[${index}].aggregation`,
          message: `Invalid aggregation type: ${measure.aggregation}`,
          severity: 'error'
        });
      }
    });
    
    return errors;
  }
  
  /**
   * Validate axes configuration
   */
  private static validateAxes(config: ChartConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Only validate axes for chart types that use them
    const axisChartTypes: ChartType[] = [
      'bar', 'horizontalBar', 'stackedBar', 
      'line', 'area', 'stackedArea', 
      'scatter', 'bubble', 'combo'
    ];
    
    if (!axisChartTypes.includes(config.type)) {
      return errors;
    }
    
    // Validate X-axis
    if (config.xAxis) {
      if (config.xAxis.min !== undefined && config.xAxis.max !== undefined) {
        if (config.xAxis.min >= config.xAxis.max) {
          errors.push({
            field: 'xAxis',
            message: 'X-axis min must be less than max',
            severity: 'error'
          });
        }
      }
    }
    
    // Validate Y-axis
    if (config.yAxis) {
      if (config.yAxis.min !== undefined && config.yAxis.max !== undefined) {
        if (config.yAxis.min >= config.yAxis.max) {
          errors.push({
            field: 'yAxis',
            message: 'Y-axis min must be less than max',
            severity: 'error'
          });
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Check for performance issues and generate warnings
   */
  private static checkPerformance(config: ChartConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check for too many dimensions (can cause performance issues)
    const dimensions = config.fields.filter(f => f.type === 'dimension');
    if (dimensions.length > 3) {
      warnings.push({
        field: 'fields',
        message: 'Using more than 3 dimensions may impact performance',
        severity: 'warning'
      });
    }
    
    // Check for complex filters
    if (config.filters && config.filters.length > 10) {
      warnings.push({
        field: 'filters',
        message: 'Using more than 10 filters may impact performance',
        severity: 'warning'
      });
    }
    
    // Check for pie charts with too many slices
    if (['pie', 'donut'].includes(config.type)) {
      // This would need data to validate, so we just warn about potential issues
      warnings.push({
        field: 'type',
        message: 'Pie/Donut charts with more than 10 slices may be hard to read',
        severity: 'warning'
      });
    }
    
    return warnings;
  }
  
  /**
   * Validate chart type
   */
  private static isValidChartType(type: string): boolean {
    const validTypes: ChartType[] = [
      'bar', 'horizontalBar', 'stackedBar',
      'line', 'area', 'stackedArea',
      'pie', 'donut',
      'scatter', 'bubble',
      'heatmap', 'histogram', 'combo'
    ];
    return validTypes.includes(type as ChartType);
  }
  
  /**
   * Validate aggregation type
   */
  private static isValidAggregationType(type: string): boolean {
    const validTypes: AggregationType[] = [
      'sum', 'avg', 'count', 'min', 'max', 'median', 'distinct'
    ];
    return validTypes.includes(type as AggregationType);
  }
  
  /**
   * Validate filter operator
   */
  private static isValidFilterOperator(operator: string): boolean {
    const validOperators: FilterOperator[] = [
      'equals', 'notEquals', 'greaterThan', 'lessThan',
      'greaterThanOrEqual', 'lessThanOrEqual',
      'contains', 'notContains', 'startsWith', 'endsWith',
      'in', 'notIn', 'between', 'notBetween',
      'isNull', 'isNotNull'
    ];
    return validOperators.includes(operator as FilterOperator);
  }
  
  /**
   * Sanitize and normalize configuration
   */
  static sanitize(config: ChartConfig): ChartConfig {
    return {
      ...config,
      name: config.name?.trim() || 'Untitled Chart',
      fields: config.fields.map(f => ({
        ...f,
        id: f.id.trim(),
        name: f.name.trim()
      })),
      filters: config.filters?.map(f => ({
        ...f,
        fieldId: (f.field || f.fieldId).trim()
      })) || [],
      style: {
        width: config.style.width || '100%',
        height: config.style.height || 400,
        margin: config.style.margin || { top: 20, right: 30, bottom: 20, left: 30 }
      },
      legend: {
        show: config.legend?.show ?? true,
        position: config.legend?.position || 'bottom'
      },
      interactions: {
        ...config.interactions,
        enabled: config.interactions?.enabled ?? true,
        clickable: config.interactions?.clickable ?? true,
        zoomable: config.interactions?.zoomable ?? false,
        pannable: config.interactions?.pannable ?? false
      }
    };
  }
  
  /**
   * Quick validation check (returns boolean only)
   */
  static isValid(config: ChartConfig): boolean {
    const result = this.validate(config);
    return result.valid;
  }
  
  /**
   * Get human-readable error messages
   */
  static getErrorMessages(config: ChartConfig): string[] {
    const result = this.validate(config);
    return result.errors.map(e => `${e.field}: ${e.message}`);
  }
  
  /**
   * Get human-readable warning messages
   */
  static getWarningMessages(config: ChartConfig): string[] {
    const result = this.validate(config);
    return result.warnings.map(w => `${w.field}: ${w.message}`);
  }
}

export default ConfigValidator;
