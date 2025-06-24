// src/utils/consoleLogger.js

class ConsoleLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    // Intercept console methods
    ['log', 'warn', 'error', 'info'].forEach(method => {
      console[method] = (...args) => {
        // Call original method
        originalConsole[method].apply(console, args);
        
        // Store log entry with stack trace
        const entry = {
          type: method,
          timestamp: new Date().toISOString(),
          message: args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            } catch (e) {
              return String(arg);
            }
          }).join(' '),
          stack: new Error().stack,
          args: args
        };

        // Special handling for GoTrue warnings
        if (entry.message.includes('GoTrueClient')) {
          entry.isGoTrueWarning = true;
          entry.fullContext = this.captureContext();
        }

        this.logs.push(entry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
          this.logs.shift();
        }
      };
    });

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logs.push({
        type: 'uncaught-error',
        timestamp: new Date().toISOString(),
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
      });
    });

    // Capture promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logs.push({
        type: 'unhandled-rejection',
        timestamp: new Date().toISOString(),
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack
      });
    });
  }

  captureContext() {
    return {
      url: window.location.href,
      referrer: document.referrer,
      localStorage: this.getStorageSnapshot('localStorage'),
      sessionStorage: this.getStorageSnapshot('sessionStorage'),
      performanceTiming: performance.timing
    };
  }

  getStorageSnapshot(storageType) {
    const storage = window[storageType];
    const snapshot = {};
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        snapshot[key] = storage.getItem(key);
      }
    } catch (e) {
      snapshot.error = e.message;
    }
    return snapshot;
  }

  getLogs(filter = {}) {
    let filtered = this.logs;
    
    if (filter.type) {
      filtered = filtered.filter(log => log.type === filter.type);
    }
    
    if (filter.contains) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(filter.contains.toLowerCase())
      );
    }
    
    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime();
      filtered = filtered.filter(log => 
        new Date(log.timestamp).getTime() >= sinceTime
      );
    }
    
    return filtered;
  }

  downloadLogs() {
    const data = {
      exportTime: new Date().toISOString(),
      browserDetails: getBrowserDetails(),
      logs: this.logs,
      currentContext: this.captureContext()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getGoTrueWarnings() {
    return this.getLogs({ contains: 'GoTrueClient' });
  }
}

// Create singleton instance
export const consoleLogger = new ConsoleLogger();

// Helper function to get browser details (imported from previous file)
function getBrowserDetails() {
  const details = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    onLine: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
  };

  const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  if (chromeMatch) {
    details.chromeVersion = chromeMatch[1];
  }

  const os = navigator.userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
  if (os) {
    details.operatingSystem = os[1];
  }

  return details;
}