// Performance Utilities - Optimization helpers for chart builder
// Provides memoization, debouncing, throttling, and large dataset handling

import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Deep equality comparison for memoization
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null || 
      typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Memoize expensive computations with deep equality
 */
export function useMemoDeep<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T } | null>(null);
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory()
    };
  }
  
  return ref.current.value;
}

/**
 * Debounce hook - Delays execution until after wait milliseconds
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Throttle hook - Ensures callback runs at most once per wait milliseconds
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;
      
      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Data chunking for large datasets
 */
export class DataChunker {
  /**
   * Split data into chunks
   */
  static chunk<T>(data: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Process data in chunks with callback
   */
  static async processInChunks<T, R>(
    data: T[],
    chunkSize: number,
    processor: (chunk: T[]) => R | Promise<R>,
    onProgress?: (progress: number) => void
  ): Promise<R[]> {
    const chunks = this.chunk(data, chunkSize);
    const results: R[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const result = await processor(chunks[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress((i + 1) / chunks.length * 100);
      }
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}

/**
 * Virtualization helper for large lists
 */
export interface VirtualizedRange {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
}

export function useVirtualization(
  items: any[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
): VirtualizedRange {
  return useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    
    return {
      startIndex,
      endIndex,
      visibleItems
    };
  }, [items, containerHeight, itemHeight, scrollTop]);
}

/**
 * Web Worker wrapper for heavy computations
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private activeWorkers: Set<number> = new Set();
  
  constructor(workerScript: string, poolSize: number = 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      worker.onmessage = (e) => this.handleWorkerMessage(i, e);
      worker.onerror = (e) => this.handleWorkerError(i, e);
      this.workers.push(worker);
    }
  }
  
  /**
   * Execute task on available worker
   */
  async execute(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject });
      this.processQueue();
    });
  }
  
  /**
   * Process task queue
   */
  private processQueue() {
    if (this.taskQueue.length === 0) return;
    
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.activeWorkers.has(i) && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.activeWorkers.add(i);
        this.workers[i].postMessage(task.data);
      }
    }
  }
  
  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerIndex: number, event: MessageEvent) {
    this.activeWorkers.delete(workerIndex);
    const task = this.taskQueue[0];
    if (task) {
      task.resolve(event.data);
    }
    this.processQueue();
  }
  
  /**
   * Handle worker error
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent) {
    this.activeWorkers.delete(workerIndex);
    const task = this.taskQueue[0];
    if (task) {
      task.reject(error);
    }
    this.processQueue();
  }
  
  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers.clear();
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();
  
  /**
   * Start timing an operation
   */
  mark(label: string) {
    this.marks.set(label, performance.now());
  }
  
  /**
   * End timing and record duration
   */
  measure(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No mark found for label: ${label}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    
    if (!this.measures.has(label)) {
      this.measures.set(label, []);
    }
    this.measures.get(label)!.push(duration);
    
    this.marks.delete(label);
    return duration;
  }
  
  /**
   * Get statistics for a label
   */
  getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    total: number;
  } | null {
    const durations = this.measures.get(label);
    if (!durations || durations.length === 0) {
      return null;
    }
    
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: durations.reduce((a, b) => a + b, 0)
    };
  }
  
  /**
   * Clear all measurements
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
  }
  
  /**
   * Get all statistics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const label of this.measures.keys()) {
      stats[label] = this.getStats(label);
    }
    return stats;
  }
}

/**
 * Memory-efficient data sampling
 */
export class DataSampler {
  /**
   * Reservoir sampling algorithm - maintains random sample without loading all data
   */
  static reservoirSample<T>(stream: Iterable<T>, sampleSize: number): T[] {
    const reservoir: T[] = [];
    let index = 0;
    
    for (const item of stream) {
      if (index < sampleSize) {
        reservoir.push(item);
      } else {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        if (randomIndex < sampleSize) {
          reservoir[randomIndex] = item;
        }
      }
      index++;
    }
    
    return reservoir;
  }
  
  /**
   * Stratified sampling - ensures representation from each group
   */
  static stratifiedSample<T>(
    data: T[],
    groupKey: keyof T,
    samplesPerGroup: number
  ): T[] {
    const groups = new Map<any, T[]>();
    
    // Group data
    for (const item of data) {
      const key = item[groupKey];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    // Sample from each group
    const samples: T[] = [];
    for (const group of groups.values()) {
      const shuffled = [...group].sort(() => Math.random() - 0.5);
      samples.push(...shuffled.slice(0, samplesPerGroup));
    }
    
    return samples;
  }
}

/**
 * Lazy loading hook for data
 */
export function useLazyLoad<T>(
  data: T[],
  pageSize: number = 50
): {
  items: T[];
  loadMore: () => void;
  hasMore: boolean;
  reset: () => void;
} {
  const [loaded, setLoaded] = React.useState(pageSize);
  
  const items = useMemo(() => {
    return data.slice(0, loaded);
  }, [data, loaded]);
  
  const loadMore = useCallback(() => {
    setLoaded(prev => Math.min(prev + pageSize, data.length));
  }, [data.length, pageSize]);
  
  const reset = useCallback(() => {
    setLoaded(pageSize);
  }, [pageSize]);
  
  return {
    items,
    loadMore,
    hasMore: loaded < data.length,
    reset
  };
}

/**
 * Batch state updates
 */
export function useBatchedUpdates<T>(
  initialState: T,
  batchDelay: number = 100
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = React.useState<T>(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const update = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = {
      ...pendingUpdates.current,
      ...updates
    };
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        ...pendingUpdates.current
      }));
      pendingUpdates.current = {};
    }, batchDelay);
  }, [batchDelay]);
  
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (Object.keys(pendingUpdates.current).length > 0) {
      setState(prev => ({
        ...prev,
        ...pendingUpdates.current
      }));
      pendingUpdates.current = {};
    }
  }, []);
  
  return [state, update, flush];
}

// React import for useLazyLoad and useBatchedUpdates
import React from 'react';

export default {
  deepEqual,
  useMemoDeep,
  useDebounce,
  useThrottle,
  DataChunker,
  useVirtualization,
  WorkerPool,
  PerformanceMonitor,
  DataSampler,
  useLazyLoad,
  useBatchedUpdates
};
