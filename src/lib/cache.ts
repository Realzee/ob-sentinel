// lib/cache.ts
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cacheManager = {
  set(key: string, data: any) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  get(key: string) {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  clear() {
    cache.clear();
  },
  
  clearByPattern(pattern: string) {
    for (const key of Array.from(cache.keys())) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
};

// Debounce utility
export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Performance monitoring
export const performanceMonitor = {
  start: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(name);
    }
  },
  
  end: (name: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(name);
    }
  },
  
  measure: async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    performanceMonitor.start(name);
    try {
      const result = await operation();
      return result;
    } finally {
      performanceMonitor.end(name);
    }
  }
};