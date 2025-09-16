/**
 * Comprehensive caching system for frontend performance optimization
 * Includes LRU cache, request deduplication, and memory monitoring
 */

class LRUCache {
  constructor(maxSize = 100, ttl = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0
    };
  }

  set(key, value, customTTL = null) {
    const expiration = Date.now() + (customTTL || this.ttl);
    
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, { value, expiration });
    this.accessOrder.set(key, Date.now());
    
    this.updateMemoryUsage();
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const item = this.cache.get(key);
    if (Date.now() > item.expiration) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
    
    this.stats.hits++;
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.updateMemoryUsage();
    return existed;
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0
    };
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRatio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  updateMemoryUsage() {
    try {
      const roughSize = JSON.stringify(Array.from(this.cache.values())).length;
      this.stats.memoryUsage = roughSize;
    } catch (e) {
      this.stats.memoryUsage = 0;
    }
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiration) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }
    
    this.updateMemoryUsage();
    return cleaned;
  }
}

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new LRUCache(50, 60000); // 1 minute TTL
  }

  async deduplicate(key, requestFn) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Check if request is already in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        this.cache.set(key, result);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  clear() {
    this.pendingRequests.clear();
    this.cache.clear();
  }
}

class CacheManager {
  constructor() {
    this.caches = {
      api: new LRUCache(100, 300000),      // 5 min TTL
      data: new LRUCache(50, 600000),      // 10 min TTL
      ui: new LRUCache(25, 180000),        // 3 min TTL
      static: new LRUCache(200, 3600000)   // 1 hour TTL
    };
    
    this.deduplicator = new RequestDeduplicator();
    this.memoryMonitor = new MemoryMonitor();
    this.invalidators = new Map();
    
    // Start periodic cleanup
    this.startCleanupInterval();
  }

  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      throw new Error(`Unknown cache type: ${cacheType}`);
    }
    return this.caches[cacheType].get(key);
  }

  set(cacheType, key, value, ttl = null) {
    if (!this.caches[cacheType]) {
      throw new Error(`Unknown cache type: ${cacheType}`);
    }
    this.caches[cacheType].set(key, value, ttl);
  }

  has(cacheType, key) {
    if (!this.caches[cacheType]) {
      return false;
    }
    return this.caches[cacheType].has(key);
  }

  delete(cacheType, key) {
    if (!this.caches[cacheType]) {
      return false;
    }
    return this.caches[cacheType].delete(key);
  }

  clear(cacheType = null) {
    if (cacheType) {
      if (this.caches[cacheType]) {
        this.caches[cacheType].clear();
      }
    } else {
      Object.values(this.caches).forEach(cache => cache.clear());
    }
  }

  async deduplicatedRequest(key, requestFn, cacheType = 'api', ttl = null) {
    return this.deduplicator.deduplicate(key, async () => {
      const result = await requestFn();
      if (cacheType && this.caches[cacheType]) {
        this.set(cacheType, key, result, ttl);
      }
      return result;
    });
  }

  addInvalidationStrategy(pattern, strategy) {
    this.invalidators.set(pattern, strategy);
  }

  invalidate(pattern, data = null) {
    const invalidations = [];
    
    for (const [cachePattern, strategy] of this.invalidators.entries()) {
      if (this.matchPattern(pattern, cachePattern)) {
        const keys = strategy(data);
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            Object.keys(this.caches).forEach(cacheType => {
              if (this.delete(cacheType, key)) {
                invalidations.push(`${cacheType}:${key}`);
              }
            });
          });
        }
      }
    }
    
    return invalidations;
  }

  matchPattern(pattern, cachePattern) {
    if (typeof pattern === 'string' && typeof cachePattern === 'string') {
      return pattern.includes(cachePattern) || cachePattern.includes(pattern);
    }
    return false;
  }

  getStats() {
    const stats = {};
    Object.keys(this.caches).forEach(type => {
      stats[type] = this.caches[type].getStats();
    });
    
    return {
      caches: stats,
      totalMemory: Object.values(stats).reduce((sum, cache) => sum + cache.memoryUsage, 0),
      uptime: this.memoryMonitor.getUptime()
    };
  }

  startCleanupInterval() {
    // Cleanup expired items every 30 seconds
    setInterval(() => {
      Object.values(this.caches).forEach(cache => cache.cleanup());
      this.memoryMonitor.logMemoryUsage();
    }, 30000);
  }

  getMemoryReport() {
    return this.memoryMonitor.getReport();
  }
}

class MemoryMonitor {
  constructor() {
    this.startTime = Date.now();
    this.samples = [];
    this.maxSamples = 100;
    
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      this.hasMemoryAPI = true;
    } else {
      this.hasMemoryAPI = false;
    }
  }

  collectSample() {
    if (!this.hasMemoryAPI) return null;

    const sample = {
      timestamp: Date.now(),
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };

    this.samples.push(sample);
    
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return sample;
  }

  getMemoryUsage() {
    if (!this.hasMemoryAPI) {
      return {
        used: 0,
        available: 0,
        usage: 0,
        supported: false
      };
    }

    const sample = this.collectSample();
    return {
      used: sample.used,
      available: sample.limit,
      usage: (sample.used / sample.limit) * 100,
      supported: true
    };
  }

  getReport() {
    const usage = this.getMemoryUsage();
    return {
      ...usage,
      samples: this.samples.length,
      uptime: this.getUptime(),
      recommendations: this.getRecommendations(usage.usage)
    };
  }

  getRecommendations(usagePercent) {
    const recommendations = [];
    
    if (usagePercent > 80) {
      recommendations.push('High memory usage detected. Consider clearing caches.');
    }
    
    if (usagePercent > 95) {
      recommendations.push('Critical memory usage! Clear all caches immediately.');
    }
    
    if (this.samples.length > 10) {
      const recent = this.samples.slice(-5);
      const avgUsage = recent.reduce((sum, s) => sum + (s.used / s.limit) * 100, 0) / recent.length;
      
      if (avgUsage > 70 && avgUsage < 90) {
        recommendations.push('Monitor memory usage closely - approaching high levels.');
      }
    }
    
    return recommendations;
  }

  getUptime() {
    return Date.now() - this.startTime;
  }

  logMemoryUsage() {
    const report = this.getReport();
    console.log('[Memory Monitor]', {
      used: Math.round(report.used / 1024 / 1024) + 'MB',
      usage: Math.round(report.usage) + '%',
      recommendations: report.recommendations
    });
    
    if (report.usage > 90) {
      console.warn('High memory usage detected. Consider cache cleanup.');
    }
  }
}

// Cache invalidation strategies
class CacheInvalidationStrategies {
  static apiResponse() {
    return [
      (data) => [`api:${data.endpoint}`],
      (data) => [`data:${data.type}:${data.id}`]
    ];
  }

  static boardUpdate(boardId) {
    return [
      `api:boards:${boardId}`,
      `data:boards:${boardId}`,
      `ui:board:${boardId}`
    ];
  }

  static workspaceUpdate(workspaceId) {
    return [
      `api:workspaces:${workspaceId}`,
      `data:workspaces:${workspaceId}`,
      `ui:workspace:${workspaceId}`
    ];
  }

  static itemUpdate(itemId) {
    return [
      `api:items:${itemId}`,
      `data:items:${itemId}`,
      `ui:item:${itemId}`
    ];
  }
}

// Global cache instance
const cacheManager = new CacheManager();

// Convenience functions
const cache = {
  get: (type, key) => cacheManager.get(type, key),
  set: (type, key, value, ttl) => cacheManager.set(type, key, value, ttl),
  has: (type, key) => cacheManager.has(type, key),
  delete: (type, key) => cacheManager.delete(type, key),
  clear: (type) => cacheManager.clear(type),
  stats: () => cacheManager.getStats(),
  memory: () => cacheManager.getMemoryReport(),
  
  // API helpers
  api: {
    get: (key) => cacheManager.get('api', key),
    set: (key, value, ttl) => cacheManager.set('api', key, value, ttl),
    request: (key, requestFn, ttl) => cacheManager.deduplicatedRequest(key, requestFn, 'api', ttl)
  },
  
  // Data helpers
  data: {
    get: (key) => cacheManager.get('data', key),
    set: (key, value, ttl) => cacheManager.set('data', key, value, ttl)
  },
  
  // UI helpers
  ui: {
    get: (key) => cacheManager.get('ui', key),
    set: (key, value, ttl) => cacheManager.set('ui', key, value, ttl)
  },
  
  // Static helpers
  static: {
    get: (key) => cacheManager.get('static', key),
    set: (key, value, ttl) => cacheManager.set('static', key, value, ttl)
  }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LRUCache,
    RequestDeduplicator,
    CacheManager,
    MemoryMonitor,
    CacheInvalidationStrategies,
    cacheManager,
    cache
  };
} else if (typeof window !== 'undefined') {
  window.CacheSystem = {
    LRUCache,
    RequestDeduplicator,
    CacheManager,
    MemoryMonitor,
    CacheInvalidationStrategies,
    cacheManager,
    cache
  };
}