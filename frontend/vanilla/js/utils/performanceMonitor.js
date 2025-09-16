/**
 * Comprehensive performance monitoring system
 * Includes Web Vitals, custom metrics, error tracking, and dashboard
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableWebVitals: options.enableWebVitals !== false,
      enableCustomMetrics: options.enableCustomMetrics !== false,
      enableErrorTracking: options.enableErrorTracking !== false,
      enableResourceTracking: options.enableResourceTracking !== false,
      reportInterval: options.reportInterval || 30000, // 30 seconds
      sampleRate: options.sampleRate || 1.0,
      ...options
    };
    
    this.metrics = {
      webVitals: {},
      custom: {},
      resources: [],
      errors: [],
      memory: [],
      network: []
    };
    
    this.observers = {
      performance: null,
      memory: null,
      errors: null,
      resources: null
    };
    
    this.listeners = new Map();
    this.reportingCallbacks = [];
    
    this.init();
  }

  init() {
    if (this.options.sampleRate < 1.0 && Math.random() > this.options.sampleRate) {
      return; // Skip initialization based on sample rate
    }

    this.setupPerformanceObserver();
    this.setupMemoryObserver();
    this.setupErrorTracking();
    this.setupResourceTracking();
    
    if (this.options.enableWebVitals) {
      this.measureWebVitals();
    }

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.observers.performance = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });
      
      this.observers.performance.observe({ entryTypes: ['navigation', 'paint', 'measure', 'resource'] });
    }
  }

  setupMemoryObserver() {
    if ('memory' in performance) {
      this.collectMemoryMetrics();
      
      // Collect memory metrics every 5 seconds
      setInterval(() => {
        this.collectMemoryMetrics();
      }, 5000);
    }
  }

  setupErrorTracking() {
    if (this.options.enableErrorTracking) {
      // JavaScript errors
      window.addEventListener('error', (event) => {
        this.trackError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now()
        });
      });

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError({
          type: 'promise',
          message: event.reason?.message || event.reason,
          stack: event.reason?.stack,
          timestamp: Date.now()
        });
      });

      // Resource loading errors
      document.addEventListener('error', (event) => {
        if (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') {
          this.trackError({
            type: 'resource',
            resource: event.target.src || event.target.href,
            tagName: event.target.tagName,
            timestamp: Date.now()
          });
        }
      }, true);
    }
  }

  setupResourceTracking() {
    if (this.options.enableResourceTracking && 'PerformanceObserver' in window) {
      this.observers.resources = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.initiatorType && entry.duration) {
            this.metrics.resources.push({
              name: entry.name,
              type: entry.initiatorType,
              size: entry.transferSize || 0,
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now()
            });
          }
        });
      });
      
      this.observers.resources.observe({ entryTypes: ['resource'] });
    }
  }

  measureWebVitals() {
    // Largest Contentful Paint (LCP)
    this.measureLCP();
    
    // First Input Delay (FID)
    this.measureFID();
    
    // Cumulative Layout Shift (CLS)
    this.measureCLS();
    
    // First Contentful Paint (FCP)
    this.measureFCP();
    
    // Time to Interactive (TTI)
    this.measureTTI();
  }

  measureLCP() {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.webVitals.LCP = lastEntry.startTime;
        this.emit('lcp', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  measureFID() {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.webVitals.FID = fid;
          this.emit('fid', fid);
        });
      }).observe({ entryTypes: ['first-input'] });
    }
  }

  measureCLS() {
    let clsValue = 0;
    let clsEntries = [];
    
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsEntries.push(entry);
            clsValue += entry.value;
            this.metrics.webVitals.CLS = clsValue;
            this.emit('cls', clsValue);
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  measureFCP() {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.webVitals.FCP = entry.startTime;
            this.emit('fcp', entry.startTime);
          }
        });
      }).observe({ entryTypes: ['paint'] });
    }
  }

  measureTTI() {
    let tti = 0;
    
    const checkTTI = () => {
      if (document.readyState === 'complete') {
        setTimeout(() => {
          tti = performance.now();
          this.metrics.webVitals.TTI = tti;
          this.emit('tti', tti);
        }, 1000);
      }
    };
    
    if (document.readyState === 'complete') {
      checkTTI();
    } else {
      window.addEventListener('load', checkTTI);
    }
  }

  collectMemoryMetrics() {
    if ('memory' in performance) {
      const memoryData = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      this.metrics.memory.push(memoryData);
      
      // Keep only last 100 memory samples
      if (this.metrics.memory.length > 100) {
        this.metrics.memory = this.metrics.memory.slice(-100);
      }
      
      this.emit('memory', memoryData);
    }
  }

  trackCustomMetric(name, value, metadata = {}) {
    if (this.options.enableCustomMetrics) {
      this.metrics.custom[name] = {
        value,
        metadata,
        timestamp: Date.now()
      };
      
      this.emit(`metric:${name}`, { value, metadata });
    }
  }

  trackError(error) {
    this.metrics.errors.push(error);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
    
    this.emit('error', error);
  }

  measureAPIRequest(url, method = 'GET') {
    const startTime = performance.now();
    
    return {
      end: (status, responseSize = 0) => {
        const duration = performance.now() - startTime;
        const metric = {
          url,
          method,
          status,
          duration,
          responseSize,
          timestamp: Date.now()
        };
        
        this.trackCustomMetric(`api_${method.toLowerCase()}`, duration, {
          url,
          status,
          responseSize
        });
        
        this.metrics.network.push(metric);
        
        return metric;
      }
    };
  }

  measureUserAction(action, callback) {
    const startTime = performance.now();
    
    const end = (additionalData = {}) => {
      const duration = performance.now() - startTime;
      
      this.trackCustomMetric(`user_action_${action}`, duration, additionalData);
      
      return {
        action,
        duration,
        ...additionalData,
        timestamp: Date.now()
      };
    };
    
    if (callback) {
      const result = callback();
      if (result && typeof result.then === 'function') {
        return result.then(() => end());
      } else {
        return end();
      }
    }
    
    return { end };
  }

  processPerformanceEntries(entries) {
    entries.forEach(entry => {
      switch (entry.entryType) {
        case 'navigation':
          this.processNavigationTiming(entry);
          break;
        case 'paint':
          this.processPaintTiming(entry);
          break;
        case 'measure':
          this.processMeasureTiming(entry);
          break;
      }
    });
  }

  processNavigationTiming(entry) {
    const navigationTiming = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
      loadComplete: entry.loadEventEnd - entry.navigationStart,
      firstByte: entry.responseStart - entry.navigationStart,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0,
      transfer: entry.responseEnd - entry.responseStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      domComplete: entry.domComplete - entry.navigationStart
    };
    
    this.trackCustomMetric('navigation_timing', 0, navigationTiming);
  }

  processPaintTiming(entry) {
    this.trackCustomMetric(`paint_${entry.name}`, entry.startTime);
  }

  processMeasureTiming(entry) {
    this.trackCustomMetric(entry.name, entry.duration, {
      startTime: entry.startTime
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in performance monitor callback:', error);
        }
      });
    }
  }

  addReportingCallback(callback) {
    this.reportingCallbacks.push(callback);
  }

  startPeriodicReporting() {
    setInterval(() => {
      this.reportMetrics();
    }, this.options.reportInterval);
  }

  reportMetrics() {
    const report = this.getReport();
    
    this.reportingCallbacks.forEach(callback => {
      try {
        callback(report);
      } catch (error) {
        console.error('Error in performance reporting callback:', error);
      }
    });
    
    this.emit('report', report);
  }

  getReport() {
    return {
      timestamp: Date.now(),
      webVitals: this.metrics.webVitals,
      custom: this.metrics.custom,
      resources: this.metrics.resources.slice(-50), // Last 50 resources
      errors: this.metrics.errors,
      memory: this.metrics.memory.slice(-10), // Last 10 memory samples
      network: this.metrics.network.slice(-20), // Last 20 network requests
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const summary = {
      status: 'healthy',
      recommendations: []
    };
    
    // Check Web Vitals
    const vitals = this.metrics.webVitals;
    
    if (vitals.LCP > 2500) {
      summary.status = 'warning';
      summary.recommendations.push('LCP is high (>2.5s). Consider optimizing images and critical resources.');
    }
    
    if (vitals.FID > 100) {
      summary.status = 'warning';
      summary.recommendations.push('FID is high (>100ms). Consider reducing JavaScript execution time.');
    }
    
    if (vitals.CLS > 0.1) {
      summary.status = 'warning';
      summary.recommendations.push('CLS is high (>0.1). Consider adding size attributes to images and avoiding layout shifts.');
    }
    
    // Check memory usage
    const latestMemory = this.metrics.memory[this.metrics.memory.length - 1];
    if (latestMemory && latestMemory.used / latestMemory.limit > 0.8) {
      summary.status = 'warning';
      summary.recommendations.push('High memory usage detected. Consider clearing caches.');
    }
    
    // Check error rate
    const recentErrors = this.metrics.errors.filter(e => 
      Date.now() - e.timestamp < 60000
    );
    
    if (recentErrors.length > 5) {
      summary.status = 'critical';
      summary.recommendations.push(`High error rate detected: ${recentErrors.length} errors in the last minute.`);
    }
    
    return summary;
  }

  startDebugSession() {
    console.log('🔍 Performance Monitor Debug Session Started');
    console.log('Available metrics:', Object.keys(this.metrics));
    
    this.on('report', (report) => {
      console.table({
        'LCP (ms)': Math.round(report.webVitals.LCP || 0),
        'FID (ms)': Math.round(report.webVitals.FID || 0),
        'CLS': (report.webVitals.CLS || 0).toFixed(3),
        'FCP (ms)': Math.round(report.webVitals.FCP || 0),
        'TTI (ms)': Math.round(report.webVitals.TTI || 0)
      });
      
      if (report.summary.recommendations.length > 0) {
        console.warn('🚨 Performance Recommendations:', report.summary.recommendations);
      }
    });
  }

  exportData() {
    const data = {
      timestamp: Date.now(),
      metrics: this.metrics,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  destroy() {
    if (this.observers.performance) {
      this.observers.performance.disconnect();
    }
    if (this.observers.resources) {
      this.observers.resources.disconnect();
    }
    
    this.listeners.clear();
    this.reportingCallbacks = [];
  }
}

// Performance Dashboard class
class PerformanceDashboard {
  constructor(monitor, container = null) {
    this.monitor = monitor;
    this.container = container || this.createDefaultContainer();
    this.isVisible = false;
    
    this.init();
  }

  createDefaultContainer() {
    const container = document.createElement('div');
    container.id = 'performance-dashboard';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      overflow-y: auto;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(container);
    return container;
  }

  init() {
    this.createUI();
    this.monitor.on('report', (report) => this.updateDashboard(report));
    this.monitor.startDebugSession();
  }

  createUI() {
    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 14px;">Performance Monitor</h3>
        <button id="close-dashboard" style="background: none; border: none; color: white; cursor: pointer;">✕</button>
      </div>
      <div id="dashboard-content">
        <div id="web-vitals"></div>
        <div id="memory-usage"></div>
        <div id="error-count"></div>
        <div id="recommendations"></div>
      </div>
      <div style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
        Last updated: <span id="last-update">Never</span>
      </div>
    `;

    this.container.querySelector('#close-dashboard').addEventListener('click', () => {
      this.toggle();
    });
  }

  updateDashboard(report) {
    this.updateWebVitals(report.webVitals);
    this.updateMemoryUsage(report.memory);
    this.updateErrorCount(report.errors);
    this.updateRecommendations(report.summary);
    
    this.container.querySelector('#last-update').textContent = new Date().toLocaleTimeString();
  }

  updateWebVitals(vitals) {
    const container = this.container.querySelector('#web-vitals');
    container.innerHTML = `
      <h4 style="margin: 5px 0;">Web Vitals</h4>
      <div>LCP: ${Math.round(vitals.LCP || 0)}ms</div>
      <div>FID: ${Math.round(vitals.FID || 0)}ms</div>
      <div>CLS: ${(vitals.CLS || 0).toFixed(3)}</div>
      <div>FCP: ${Math.round(vitals.FCP || 0)}ms</div>
      <div>TTI: ${Math.round(vitals.TTI || 0)}ms</div>
    `;
  }

  updateMemoryUsage(memory) {
    const latest = memory[memory.length - 1];
    if (latest) {
      const container = this.container.querySelector('#memory-usage');
      const usage = Math.round((latest.used / latest.limit) * 100);
      const color = usage > 80 ? '#ff6b6b' : usage > 60 ? '#ffd93d' : '#6bcf7f';
      
      container.innerHTML = `
        <h4 style="margin: 5px 0;">Memory</h4>
        <div style="color: ${color};">${usage}% used</div>
        <div>${Math.round(latest.used / 1024 / 1024)}MB / ${Math.round(latest.limit / 1024 / 1024)}MB</div>
      `;
    }
  }

  updateErrorCount(errors) {
    const recent = errors.filter(e => Date.now() - e.timestamp < 60000);
    const container = this.container.querySelector('#error-count');
    const color = recent.length > 5 ? '#ff6b6b' : recent.length > 0 ? '#ffd93d' : '#6bcf7f';
    
    container.innerHTML = `
      <h4 style="margin: 5px 0;">Errors</h4>
      <div style="color: ${color};">${recent.length} in last minute</div>
      <div>${errors.length} total</div>
    `;
  }

  updateRecommendations(summary) {
    const container = this.container.querySelector('#recommendations');
    const recommendations = summary.recommendations.slice(0, 3);
    
    container.innerHTML = `
      <h4 style="margin: 5px 0;">Recommendations</h4>
      ${recommendations.length > 0 
        ? recommendations.map(rec => `<div style="font-size: 10px; margin: 2px 0;">• ${rec}</div>`).join('')
        : '<div style="color: #6bcf7f;">All good! 🎉</div>'
      }
    `;
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
  }
}

// Global instances
const performanceMonitor = new PerformanceMonitor({
  enableWebVitals: true,
  enableCustomMetrics: true,
  enableErrorTracking: true,
  enableResourceTracking: true,
  reportInterval: 15000 // Report every 15 seconds
});

let performanceDashboard = null;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  performanceDashboard = new PerformanceDashboard(performanceMonitor);
});

// Keyboard shortcut to toggle dashboard
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    if (performanceDashboard) {
      performanceDashboard.toggle();
    }
  }
});

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PerformanceMonitor,
    PerformanceDashboard,
    performanceMonitor,
    performanceDashboard
  };
} else if (typeof window !== 'undefined') {
  window.PerformanceSystem = {
    PerformanceMonitor,
    PerformanceDashboard,
    performanceMonitor,
    performanceDashboard
  };
}